"""
Django Management Command: Process Waitlist Subscribers

This command processes waitlist subscribers by creating user accounts for them
and sending welcome emails with login credentials.

Usage:
    python manage.py process_waitlist_subscribers
    python manage.py process_waitlist_subscribers --once (run once instead of continuous)

Features:
- Runs every 60 seconds by default
- Creates secure passwords for new users
- Sends beautifully formatted welcome emails
- Tracks processed subscribers to avoid duplicates
- Comprehensive logging and error handling
- Production-ready with safety checks
"""

import os
import sys
import time
import secrets
import string
import logging
from datetime import datetime, timezone
from typing import List, Optional, Union

from django.core.management.base import BaseCommand, CommandError
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.conf import settings
from django.db import transaction
from django.contrib.auth import get_user_model

from users.models import WaitlistSubscriber

# Configure logging
logger = logging.getLogger(__name__)

User = get_user_model()

class Command(BaseCommand):
    help = 'Process waitlist subscribers and create user accounts with welcome emails'

    def add_arguments(self, parser):
        parser.add_argument(
            '--once',
            action='store_true',
            help='Run once instead of continuously',
        )
        parser.add_argument(
            '--interval',
            type=int,
            default=60,
            help='Interval in seconds between checks (default: 60)',
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=10,
            help='Maximum number of subscribers to process per batch (default: 10)',
        )

    def handle(self, *args, **options):
        """Main entry point for the management command."""
        self.setup_logging()
        
        if options['once']:
            self.stdout.write(
                self.style.SUCCESS('Running waitlist processor once...')
            )
            self.process_waitlist_batch(options['batch_size'])
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f'Starting continuous waitlist processor (interval: {options["interval"]}s)...'
                )
            )
            self.run_continuous_processor(options['interval'], options['batch_size'])

    def setup_logging(self):
        """Configure logging for the command."""
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler('waitlist_processor.log'),
                logging.StreamHandler(sys.stdout)
            ]
        )

    def run_continuous_processor(self, interval: int, batch_size: int):
        """Run the processor continuously at specified intervals."""
        try:
            while True:
                try:
                    self.process_waitlist_batch(batch_size)
                    self.stdout.write(f'Waiting {interval} seconds before next check...')
                    time.sleep(interval)
                except KeyboardInterrupt:
                    self.stdout.write(
                        self.style.WARNING('\\nReceived interrupt signal. Shutting down gracefully...')
                    )
                    break
                except Exception as e:
                    logger.error(f'Error in continuous processor: {str(e)}')
                    self.stderr.write(
                        self.style.ERROR(f'Error occurred: {str(e)}. Continuing in {interval} seconds...')
                    )
                    time.sleep(interval)
        except Exception as e:
            logger.error(f'Fatal error in continuous processor: {str(e)}')
            raise CommandError(f'Fatal error: {str(e)}')

    def process_waitlist_batch(self, batch_size: int):
        """Process a batch of unprocessed waitlist subscribers."""
        # Get unprocessed subscribers
        unprocessed_subscribers = WaitlistSubscriber.objects.filter(
            is_processed=False
        )[:batch_size]

        if not unprocessed_subscribers.exists():
            self.stdout.write('No unprocessed waitlist subscribers found.')
            return

        processed_count = 0
        error_count = 0

        for subscriber in unprocessed_subscribers:
            try:
                if self.process_single_subscriber(subscriber):
                    processed_count += 1
                else:
                    error_count += 1
            except Exception as e:
                logger.error(f'Error processing subscriber {subscriber.email}: {str(e)}')
                error_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'Batch processing complete. Processed: {processed_count}, Errors: {error_count}'
            )
        )

    def process_single_subscriber(self, subscriber: WaitlistSubscriber) -> bool:
        """
        Process a single waitlist subscriber.
        
        Returns:
            bool: True if successfully processed, False otherwise
        """
        try:
            # Check if user already exists with this email
            if User.objects.filter(email=subscriber.email).exists():
                logger.info(f'User already exists for email: {subscriber.email}')
                self.mark_subscriber_processed(subscriber)
                return True

            # Generate secure password
            password = self.generate_secure_password()

            # Create user account
            user = self.create_user_account(subscriber, password)
            
            if user:
                # Send welcome email
                if self.send_welcome_email(subscriber, password):
                    self.mark_subscriber_processed(subscriber)
                    logger.info(f'Successfully processed subscriber: {subscriber.email}')
                    self.stdout.write(
                        self.style.SUCCESS(f'✓ Created account for: {subscriber.email}')
                    )
                    return True
                else:
                    # If email failed, delete the user account to maintain consistency
                    user.delete()
                    logger.error(f'Email failed for {subscriber.email}, user account deleted')
                    return False
            
            return False

        except Exception as e:
            logger.error(f'Error processing subscriber {subscriber.email}: {str(e)}')
            return False

    def create_user_account(self, subscriber: WaitlistSubscriber, password: str):
        """Create a new user account from waitlist subscriber data."""
        try:
            with transaction.atomic():
                # Generate unique username if needed
                base_username = subscriber.email.split('@')[0]
                username = self.generate_unique_username(base_username)                # Use the name field or extracted first/last names
                first_name = subscriber.first_name or ''
                last_name = subscriber.last_name or ''
                
                # If we have a name field but no extracted names, try to split it
                if subscriber.name and not first_name:
                    name_parts = subscriber.name.strip().split()
                    if name_parts:
                        first_name = name_parts[0]
                        if len(name_parts) > 1:
                            last_name = ' '.join(name_parts[1:])

                user = User.objects.create_user(
                    username=username,
                    email=subscriber.email,
                    password=password,
                    first_name=first_name,
                    last_name=last_name,
                    is_active=True,
                    is_verified=False  # They'll need to verify their email
                )

                # Set phone number if available
                if subscriber.phone_number:
                    user.phone_number = subscriber.phone_number
                    user.save()

                logger.info(f'Created user account for: {subscriber.email}')
                return user

        except Exception as e:
            logger.error(f'Error creating user account for {subscriber.email}: {str(e)}')
            return None

    def generate_unique_username(self, base_username: str) -> str:
        """Generate a unique username based on email prefix."""
        username = base_username
        counter = 1
        
        while User.objects.filter(username=username).exists():
            username = f"{base_username}{counter}"
            counter += 1
            
        return username

    def generate_secure_password(self, length: int = 12) -> str:
        """Generate a secure random password."""
        # Use a mix of letters, digits, and safe special characters
        characters = string.ascii_letters + string.digits + "!@#$%^&*"
        
        # Ensure password has at least one of each type
        password = [
            secrets.choice(string.ascii_lowercase),
            secrets.choice(string.ascii_uppercase),
            secrets.choice(string.digits),
            secrets.choice("!@#$%^&*")
        ]
        
        # Fill the rest randomly
        for _ in range(length - 4):
            password.append(secrets.choice(characters))
        
        # Shuffle the password list
        secrets.SystemRandom().shuffle(password)
        
        return ''.join(password)

    def send_welcome_email(self, subscriber: WaitlistSubscriber, password: str) -> bool:
        """Send a welcome email with login credentials."""
        try:
            frontend_url = getattr(settings, 'FRONTEND_URL', 'https://app.malikli1992.com')
            login_url = f"{frontend_url}/auth/login"
              # Prepare email context
            context = {
                'user_name': subscriber.get_display_name(),
                'email': subscriber.email,
                'password': password,
                'login_url': login_url,
                'site_name': 'Malikli1992',
                'year': datetime.now().year,
                'source': subscriber.get_source_display(),
            }

            # Render email templates
            html_message = render_to_string('emails/waitlist_welcome.html', context)
            plain_message = render_to_string('emails/waitlist_welcome.txt', context)

            # Send email
            success = send_mail(
                subject='Welcome to Malikli1992 - Your Account is Ready!',
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[subscriber.email],
                html_message=html_message,
                fail_silently=False,
            )

            if success:
                logger.info(f'Welcome email sent to: {subscriber.email}')
                return True
            else:
                logger.error(f'Failed to send welcome email to: {subscriber.email}')
                return False

        except Exception as e:
            logger.error(f'Error sending welcome email to {subscriber.email}: {str(e)}')
            return False

    def mark_subscriber_processed(self, subscriber: WaitlistSubscriber):
        """Mark a subscriber as processed."""
        try:
            subscriber.is_processed = True
            subscriber.processed_at = datetime.now(timezone.utc)
            subscriber.save()
            logger.info(f'Marked subscriber as processed: {subscriber.email}')
        except Exception as e:
            logger.error(f'Error marking subscriber as processed {subscriber.email}: {str(e)}')
