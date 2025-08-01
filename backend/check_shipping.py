#!/usr/bin/env python
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from orders.models import ShippingMethod

print('Available shipping methods:')
for sm in ShippingMethod.objects.all():
    print(f'ID: {sm.id}, Name: {sm.name}, Active: {sm.is_active}, Cost: ${sm.cost}')

print('\nActive shipping methods only:')
for sm in ShippingMethod.objects.filter(is_active=True):
    print(f'ID: {sm.id}, Name: {sm.name}, Cost: ${sm.cost}')
