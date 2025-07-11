"""
Django management command to check and update pending payment statuses
with enhanced reservation cleanup and monitoring
"""
import logging
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from django.db import transaction
from django.db.models import F
from orders.models import Order, Payment
from orders.paypro_service import PayProService
from orders.inventory import InventoryManager
from carts.models import CartItem
from products.models import ProductVariant

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Check pending payments and update their status from PayPro'

    def add_arguments(self, parser):
        parser.add_argument(
            '--max-age-hours',
            type=int,
            default=24,
            help='Maximum age of pending payments to check (in hours)'
        )
        parser.add_argument(
            '--cleanup-reservations',
            action='store_true',
            help='Also clean up expired inventory reservations'
        )
        parser.add_argument(
            '--force-timeout',
            action='store_true',
            help='Force timeout orders older than specified age'
        )
        parser.add_argument(
            '--auto-timeout-hours',
            type=int,
            default=2,
            help='Automatically timeout orders older than this many hours'
        )
        parser.add_argument(
            '--check-orphaned-reservations',
            action='store_true',
            help='Check for orphaned reservations without valid orders'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be updated without making changes'
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Show detailed output for each operation'
        )

    def handle(self, *args, **options):
        max_age_hours = options['max_age_hours']
        dry_run = options['dry_run']
        cleanup_reservations = options['cleanup_reservations']
        force_timeout = options['force_timeout']
        auto_timeout_hours = options['auto_timeout_hours']
        check_orphaned = options['check_orphaned_reservations']
        verbose = options['verbose']
        
        self.stdout.write("🔍 Starting comprehensive payment and reservation monitoring...")
        
        # 1. Clean up expired reservations first if requested
        if cleanup_reservations:
            self.stdout.write("\n🧹 Phase 1: Cleaning up expired inventory reservations...")
            cleaned_count = InventoryManager.cleanup_expired_reservations()
            self.stdout.write(f"   Cleaned up {cleaned_count} expired reservations")
        
        # 2. Check for orphaned reservations
        if check_orphaned:
            self.stdout.write("\n🔍 Phase 2: Checking for orphaned reservations...")
            orphaned_count = self._check_orphaned_reservations(dry_run, verbose)
            self.stdout.write(f"   Found and processed {orphaned_count} orphaned reservations")
        
        # 3. Auto-timeout very old orders
        if force_timeout or auto_timeout_hours < max_age_hours:
            timeout_hours = auto_timeout_hours if not force_timeout else max_age_hours
            self.stdout.write(f"\n⏰ Phase 3: Auto-timing out orders older than {timeout_hours} hours...")
            timeout_count = self._timeout_old_orders(timeout_hours, dry_run, verbose)
            self.stdout.write(f"   Timed out {timeout_count} old orders")
        
        # 4. Check pending payments with PayPro
        self.stdout.write(f"\n💳 Phase 4: Checking pending payment statuses...")
        payment_results = self._check_pending_payments(max_age_hours, dry_run, verbose)
        
        # 5. Final cleanup pass
        if cleanup_reservations:
            self.stdout.write(f"\n🧹 Phase 5: Final cleanup pass...")
            final_cleaned = InventoryManager.cleanup_expired_reservations()
            self.stdout.write(f"   Final cleanup: {final_cleaned} reservations")
        
        # Summary
        self._print_summary(payment_results, dry_run)

    def _check_orphaned_reservations(self, dry_run, verbose):
        """Check for reservations that don't have valid orders"""
        orphaned_count = 0
        
        # Find cart items with reservations but no recent orders
        cutoff_time = timezone.now() - timedelta(hours=2)
        
        orphaned_items = CartItem.objects.filter(
            reserved_until__isnull=False,
            updated_at__lt=cutoff_time
        ).select_related('product_variant', 'cart')
        
        for item in orphaned_items:
            try:
                # Check if there's a recent order for this cart
                recent_order = Order.objects.filter(
                    user=item.cart.user,
                    created_at__gte=item.updated_at,
                    payment_status='pending'
                ).exists()
                
                if not recent_order:
                    if verbose:
                        self.stdout.write(f"  Found orphaned reservation: {item.product_variant.sku} x{item.reserved_quantity}")
                    
                    if not dry_run:
                        # Release the reservation
                        with transaction.atomic():
                            variant = item.product_variant
                            variant.reserved_quantity = max(0, variant.reserved_quantity - item.reserved_quantity)
                            variant.save(update_fields=['reserved_quantity'])
                            
                            item.reserved_quantity = 0
                            item.reserved_until = None
                            item.save(update_fields=['reserved_quantity', 'reserved_until'])
                    
                    orphaned_count += 1
                    
            except Exception as e:
                if verbose:
                    self.stdout.write(f"  Error processing cart item {item.id}: {e}")
        
        return orphaned_count

    def _timeout_old_orders(self, timeout_hours, dry_run, verbose):
        """Timeout orders that are too old"""
        timeout_count = 0
        cutoff_time = timezone.now() - timedelta(hours=timeout_hours)
        
        old_orders = Order.objects.filter(
            payment_status='pending',
            created_at__lt=cutoff_time
        ).select_related()
        
        for order in old_orders:
            if verbose:
                age_hours = (timezone.now() - order.created_at).total_seconds() / 3600
                self.stdout.write(f"  Timing out order {order.order_id} (age: {age_hours:.1f}h)")
            
            if not dry_run:
                with transaction.atomic():
                    # Update order status
                    order.payment_status = 'timeout'
                    order.order_status = 'cancelled'
                    order.save(update_fields=['payment_status', 'order_status'])
                    
                    # Cancel inventory reservations
                    InventoryManager.cancel_order_reservations(order)
                    
                    # Update any payment records
                    payments = Payment.objects.filter(order=order)
                    for payment in payments:
                        payment.status = 'timeout'
                        payment_details = payment.payment_details.copy() if payment.payment_details else {}
                        payment_details.update({
                            'auto_timeout_at': timezone.now().isoformat(),
                            'timeout_reason': f'Order exceeded {timeout_hours}h timeout'
                        })
                        payment.payment_details = payment_details
                        payment.save()
            
            timeout_count += 1
        
        return timeout_count

    def _check_pending_payments(self, max_age_hours, dry_run, verbose):
        """Check pending payments with PayPro service"""
        # Calculate cutoff time
        cutoff_time = timezone.now() - timedelta(hours=max_age_hours)
        
        # Find pending orders with PayPro payments
        pending_orders = Order.objects.filter(
            payment_status='pending',
            created_at__gte=cutoff_time
        ).select_related()
        
        self.stdout.write(f"Found {pending_orders.count()} pending orders to check...")
        
        paypro_service = PayProService()
        results = {
            'updated_count': 0,
            'failed_count': 0,
            'success_count': 0,
            'failure_count': 0,
            'cancelled_count': 0,
            'total_checked': pending_orders.count()
        }
        
        for order in pending_orders:
            try:
                # Find PayPro payment record
                payment = Payment.objects.filter(
                    order=order,
                    payment_method_type__in=['paypro_hosted', 'paypro_card']
                ).first()
                
                if not payment or not payment.gateway_transaction_id:
                    if verbose:
                        self.stdout.write(f"  Skipping order {order.order_id} - no PayPro payment found")
                    continue
                
                token = payment.gateway_transaction_id
                if verbose:
                    self.stdout.write(f"  Checking order {order.order_id} with token {token[:8]}...")
                
                # Check payment status with PayPro
                success, status_data = paypro_service.get_payment_status(token)
                
                if success:
                    # Parse PayPro response
                    checkout_data = status_data.get('checkout', {})
                    transaction_data = status_data.get('transaction', {})
                    
                    payment_status = (
                        transaction_data.get('status') or 
                        checkout_data.get('status') or 
                        'unknown'
                    )
                    
                    if verbose:
                        self.stdout.write(f"    PayPro status: {payment_status}")
                    
                    # Update order based on PayPro status
                    if payment_status in ['completed', 'succeeded', 'success', 'paid', 'successful']:
                        self._handle_successful_payment(order, payment, status_data, dry_run, verbose)
                        results['updated_count'] += 1
                        results['success_count'] += 1
                        
                    elif payment_status in ['failed', 'declined', 'error']:
                        self._handle_failed_payment(order, payment, status_data, dry_run, verbose)
                        results['updated_count'] += 1
                        results['failure_count'] += 1
                        
                    elif payment_status in ['cancelled', 'canceled']:
                        self._handle_cancelled_payment(order, payment, status_data, dry_run, verbose)
                        results['updated_count'] += 1
                        results['cancelled_count'] += 1
                        
                    else:
                        if verbose:
                            self.stdout.write(f"    ⏳ Order {order.order_id} still pending ({payment_status})")
                        
                else:
                    if verbose:
                        self.stdout.write(
                            self.style.ERROR(f"    ❌ Failed to check status for order {order.order_id}")
                        )
                    results['failed_count'] += 1
                    
            except Exception as e:
                if verbose:
                    self.stdout.write(
                        self.style.ERROR(f"    ❌ Error processing order {order.order_id}: {e}")
                    )
                results['failed_count'] += 1
        
        return results

    def _handle_successful_payment(self, order, payment, status_data, dry_run, verbose):
        """Handle successful payment update"""
        if not dry_run:
            with transaction.atomic():
                # Update payment record
                payment.status = 'succeeded'
                payment_details = payment.payment_details.copy() if payment.payment_details else {}
                payment_details.update({
                    'completion_status': status_data.get('transaction', {}).get('status', 'completed'),
                    'completed_at': timezone.now().isoformat(),
                    'auto_updated_at': timezone.now().isoformat(),
                    'paypro_response': status_data
                })
                payment.payment_details = payment_details
                payment.save()
                
                # Update order status
                order.payment_status = 'paid'
                order.order_status = 'processing'
                order.save(update_fields=['payment_status', 'order_status'])
                
                # Fulfill the order
                InventoryManager.fulfill_order(order)
                
        if verbose:
            status = "✅ Updated" if not dry_run else "✅ Would update"
            self.stdout.write(self.style.SUCCESS(f"    {status} order {order.order_id} to paid"))

    def _handle_failed_payment(self, order, payment, status_data, dry_run, verbose):
        """Handle failed payment update"""
        if not dry_run:
            with transaction.atomic():
                # Update payment record
                payment.status = 'failed'
                payment_details = payment.payment_details.copy() if payment.payment_details else {}
                payment_details.update({
                    'failure_status': status_data.get('transaction', {}).get('status', 'failed'),
                    'failed_at': timezone.now().isoformat(),
                    'auto_updated_at': timezone.now().isoformat(),
                    'paypro_response': status_data
                })
                payment.payment_details = payment_details
                payment.save()
                
                # Update order status
                order.payment_status = 'failed'
                order.order_status = 'failed'
                order.save(update_fields=['payment_status', 'order_status'])
                
                # Cancel inventory reservations
                InventoryManager.cancel_order_reservations(order)
                
        if verbose:
            status = "❌ Updated" if not dry_run else "❌ Would update"
            self.stdout.write(self.style.WARNING(f"    {status} order {order.order_id} to failed"))

    def _handle_cancelled_payment(self, order, payment, status_data, dry_run, verbose):
        """Handle cancelled payment update"""
        if not dry_run:
            with transaction.atomic():
                # Update payment record
                payment.status = 'cancelled'
                payment_details = payment.payment_details.copy() if payment.payment_details else {}
                payment_details.update({
                    'cancellation_status': status_data.get('transaction', {}).get('status', 'cancelled'),
                    'cancelled_at': timezone.now().isoformat(),
                    'auto_updated_at': timezone.now().isoformat(),
                    'paypro_response': status_data
                })
                payment.payment_details = payment_details
                payment.save()
                
                # Update order status
                order.payment_status = 'cancelled'
                order.order_status = 'cancelled'
                order.save(update_fields=['payment_status', 'order_status'])
                
                # Cancel inventory reservations
                InventoryManager.cancel_order_reservations(order)
                
        if verbose:
            status = "🚫 Updated" if not dry_run else "🚫 Would update"
            self.stdout.write(self.style.WARNING(f"    {status} order {order.order_id} to cancelled"))

    def _print_summary(self, results, dry_run):
        """Print operation summary"""
        self.stdout.write("\n" + "="*60)
        if dry_run:
            self.stdout.write(self.style.SUCCESS(f"🔍 DRY RUN COMPLETE - NO CHANGES MADE"))
        else:
            self.stdout.write(self.style.SUCCESS(f"💳 PAYMENT STATUS CHECK COMPLETE"))
        
        self.stdout.write("\n📊 Payment Status Results:")
        self.stdout.write(f"   ✅ Successful payments: {results['success_count']}")
        self.stdout.write(f"   ❌ Failed payments: {results['failure_count']}")
        self.stdout.write(f"   🚫 Cancelled payments: {results['cancelled_count']}")
        self.stdout.write(f"   📊 Total updated: {results['updated_count']}")
        self.stdout.write(f"   ⚠️  API failures: {results['failed_count']}")
        self.stdout.write(f"   🔍 Total checked: {results['total_checked']}")
        
        if results['updated_count'] > 0:
            success_rate = (results['updated_count'] / results['total_checked']) * 100
            self.stdout.write(f"\n📈 Update success rate: {success_rate:.1f}%")
        
        self.stdout.write("\n🎯 Recommendation: Run with --cleanup-reservations daily")
        self.stdout.write("🎯 Recommendation: Run with --check-orphaned-reservations weekly")
