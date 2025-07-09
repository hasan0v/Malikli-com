"""
Django management command to check and update pending payment statuses
"""
import logging
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from orders.models import Order, Payment
from orders.paypro_service import PayProService

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
            '--dry-run',
            action='store_true',
            help='Show what would be updated without making changes'
        )

    def handle(self, *args, **options):
        max_age_hours = options['max_age_hours']
        dry_run = options['dry_run']
        
        # Calculate cutoff time
        cutoff_time = timezone.now() - timedelta(hours=max_age_hours)
        
        # Find pending orders with PayPro payments
        pending_orders = Order.objects.filter(
            payment_status='pending',
            created_at__gte=cutoff_time
        ).select_related()
        
        self.stdout.write(f"Found {pending_orders.count()} pending orders to check...")
        
        paypro_service = PayProService()
        updated_count = 0
        failed_count = 0
        
        for order in pending_orders:
            try:
                # Find PayPro payment record
                payment = Payment.objects.filter(
                    order=order,
                    payment_method_type__in=['paypro_hosted', 'paypro_card']
                ).first()
                
                if not payment or not payment.gateway_transaction_id:
                    continue
                
                token = payment.gateway_transaction_id
                self.stdout.write(f"Checking order {order.order_id} with token {token[:8]}...")
                
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
                    
                    self.stdout.write(f"  PayPro status: {payment_status}")
                    
                    # Update order based on PayPro status
                    if payment_status in ['completed', 'succeeded', 'success', 'paid', 'successful']:
                        if not dry_run:
                            # Update payment record
                            payment.status = 'succeeded'
                            payment.payment_details.update({
                                'completion_status': payment_status,
                                'completed_at': timezone.now().isoformat(),
                                'auto_updated_at': timezone.now().isoformat(),
                                'paypro_response': status_data
                            })
                            payment.save()
                            
                            # Update order status
                            order.payment_status = 'paid'
                            order.order_status = 'processing'
                            order.save()
                            
                            self.stdout.write(
                                self.style.SUCCESS(f"  ✅ Updated order {order.order_id} to paid")
                            )
                        else:
                            self.stdout.write(
                                self.style.SUCCESS(f"  ✅ Would update order {order.order_id} to paid")
                            )
                        updated_count += 1
                        
                    elif payment_status in ['failed', 'declined', 'error']:
                        if not dry_run:
                            # Update payment record
                            payment.status = 'failed'
                            payment.payment_details.update({
                                'failure_status': payment_status,
                                'failed_at': timezone.now().isoformat(),
                                'auto_updated_at': timezone.now().isoformat(),
                                'paypro_response': status_data
                            })
                            payment.save()
                            
                            # Update order status
                            order.payment_status = 'failed'
                            order.order_status = 'failed'
                            order.save()
                            
                            # Restore stock quantities
                            for item in order.items.all():
                                from products.models import DropProduct
                                from django.db import models
                                DropProduct.objects.filter(id=item.drop_product.id).update(
                                    current_stock_quantity=models.F('current_stock_quantity') + item.quantity
                                )
                            
                            self.stdout.write(
                                self.style.WARNING(f"  ❌ Updated order {order.order_id} to failed")
                            )
                        else:
                            self.stdout.write(
                                self.style.WARNING(f"  ❌ Would update order {order.order_id} to failed")
                            )
                        updated_count += 1
                        
                    elif payment_status in ['cancelled', 'canceled']:
                        if not dry_run:
                            # Update order status
                            order.payment_status = 'cancelled'
                            order.order_status = 'cancelled'
                            order.save()
                            
                            # Restore stock quantities
                            for item in order.items.all():
                                from products.models import DropProduct
                                from django.db import models
                                DropProduct.objects.filter(id=item.drop_product.id).update(
                                    current_stock_quantity=models.F('current_stock_quantity') + item.quantity
                                )
                            
                            self.stdout.write(
                                self.style.WARNING(f"  🚫 Updated order {order.order_id} to cancelled")
                            )
                        else:
                            self.stdout.write(
                                self.style.WARNING(f"  🚫 Would update order {order.order_id} to cancelled")
                            )
                        updated_count += 1
                        
                    else:
                        self.stdout.write(f"  ⏳ Order {order.order_id} still pending ({payment_status})")
                        
                else:
                    self.stdout.write(
                        self.style.ERROR(f"  ❌ Failed to check status for order {order.order_id}")
                    )
                    failed_count += 1
                    
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f"  ❌ Error processing order {order.order_id}: {e}")
                )
                failed_count += 1
        
        # Summary
        self.stdout.write("\n" + "="*50)
        if dry_run:
            self.stdout.write(self.style.SUCCESS(f"DRY RUN COMPLETE"))
            self.stdout.write(f"Would update: {updated_count} orders")
        else:
            self.stdout.write(self.style.SUCCESS(f"PAYMENT STATUS CHECK COMPLETE"))
            self.stdout.write(f"Updated: {updated_count} orders")
        
        self.stdout.write(f"Failed: {failed_count} orders")
        self.stdout.write(f"Total checked: {pending_orders.count()} orders")
