"""
Standalone automated unreservation script using direct database access.
This script can run independently without Django's full environment.
"""

import os
import sys
import logging
import psycopg2
from datetime import datetime, timedelta
from pathlib import Path
import json
from urllib.parse import urlparse

# Configuration
SCRIPT_DIR = Path(__file__).resolve().parent
LOG_FILE = SCRIPT_DIR / 'automated_unreservation_standalone.log'
LOCK_FILE = SCRIPT_DIR / 'automated_unreservation_standalone.lock'
CONFIG_FILE = SCRIPT_DIR / '.env'

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)


def load_config():
    """Load database configuration from .env file."""
    config = {}
    
    try:
        if CONFIG_FILE.exists():
            with open(CONFIG_FILE, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        key, value = line.split('=', 1)
                        config[key.strip()] = value.strip().strip('"\'')
        
        # Get database URL
        database_url = config.get('DATABASE_URL')
        if not database_url:
            raise ValueError("DATABASE_URL not found in .env file")
        
        # Parse database URL
        parsed = urlparse(database_url)
        
        return {
            'host': parsed.hostname,
            'port': parsed.port or 5432,
            'database': parsed.path[1:],  # Remove leading slash
            'user': parsed.username,
            'password': parsed.password,
        }
        
    except Exception as e:
        logger.error(f"Failed to load configuration: {e}")
        raise


def acquire_lock():
    """Acquire a file-based lock to prevent concurrent execution."""
    try:
        if LOCK_FILE.exists():
            # Check if the process is still running
            try:
                with open(LOCK_FILE, 'r') as f:
                    existing_pid = int(f.read().strip())
                
                # Try to check if process exists (Unix-like systems)
                try:
                    os.kill(existing_pid, 0)
                    logger.warning(f"Another instance is already running (PID: {existing_pid})")
                    return False
                except (ProcessLookupError, OSError):
                    # Process doesn't exist, remove stale lock
                    logger.info("Removing stale lock file")
                    LOCK_FILE.unlink()
            except (ValueError, FileNotFoundError):
                # Invalid lock file, remove it
                LOCK_FILE.unlink()
        
        # Create new lock
        current_pid = os.getpid()
        with open(LOCK_FILE, 'w') as f:
            f.write(str(current_pid))
        
        logger.info(f"Acquired lock (PID: {current_pid})")
        return True
        
    except Exception as e:
        logger.error(f"Failed to acquire lock: {e}")
        return False


def release_lock():
    """Release the file-based lock."""
    try:
        if LOCK_FILE.exists():
            LOCK_FILE.unlink()
        logger.info("Released lock")
    except Exception as e:
        logger.error(f"Failed to release lock: {e}")


def get_database_connection(config):
    """Get database connection."""
    try:
        conn = psycopg2.connect(
            host=config['host'],
            port=config['port'],
            database=config['database'],
            user=config['user'],
            password=config['password'],
            connect_timeout=30
        )
        return conn
    except Exception as e:
        logger.error(f"Failed to connect to database: {e}")
        raise


def find_expired_reservations(conn, max_age_minutes=15):
    """Find expired reservations for unpaid orders."""
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    ir.reservation_id,
                    ir.quantity,
                    ir.product_variant_id,
                    ir.drop_product_id,
                    ir.order_id,
                    o.order_number,
                    o.payment_status,
                    ir.expires_at
                FROM orders_inventoryreservation ir
                JOIN orders_order o ON ir.order_id = o.order_id
                WHERE ir.is_active = true 
                    AND ir.expires_at < NOW()
                    AND o.payment_status IN ('pending', 'failed', 'cancelled')
                ORDER BY ir.expires_at ASC
                LIMIT 1000
            """)
            
            columns = [desc[0] for desc in cursor.description]
            results = []
            for row in cursor.fetchall():
                results.append(dict(zip(columns, row)))
            
            return results
            
    except Exception as e:
        logger.error(f"Failed to find expired reservations: {e}")
        raise


def process_expired_reservations(conn, reservations, dry_run=False):
    """Process expired reservations."""
    if not reservations:
        logger.info("No expired reservations found")
        return {
            'processed': 0,
            'variants_updated': 0,
            'drop_products_updated': 0,
            'orders_cancelled': 0
        }
    
    logger.info(f"Processing {len(reservations)} expired reservations (dry_run={dry_run})")
    
    if dry_run:
        # Simulate processing
        variant_ids = set()
        drop_product_ids = set()
        order_ids = set()
        
        for reservation in reservations:
            logger.info(
                f"Would cancel reservation {reservation['reservation_id']} "
                f"(Order: {reservation['order_number']}, Qty: {reservation['quantity']})"
            )
            
            if reservation['product_variant_id']:
                variant_ids.add(reservation['product_variant_id'])
            if reservation['drop_product_id']:
                drop_product_ids.add(reservation['drop_product_id'])
            order_ids.add(reservation['order_id'])
        
        return {
            'processed': len(reservations),
            'variants_updated': len(variant_ids),
            'drop_products_updated': len(drop_product_ids),
            'orders_cancelled': len(order_ids)
        }
    
    try:
        with conn.cursor() as cursor:
            reservation_ids = [r['reservation_id'] for r in reservations]
            
            # Step 1: Update reserved quantities for product variants
            cursor.execute("""
                WITH expired_reservations AS (
                    SELECT 
                        ir.product_variant_id,
                        SUM(ir.quantity) as total_quantity
                    FROM orders_inventoryreservation ir
                    WHERE ir.reservation_id = ANY(%s)
                        AND ir.product_variant_id IS NOT NULL
                    GROUP BY ir.product_variant_id
                )
                UPDATE products_productvariant 
                SET reserved_quantity = GREATEST(0, reserved_quantity - er.total_quantity)
                FROM expired_reservations er
                WHERE products_productvariant.id = er.product_variant_id
            """, (reservation_ids,))
            variants_updated = cursor.rowcount
            
            # Step 2: Update reserved quantities for drop products
            cursor.execute("""
                WITH expired_reservations AS (
                    SELECT 
                        ir.drop_product_id,
                        SUM(ir.quantity) as total_quantity
                    FROM orders_inventoryreservation ir
                    WHERE ir.reservation_id = ANY(%s)
                        AND ir.drop_product_id IS NOT NULL
                    GROUP BY ir.drop_product_id
                )
                UPDATE drops_dropproduct 
                SET reserved_quantity = GREATEST(0, reserved_quantity - er.total_quantity)
                FROM expired_reservations er
                WHERE drops_dropproduct.id = er.drop_product_id
            """, (reservation_ids,))
            drop_products_updated = cursor.rowcount
            
            # Step 3: Deactivate reservations
            cursor.execute("""
                UPDATE orders_inventoryreservation 
                SET 
                    is_active = false,
                    cancelled_at = NOW()
                WHERE reservation_id = ANY(%s)
            """, (reservation_ids,))
            
            # Step 4: Cancel orders with no active reservations
            cursor.execute("""
                WITH orders_with_no_active_reservations AS (
                    SELECT DISTINCT o.order_id
                    FROM orders_order o
                    WHERE o.payment_status IN ('pending', 'failed')
                        AND o.created_at < NOW() - INTERVAL '%s minutes'
                        AND NOT EXISTS (
                            SELECT 1 
                            FROM orders_inventoryreservation ir 
                            WHERE ir.order_id = o.order_id 
                                AND ir.is_active = true
                        )
                )
                UPDATE orders_order
                SET 
                    order_status = 'cancelled',
                    payment_status = 'cancelled',
                    updated_at = NOW()
                FROM orders_with_no_active_reservations ownar
                WHERE orders_order.order_id = ownar.order_id
            """, (15,))  # 15 minutes default
            orders_cancelled = cursor.rowcount
            
            # Commit the transaction
            conn.commit()
            
            logger.info(f"Successfully processed {len(reservations)} reservations")
            logger.info(f"Updated {variants_updated} product variants")
            logger.info(f"Updated {drop_products_updated} drop products")
            logger.info(f"Cancelled {orders_cancelled} orders")
            
            return {
                'processed': len(reservations),
                'variants_updated': variants_updated,
                'drop_products_updated': drop_products_updated,
                'orders_cancelled': orders_cancelled
            }
            
    except Exception as e:
        logger.error(f"Failed to process expired reservations: {e}")
        conn.rollback()
        raise


def save_execution_stats(stats):
    """Save execution statistics for monitoring."""
    stats_file = SCRIPT_DIR / 'unreservation_stats.json'
    
    try:
        # Load existing stats
        if stats_file.exists():
            with open(stats_file, 'r') as f:
                all_stats = json.load(f)
        else:
            all_stats = []
        
        # Add new stats
        stats['timestamp'] = datetime.now().isoformat()
        all_stats.append(stats)
        
        # Keep only last 100 entries
        all_stats = all_stats[-100:]
        
        # Save back to file
        with open(stats_file, 'w') as f:
            json.dump(all_stats, f, indent=2)
            
    except Exception as e:
        logger.error(f"Failed to save execution stats: {e}")


def main():
    """Main execution function."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Standalone automated unreservation')
    parser.add_argument('--dry-run', action='store_true', help='Dry run mode')
    parser.add_argument('--max-age-minutes', type=int, default=15, help='Max age in minutes')
    parser.add_argument('--verbose', action='store_true', help='Verbose output')
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    execution_id = datetime.now().strftime('%Y%m%d_%H%M%S')
    logger.info(f"Starting automated unreservation (ID: {execution_id})")
    
    # Acquire lock
    if not acquire_lock():
        logger.error("Could not acquire lock. Another instance may be running.")
        return 1
    
    try:
        # Load configuration
        config = load_config()
        
        # Connect to database
        conn = get_database_connection(config)
        
        try:
            # Find expired reservations
            expired_reservations = find_expired_reservations(conn, args.max_age_minutes)
            
            # Process them
            stats = process_expired_reservations(conn, expired_reservations, args.dry_run)
            
            # Save stats
            save_execution_stats(stats)
            
            # Summary
            logger.info(f"Execution completed (ID: {execution_id})")
            logger.info(f"Results: {stats}")
            
            if args.dry_run:
                logger.info("DRY RUN MODE - No actual changes were made")
            
            return 0
            
        finally:
            conn.close()
            
    except Exception as e:
        logger.error(f"Execution failed: {e}")
        return 1
        
    finally:
        release_lock()


if __name__ == '__main__':
    sys.exit(main())
