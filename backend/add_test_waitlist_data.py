#!/usr/bin/env python3
"""
Test Data Script for Waitlist Processor

This script adds sample waitlist subscribers for testing the processor.

Usage:
    python add_test_waitlist_data.py
"""

import os
import sys
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

try:
    import django
    django.setup()
except ImportError:
    print("Error: Django not found. Please ensure Django is installed.")
    sys.exit(1)

from users.models import WaitlistSubscriber

def add_test_subscribers():
    """Add test waitlist subscribers."""
    test_subscribers = [
        {
            'email': 'john.doe@example.com',
            'name': 'John Doe',
            # 'phone_number': '+1234567890',
            'source': 'waiting_page',
        },
        {
            'email': 'jane.smith@example.com',
            'name': 'Jane Smith',
            'source': 'waiting_page',
        },
        {
            'email': 'alex.johnson@example.com',
            'name': 'Alex Johnson',
            # 'phone_number': '+1987654321',
            'source': 'waiting_page',
        },
        {
            'email': 'test.user@malikli.com',
            'name': 'Test User',
            'source': 'waiting_page',
        },
        {
            'email': 'waitlist.test@gmail.com',
            'name': 'Waitlist Tester',
            'source': 'waiting_page',
        },
        {
            'email': 'ahesenov418@gmail.com',
            'name': 'Madonna',
            'source': 'waiting_page',
        },
        {
            'email': 'gulnar.hesenova123@gmail.com',
            'source': 'waiting_page',
        },
    ]
    
    created_count = 0
    existing_count = 0
    
    for subscriber_data in test_subscribers:
        subscriber, created = WaitlistSubscriber.objects.get_or_create(
            email=subscriber_data['email'],
            defaults=subscriber_data
        )
        
        if created:
            print(f'✓ Created subscriber: {subscriber.email}')
            created_count += 1
        else:
            print(f'- Subscriber already exists: {subscriber.email}')
            existing_count += 1
    
    print(f'\\nSummary: {created_count} created, {existing_count} already existed')
    print('Test data has been added. You can now run the waitlist processor to test it.')

if __name__ == '__main__':
    add_test_subscribers()
