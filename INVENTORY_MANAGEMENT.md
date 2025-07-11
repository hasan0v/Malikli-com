# Inventory Management System

This document describes the comprehensive inventory management system implemented for proper stock control and order handling.

## Overview

The inventory management system provides:

- **Stock tracking** per product variant with reservation capabilities
- **Automatic reservation** of inventory for unpaid orders
- **15-minute timeout** for unpaid orders with automatic cleanup
- **Low stock alerts** and monitoring
- **Race condition prevention** using database locks
- **Admin dashboard** for inventory monitoring

## Key Features

### 1. Inventory Fields per Variant

Each `ProductVariant` and `DropProduct` now has:

- `stock_quantity`: Total available stock
- `reserved_quantity`: Stock held for unpaid orders  
- `low_stock_threshold`: Threshold for alerts
- `available_quantity` (calculated): `stock_quantity - reserved_quantity`

### 2. Order Flow

**Order Creation:**
1. Customer creates order → Stock is **reserved** (not reduced)
2. `InventoryReservation` records are created with 15-minute expiration
3. Stock shows as "reserved" but not yet fulfilled

**Payment Success:**
1. Payment confirmed → Reservations are **fulfilled**
2. Both `reserved_quantity` and `stock_quantity` are reduced
3. Actual inventory is reduced

**Payment Failure/Timeout:**
1. After 15 minutes or payment failure → Reservations are **cancelled**
2. `reserved_quantity` is released back to available stock
3. Order is marked as cancelled

### 3. Background Cleanup

Automatic cleanup handles:
- Expired inventory reservations
- Unpaid orders after timeout
- Payment status synchronization

## Database Models

### InventoryReservation

Tracks temporary stock reservations for unpaid orders:

```python
class InventoryReservation(models.Model):
    reservation_id = UUIDField(primary_key=True)
    order = ForeignKey(Order)
    product_variant = ForeignKey(ProductVariant, null=True)
    drop_product = ForeignKey(DropProduct, null=True) 
    quantity = PositiveIntegerField()
    expires_at = DateTimeField()
    is_active = BooleanField(default=True)
    fulfilled_at = DateTimeField(null=True)
    cancelled_at = DateTimeField(null=True)
```

### Updated ProductVariant

```python
class ProductVariant(models.Model):
    # ... existing fields ...
    stock_quantity = PositiveIntegerField(default=0)
    reserved_quantity = PositiveIntegerField(default=0) 
    low_stock_threshold = PositiveIntegerField(default=5)
    
    @property
    def available_quantity(self):
        return self.stock_quantity - self.reserved_quantity
    
    def can_reserve(self, quantity):
        return self.available_quantity >= quantity
    
    def reserve_stock(self, quantity):
        # Atomically reserve stock using database locks
    
    def fulfill_order(self, quantity):
        # Reduce both reserved and total stock
    
    def release_reservation(self, quantity):
        # Release reserved stock back to available
```

## Management Commands

### cleanup_expired_reservations

Cleans up expired reservations and cancels unpaid orders:

```bash
# Clean up reservations older than 15 minutes (default)
python manage.py cleanup_expired_reservations

# Custom timeout
python manage.py cleanup_expired_reservations --max-age-minutes 30

# Dry run to see what would be cleaned
python manage.py cleanup_expired_reservations --dry-run
```

### check_pending_payments

Checks payment statuses and handles inventory cleanup:

```bash
# Check payments from last 24 hours and clean reservations
python manage.py check_pending_payments --cleanup-reservations

# Check specific time range
python manage.py check_pending_payments --max-age-hours 12
```

## API Usage

### Order Creation

When creating orders, the system automatically:

1. Validates stock availability
2. Creates inventory reservations  
3. Returns error if insufficient stock

```python
from orders.inventory import InventoryManager

# Reserve inventory for order
success, failed_items = InventoryManager.reserve_order_items(order)
if not success:
    # Handle insufficient stock
    return error_response(failed_items)
```

### Payment Processing

When payment is confirmed:

```python
# Fulfill the order (convert reservations to actual stock reduction)
InventoryManager.fulfill_order(order)
```

When payment fails:

```python  
# Cancel reservations and release stock
InventoryManager.cancel_order_reservations(order)
```

## Admin Interface

### Inventory Dashboard

Navigate to `/admin/` and use the inventory management tools:

- **Reservations**: View active/expired reservations
- **Low Stock Alerts**: Monitor items below threshold
- **Order Management**: Bulk actions for fulfillment/cancellation

### Product Variant Admin

Enhanced with inventory information:
- Stock levels and availability
- Low stock warnings
- Bulk stock updates
- Reservation tracking

## Production Setup

### 1. Cron Jobs

Set up automatic cleanup using the provided script:

```bash
# Make script executable
chmod +x scripts/setup-cron-jobs.sh

# Run setup script  
./scripts/setup-cron-jobs.sh
```

This creates cron jobs for:
- Every 5 minutes: Clean expired reservations
- Every 15 minutes: Check pending payments
- Daily: Session cleanup and low stock reports

### 2. Monitoring

Monitor these log files for issues:
- `/var/log/malikli/inventory_cleanup.log`
- `/var/log/malikli/payment_check.log`
- `/var/log/malikli/low_stock_report.log`

### 3. Database Migrations

Apply the inventory management migrations:

```bash
python manage.py migrate products
python manage.py migrate drops  
python manage.py migrate orders
```

## Configuration

### Settings

Add to `settings.py`:

```python
# Inventory Management Settings
ORDER_RESERVATION_TIMEOUT_MINUTES = 15  # Reservation timeout
```

### Environment Variables

No additional environment variables required.

## Testing

### Manual Testing

1. **Create Order**: Verify stock is reserved, not reduced
2. **Wait 15+ minutes**: Verify automatic cleanup cancels order
3. **Pay Order**: Verify stock is actually reduced
4. **Cancel Order**: Verify stock is released

### Load Testing

The system uses database-level locks to prevent race conditions during high traffic.

## Troubleshooting

### Common Issues

**Stock shows as negative:**
- Run cleanup command to fix inconsistencies
- Check for failed migrations

**Reservations not expiring:**
- Verify cron jobs are running
- Check Django timezone settings

**Orders not cancelling:**
- Check payment status updates
- Verify webhook configurations

### Debug Commands

```bash
# Check inventory consistency
python manage.py shell
>>> from orders.inventory import InventoryManager
>>> InventoryManager.cleanup_expired_reservations()

# View active reservations
>>> from orders.models import InventoryReservation  
>>> InventoryReservation.objects.filter(is_active=True)
```

## Architecture Benefits

1. **No Overselling**: Stock is properly reserved during checkout
2. **Race Condition Safe**: Database locks prevent concurrent issues
3. **Automatic Cleanup**: No manual intervention needed
4. **Flexible Timeouts**: Configurable reservation periods
5. **Admin Visibility**: Full inventory tracking in admin
6. **Payment Integration**: Works with existing payment flows

## Migration Notes

Existing orders and products will work normally. New inventory fields default to 0, so you'll need to:

1. Set initial stock quantities for existing products
2. Configure low stock thresholds
3. Set up cron jobs for automatic cleanup

The system is backward compatible and won't break existing functionality.
