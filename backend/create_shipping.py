#!/usr/bin/env python
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from orders.models import ShippingMethod

print('Available shipping methods:')
shipping_methods = ShippingMethod.objects.all()
print(f'Total count: {shipping_methods.count()}')

if shipping_methods.count() == 0:
    print('No shipping methods found! Creating a default EMS shipping method...')
    
    # Create default EMS shipping method
    ems_method = ShippingMethod.objects.create(
        name='EMS International Express Mail Service',
        description='Fast and reliable international shipping',
        cost=25.00,  # Default cost, will be calculated dynamically
        estimated_delivery_min_days=7,
        estimated_delivery_max_days=30,
        is_active=True
    )
    
    print(f'Created EMS shipping method with ID: {ems_method.id}')
    print(f'Name: {ems_method.name}')
    print(f'Cost: ${ems_method.cost}')
    print(f'Active: {ems_method.is_active}')
else:
    for sm in shipping_methods:
        print(f'ID: {sm.id}, Name: {sm.name}, Active: {sm.is_active}, Cost: ${sm.cost}')
