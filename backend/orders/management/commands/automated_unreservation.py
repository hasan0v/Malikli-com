"""
Enhanced automatic unreservation system for product variant quantities.
This command cleans up expired reservations for unpaid orders with a 15-minute timeout.
"""

import logging
import uuid
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction, connection
from django.utils import timezone
from datetime import timedelta
from orders.models import Order, InventoryReservation
from products.models import ProductVariant
from drops.models import DropProduct

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Automated unreservation of product variant quantities for unpaid orders with 15-minute timeout'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--max-age-minutes',
            type=int,
            default=15,
            help='Maximum age of reservations to keep (in minutes)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be cleaned up without making changes',
        )
        parser.add_argument(
            '--check-payments',
            action='store_true',
            help='Also check and update payment statuses before cleanup',
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=100,
            help='Number of reservations to process in each batch',
        )
        parser.add_argument(
            '--quiet',
            action='store_true',
            help='Minimal output mode',
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Detailed output mode',
        )

    def handle(self, *args, **options):
        self.verbosity = options.get('verbosity', 1)
        self.dry_run = options['dry_run']
        self.max_age_minutes = options['max_age_minutes']
        self.check_payments = options['check_payments']
        self.batch_size = options['batch_size']
        self.quiet = options['quiet']
        self.verbose = options['verbose']
        
        # Set up logging level
        if self.quiet:
            logger.setLevel(logging.WARNING)
        elif self.verbose:
            logger.setLevel(logging.DEBUG)
        else:
            logger.setLevel(logging.INFO)
        
        try:
            self.run_automated_unreservation()
        except Exception as e:
            logger.error(f"Error during automated unreservation: {str(e)}")
            if not self.quiet:
                self.stdout.write(
                    self.style.ERROR(f"Error during automated unreservation: {str(e)}")
                )
            raise CommandError(f"Automated unreservation failed: {str(e)}")

    def run_automated_unreservation(self):
        """Main execution method for automated unreservation."""
        execution_id = str(uuid.uuid4())[:8]
        start_time = timezone.now()
        
        if not self.quiet:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Starting automated unreservation (ID: {execution_id}) - "
                    f"Max age: {self.max_age_minutes} minutes"
                )
            )
        
        # Step 1: Check payment statuses if requested
        if self.check_payments:
            self._check_payment_statuses()
        
        # Step 2: Find expired reservations
        expired_reservations = self._find_expired_reservations()
        
        if not expired_reservations:
            if not self.quiet:
                self.stdout.write(
                    self.style.SUCCESS("No expired reservations found to clean up.")
                )
            return
        
        if not self.quiet:
            self.stdout.write(
                f"Found {len(expired_reservations)} expired reservations to process"
            )
        
        # Step 3: Process expired reservations in batches
        total_processed = 0
        total_variants_updated = 0
        total_drop_products_updated = 0
        total_orders_cancelled = 0
        
        for i in range(0, len(expired_reservations), self.batch_size):
            batch = expired_reservations[i:i + self.batch_size]
            
            if self.verbose:
                self.stdout.write(f"Processing batch {i//self.batch_size + 1} ({len(batch)} items)")
            
            batch_results = self._process_reservation_batch(batch)
            
            total_processed += batch_results['processed']
            total_variants_updated += batch_results['variants_updated']
            total_drop_products_updated += batch_results['drop_products_updated']
            total_orders_cancelled += batch_results['orders_cancelled']
        
        # Summary
        end_time = timezone.now()
        duration = (end_time - start_time).total_seconds()
        
        if not self.quiet:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Automated unreservation completed (ID: {execution_id}) in {duration:.2f}s\\n"
                    f"Results:"
                )
            )
            self.stdout.write(f"  - Reservations processed: {total_processed}")
            self.stdout.write(f"  - Product variants updated: {total_variants_updated}")
            self.stdout.write(f"  - Drop products updated: {total_drop_products_updated}")
            self.stdout.write(f"  - Orders cancelled: {total_orders_cancelled}")
            
            if self.dry_run:
                self.stdout.write(
                    self.style.WARNING("DRY RUN MODE - No actual changes were made")
                )

    def _check_payment_statuses(self):
        """Check and update payment statuses for pending orders."""
        if self.verbose:
            self.stdout.write("Checking payment statuses for pending orders...")
        
        # This would typically integrate with your payment gateway
        # For now, we'll just log that this step would happen
        logger.info("Payment status check would be performed here")

    def _find_expired_reservations(self):
        """Find all expired reservations for unpaid orders."""
        cutoff_time = timezone.now() - timedelta(minutes=self.max_age_minutes)
        
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    ir.reservation_id,
                    ir.quantity,
                    ir.product_variant_id,
                    ir.drop_product_id,
                    ir.order_id,
                    o.order_number,
                    o.payment_status,
                    o.order_status,
                    ir.expires_at,
                    ir.created_at
                FROM orders_inventoryreservation ir
                JOIN orders_order o ON ir.order_id = o.order_id
                WHERE ir.is_active = true 
                    AND ir.expires_at < %s
                    AND o.payment_status IN ('pending', 'failed', 'cancelled')
                ORDER BY ir.expires_at ASC
            """, [timezone.now()])
            
            columns = [col[0] for col in cursor.description]
            return [dict(zip(columns, row)) for row in cursor.fetchall()]

    def _process_reservation_batch(self, batch):
        """Process a batch of expired reservations."""
        if self.dry_run:
            return self._simulate_batch_processing(batch)
        
        try:
            with transaction.atomic():
                return self._execute_batch_processing(batch)
        except Exception as e:
            logger.error(f"Error processing batch: {str(e)}")
            raise

    def _simulate_batch_processing(self, batch):
        """Simulate batch processing for dry-run mode."""
        variant_ids = set()
        drop_product_ids = set()
        order_ids = set()
        
        for reservation in batch:
            if self.verbose:
                self.stdout.write(
                    f"Would cancel reservation {reservation['reservation_id']} "
                    f"(Order: {reservation['order_number']}, Qty: {reservation['quantity']})"
                )
            
            if reservation['product_variant_id']:
                variant_ids.add(reservation['product_variant_id'])
            if reservation['drop_product_id']:
                drop_product_ids.add(reservation['drop_product_id'])
            order_ids.add(reservation['order_id'])
        
        return {
            'processed': len(batch),
            'variants_updated': len(variant_ids),
            'drop_products_updated': len(drop_product_ids),
            'orders_cancelled': len(order_ids)
        }

    def _execute_batch_processing(self, batch):
        """Execute actual batch processing."""
        reservation_ids = [r['reservation_id'] for r in batch]
        
        # Step 1: Update reserved quantities for product variants
        variants_updated = 0
        with connection.cursor() as cursor:
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
            """, [reservation_ids])
            variants_updated = cursor.rowcount

        # Step 2: Update reserved quantities for drop products
        drop_products_updated = 0
        with connection.cursor() as cursor:
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
            """, [reservation_ids])
            drop_products_updated = cursor.rowcount

        # Step 3: Deactivate reservations
        with connection.cursor() as cursor:
            cursor.execute("""
                UPDATE orders_inventoryreservation 
                SET 
                    is_active = false,
                    cancelled_at = %s
                WHERE reservation_id = ANY(%s)
            """, [timezone.now(), reservation_ids])

        # Step 4: Cancel orders with no active reservations
        orders_cancelled = 0
        with connection.cursor() as cursor:
            cursor.execute("""
                WITH orders_with_no_active_reservations AS (
                    SELECT DISTINCT o.order_id
                    FROM orders_order o
                    WHERE o.payment_status IN ('pending', 'failed')
                        AND o.created_at < %s
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
                    updated_at = %s
                FROM orders_with_no_active_reservations ownar
                WHERE orders_order.order_id = ownar.order_id
            """, [timezone.now() - timedelta(minutes=self.max_age_minutes), timezone.now()])
            orders_cancelled = cursor.rowcount

        if self.verbose:
            for reservation in batch:
                self.stdout.write(
                    f"Cancelled reservation {reservation['reservation_id']} "
                    f"(Order: {reservation['order_number']}, Qty: {reservation['quantity']})"
                )

        return {
            'processed': len(batch),
            'variants_updated': variants_updated,
            'drop_products_updated': drop_products_updated,
            'orders_cancelled': orders_cancelled
        }
