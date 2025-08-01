"""
Background task scheduler for automatic unreservation system.
This provides a lightweight alternative to Celery for running automated cleanup tasks.
"""

import os
import sys
import time
import logging
import signal
import threading
from datetime import datetime, timedelta
from pathlib import Path
import django
from django.conf import settings
from django.core.management import call_command

# Add the project root to Python path
project_root = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(project_root))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

logger = logging.getLogger(__name__)


class AutomatedUnreservationScheduler:
    """
    Lightweight scheduler for running automated unreservation tasks.
    Safe for concurrent processes with file-based locking.
    """
    
    def __init__(self, interval_minutes=5, max_age_minutes=15):
        self.interval_minutes = interval_minutes
        self.max_age_minutes = max_age_minutes
        self.running = False
        self.lock_file = Path(settings.BASE_DIR) / 'unreservation_scheduler.lock'
        self.pid_file = Path(settings.BASE_DIR) / 'unreservation_scheduler.pid'
        
        # Setup signal handlers for graceful shutdown
        signal.signal(signal.SIGTERM, self._signal_handler)
        signal.signal(signal.SIGINT, self._signal_handler)
        
        # Configure logging
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(Path(settings.BASE_DIR) / 'unreservation_scheduler.log'),
                logging.StreamHandler()
            ]
        )

    def _signal_handler(self, signum, frame):
        """Handle shutdown signals gracefully."""
        logger.info(f"Received signal {signum}, shutting down gracefully...")
        self.stop()

    def _acquire_lock(self):
        """Acquire a file-based lock to prevent concurrent execution."""
        try:
            if self.lock_file.exists():
                # Check if the process is still running
                try:
                    with open(self.lock_file, 'r') as f:
                        existing_pid = int(f.read().strip())
                    
                    # Check if process is still running
                    try:
                        os.kill(existing_pid, 0)  # Signal 0 just checks if process exists
                        logger.warning(f"Another instance is already running (PID: {existing_pid})")
                        return False
                    except ProcessLookupError:
                        # Process doesn't exist, remove stale lock
                        logger.info("Removing stale lock file")
                        self.lock_file.unlink()
                        if self.pid_file.exists():
                            self.pid_file.unlink()
                except (ValueError, FileNotFoundError):
                    # Invalid lock file, remove it
                    self.lock_file.unlink()
                    if self.pid_file.exists():
                        self.pid_file.unlink()
            
            # Create new lock
            current_pid = os.getpid()
            with open(self.lock_file, 'w') as f:
                f.write(str(current_pid))
            with open(self.pid_file, 'w') as f:
                f.write(str(current_pid))
            
            logger.info(f"Acquired lock (PID: {current_pid})")
            return True
            
        except Exception as e:
            logger.error(f"Failed to acquire lock: {e}")
            return False

    def _release_lock(self):
        """Release the file-based lock."""
        try:
            if self.lock_file.exists():
                self.lock_file.unlink()
            if self.pid_file.exists():
                self.pid_file.unlink()
            logger.info("Released lock")
        except Exception as e:
            logger.error(f"Failed to release lock: {e}")

    def _run_cleanup_task(self):
        """Execute the automated unreservation task."""
        try:
            logger.info("Starting automated unreservation task...")
            
            # Call the Django management command
            call_command(
                'automated_unreservation',
                max_age_minutes=self.max_age_minutes,
                check_payments=True,
                verbosity=1,
                quiet=False
            )
            
            logger.info("Automated unreservation task completed successfully")
            
        except Exception as e:
            logger.error(f"Error during automated unreservation task: {e}")

    def start(self):
        """Start the scheduler."""
        if not self._acquire_lock():
            logger.error("Could not acquire lock. Another instance may be running.")
            return False
        
        try:
            self.running = True
            logger.info(f"Starting automated unreservation scheduler (interval: {self.interval_minutes} minutes)")
            
            while self.running:
                try:
                    # Run cleanup task
                    self._run_cleanup_task()
                    
                    # Wait for next interval
                    if self.running:
                        logger.debug(f"Sleeping for {self.interval_minutes} minutes...")
                        time.sleep(self.interval_minutes * 60)
                        
                except Exception as e:
                    logger.error(f"Error in scheduler loop: {e}")
                    if self.running:
                        time.sleep(60)  # Wait 1 minute before retrying
            
        except KeyboardInterrupt:
            logger.info("Received keyboard interrupt, shutting down...")
        finally:
            self._release_lock()
            logger.info("Scheduler stopped")
        
        return True

    def stop(self):
        """Stop the scheduler."""
        self.running = False

    def is_running(self):
        """Check if scheduler is currently running."""
        if not self.lock_file.exists():
            return False
        
        try:
            with open(self.lock_file, 'r') as f:
                pid = int(f.read().strip())
            
            # Check if process is still running
            try:
                os.kill(pid, 0)
                return True
            except ProcessLookupError:
                return False
                
        except (ValueError, FileNotFoundError):
            return False


def main():
    """Main entry point for the scheduler."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Automated unreservation scheduler')
    parser.add_argument(
        '--interval',
        type=int,
        default=5,
        help='Interval between cleanup runs in minutes (default: 5)'
    )
    parser.add_argument(
        '--max-age',
        type=int,
        default=15,
        help='Maximum age of reservations to keep in minutes (default: 15)'
    )
    parser.add_argument(
        '--status',
        action='store_true',
        help='Check if scheduler is running'
    )
    parser.add_argument(
        '--stop',
        action='store_true',
        help='Stop running scheduler'
    )
    
    args = parser.parse_args()
    
    scheduler = AutomatedUnreservationScheduler(
        interval_minutes=args.interval,
        max_age_minutes=args.max_age
    )
    
    if args.status:
        if scheduler.is_running():
            print("Scheduler is running")
            sys.exit(0)
        else:
            print("Scheduler is not running")
            sys.exit(1)
    
    if args.stop:
        if scheduler.lock_file.exists():
            try:
                with open(scheduler.lock_file, 'r') as f:
                    pid = int(f.read().strip())
                os.kill(pid, signal.SIGTERM)
                print(f"Sent stop signal to scheduler (PID: {pid})")
            except (ValueError, FileNotFoundError, ProcessLookupError) as e:
                print(f"Could not stop scheduler: {e}")
                sys.exit(1)
        else:
            print("Scheduler is not running")
            sys.exit(1)
    else:
        # Start the scheduler
        success = scheduler.start()
        sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
