"""
Django mana    def add_arguments(self, parser):
        parser.add_argument(
            '--max-age-minutes',
            type=int,
            default=15,
            help='Maximum age of reservations to keep (in minutes)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be cleaned without making changes'
        )
        parser.add_argument(
            '--check-payments',
            action='store_true',
            help='Also check and update payment statuses'
        )
        parser.add_argument(
            '--quiet',
            action='store_true',
            help='Minimal output mode'
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Detailed output mode'
        ) clean up expired inventory reservations
"""
import logging
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction
from datetime import timedelta
from orders.inventory import InventoryManager
from orders.models import Order, InventoryReservation

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Clean up expired inventory reservations and cancel unpaid orders'

    def add_arguments(self, parser):
        parser.add_argument(
            '--max-age-minutes',
            type=int,
            default=15,
            help='Maximum age of reservations to keep (in minutes)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be cleaned up without making changes'
        )
        parser.add_argument(
            '--check-payments',
            action='store_true',
            help='Also check and update payment statuses before cleanup'
        )
        parser.add_argument(
            '--quiet',
            action='store_true',
            help='Minimal output mode'
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Detailed output mode'
        )

    def handle(self, *args, **options):
        max_age_minutes = options['max_age_minutes']
        dry_run = options['dry_run']
        check_payments = options['check_payments']
        quiet = options['quiet']
        verbose = options['verbose']
        
        # Set output level
        if quiet:
            self.verbosity = 0
        elif verbose:
            self.verbosity = 2
        else:
            self.verbosity = 1
        
        if self.verbosity > 0:
            self.stdout.write(f"Cleaning up reservations older than {max_age_minutes} minutes...")
        
        if dry_run and self.verbosity > 0:
            self.stdout.write(self.style.WARNING("DRY RUN MODE - No changes will be made"))
        
        # Step 1: Check payment statuses if requested
        if check_payments:
            self._check_and_update_payment_statuses(dry_run)
        
        # Step 2: Find expired reservations
        cutoff_time = timezone.now()
        expired_reservations = InventoryReservation.objects.filter(
            is_active=True,
            expires_at__lt=cutoff_time
        ).select_related('order').order_by('created_at')
        
        if self.verbosity > 0:
            self.stdout.write(f"Found {expired_reservations.count()} expired reservations")
        
        # Step 3: Process expired reservations and orders
        self._process_expired_reservations(expired_reservations, dry_run)
        
        # Step 4: Additional cleanup using InventoryManager
        if not dry_run:
            try:
                additional_cleaned = InventoryManager.cleanup_expired_reservations()
                if additional_cleaned > 0 and self.verbosity > 0:
                    self.stdout.write(f"Additional cleanup: {additional_cleaned} expired reservations")
            except AttributeError:
                # InventoryManager might not have this method
                pass
        
        # Step 5: Show summary
        if self.verbosity > 0:
            if dry_run:
                self.stdout.write(self.style.SUCCESS("Dry run completed - no changes were made"))
            else:
                self.stdout.write(self.style.SUCCESS("Cleanup completed successfully"))

    def _check_and_update_payment_statuses(self, dry_run):
        """Check and update payment statuses for pending orders"""
        self.stdout.write("\n=== Checking Payment Statuses ===")
        
        # Find orders that are old enough to be checked (older than 5 minutes)
        check_cutoff = timezone.now() - timedelta(minutes=5)
        pending_orders = Order.objects.filter(
            payment_status='pending',
            order_status='pending_payment',
            created_at__lt=check_cutoff
        ).select_related('user')
        
        for order in pending_orders:
            self.stdout.write(f"Checking payment status for order {order.order_number}")
            
            if not dry_run:
                # Here you would integrate with your payment provider to check status
                # For now, we'll just log that we would check
                self.stdout.write(f"  → Would check payment provider for order {order.order_number}")
                
                # Example of what payment checking might look like:
                # payment_status = check_payment_provider_status(order)
                # if payment_status == 'paid':
                #     order.payment_status = 'paid'
                #     order.order_status = 'processing'
                #     order.save()
                #     # Fulfill reservations
                #     for reservation in order.reservations.filter(is_active=True):
                #         reservation.fulfill()

    def _process_expired_reservations(self, expired_reservations, dry_run):
        """Process expired reservations and handle order cancellation"""
        expired_orders = set()
        cancelled_reservations = 0
        
        self.stdout.write("\n=== Processing Expired Reservations ===")
        
        for reservation in expired_reservations:
            order = reservation.order
            time_expired = timezone.now() - reservation.expires_at
            
            self.stdout.write(
                f"{'Would cancel' if dry_run else 'Cancelling'} reservation: "
                f"{reservation.quantity}x {reservation} "
                f"(expired {time_expired} ago, Order: {order.order_number})"
            )
            
            if not dry_run:
                with transaction.atomic():
                    success = reservation.cancel()
                    if success:
                        cancelled_reservations += 1
                        logger.info(f"Cancelled expired reservation {reservation.id} for order {order.order_number}")
            else:
                cancelled_reservations += 1
            
            # Track orders with expired reservations
            expired_orders.add(order)
        
        # Handle order cancellation for orders with all reservations expired
        self._handle_expired_orders(expired_orders, dry_run)
        
        # Summary for reservations
        self.stdout.write(f"\n{'Would cancel' if dry_run else 'Cancelled'}: {cancelled_reservations} reservations")

    def _handle_expired_orders(self, expired_orders, dry_run):
        """Handle orders that have all their reservations expired"""
        cancelled_orders = 0
        
        self.stdout.write("\n=== Processing Orders with Expired Reservations ===")
        
        for order in expired_orders:
            # Check if order should be cancelled
            should_cancel = self._should_cancel_order(order)
            
            if should_cancel:
                self.stdout.write(
                    f"{'Would cancel' if dry_run else 'Cancelling'} order: "
                    f"{order.order_number} (payment status: {order.payment_status}, "
                    f"order status: {order.order_status})"
                )
                
                if not dry_run:
                    with transaction.atomic():
                        # Update order status
                        order.order_status = 'cancelled'
                        if order.payment_status == 'pending':
                            order.payment_status = 'cancelled'
                        order.save()
                        
                        # Cancel any remaining active reservations
                        remaining_reservations = order.reservations.filter(is_active=True)
                        for reservation in remaining_reservations:
                            reservation.cancel()
                        
                        logger.info(f"Cancelled order {order.order_number} due to expired reservations")
                
                cancelled_orders += 1
            else:
                self.stdout.write(
                    f"Keeping order {order.order_number} (status: {order.order_status}, "
                    f"payment: {order.payment_status})"
                )
        
        self.stdout.write(f"{'Would cancel' if dry_run else 'Cancelled'}: {cancelled_orders} orders")

    def _should_cancel_order(self, order):
        """Determine if an order should be cancelled"""
        # Don't cancel if already paid or processing
        if order.payment_status in ['paid', 'processing']:
            return False
        
        # Don't cancel if order is already cancelled or completed
        if order.order_status in ['cancelled', 'completed', 'shipped', 'delivered']:
            return False
        
        # Cancel if payment is pending and no active reservations remain
        if order.payment_status == 'pending' and order.order_status == 'pending_payment':
            active_reservations = order.reservations.filter(is_active=True).count()
            return active_reservations == 0
        
        # Cancel if payment failed
        if order.payment_status == 'failed':
            return True
        
        return False

    def _show_low_stock_alerts(self):
        """Show low stock alerts"""
        self.stdout.write("\n=== Low Stock Alerts ===")
        
        low_stock = InventoryManager.get_low_stock_items()
        low_stock_count = low_stock['variants'].count() + low_stock['drop_products'].count()
        
        if low_stock_count > 0:
            self.stdout.write(f"⚠️  {low_stock_count} items are below low stock threshold:")
            
            for variant in low_stock['variants'][:5]:  # Show first 5
                self.stdout.write(
                    f"  • {variant} - {variant.available_quantity} available "
                    f"(threshold: {variant.low_stock_threshold})"
                )
            
            for drop_product in low_stock['drop_products'][:5]:  # Show first 5
                self.stdout.write(
                    f"  • {drop_product} - {drop_product.available_quantity} available "
                    f"(threshold: {drop_product.low_stock_threshold})"
                )
            
            if low_stock_count > 10:
                self.stdout.write(f"  ... and {low_stock_count - 10} more items")
        else:
            self.stdout.write("✅ All items have adequate stock levels")
