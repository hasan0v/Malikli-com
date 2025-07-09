#!/usr/bin/env python3
"""
Standalone Waitlist Processor Script for Malikli Django App

This script can be run independently to process waitlist subscribers.
It sets up Django environment and processes subscribers automatically.

Usage:
    python waitlist_processor_standalone.py
    python waitlist_processor_standalone.py --once
    python waitlist_processor_standalone.py --interval 30

Features:
- Automatic Django environment setup
- Continuous processing with configurable intervals
- Comprehensive logging and error handling
- Email notifications with beautiful templates
- Security-focused password generation
- Production-ready with safeguards

Requirements:
- Django project with users app containing WaitlistSubscriber model
- Proper email configuration in Django settings
- Email templates in templates/emails/ directory
"""

import os
import sys
import time
import secrets
import string
import logging
import argparse
from datetime import datetime, timezone
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
    print("Error: Django not found. Please ensure Django is installed and DJANGO_SETTINGS_MODULE is correct.")
    sys.exit(1)
except Exception as e:
    print(f"Error setting up Django: {str(e)}")
    sys.exit(1)

# Now import Django modules
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from django.db import transaction
from django.contrib.auth import get_user_model

try:
    from users.models import WaitlistSubscriber
except ImportError:
    print("Error: Could not import WaitlistSubscriber model. Please ensure the users app is properly configured.")
    sys.exit(1)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('waitlist_processor.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

User = get_user_model()

class WaitlistProcessor:
    """Main class for processing waitlist subscribers."""
    
    def __init__(self):
        self.processed_count = 0
        self.error_count = 0
        
    def generate_secure_password(self, length: int = 12) -> str:
        """Generate a secure random password."""
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
    
    def generate_unique_username(self, base_username: str) -> str:
        """Generate a unique username based on email prefix."""
        username = base_username
        counter = 1
        
        while User.objects.filter(username=username).exists():
            username = f"{base_username}{counter}"
            counter += 1
            
        return username
    
    def create_user_account(self, subscriber: WaitlistSubscriber, password: str):
        """Create a new user account from waitlist subscriber data."""
        try:
            with transaction.atomic():
                # Generate unique username
                base_username = subscriber.email.split('@')[0]
                username = self.generate_unique_username(base_username)

                # Use the name field or extracted first/last names
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
                    is_verified=False
                )

                # Set phone number if available
                if subscriber.phone_number:
                    user.phone_number = subscriber.phone_number
                    user.save()

                logger.info(f'Created user account for: {subscriber.email} (source: {subscriber.get_source_display()})')
                return user

        except Exception as e:
            logger.error(f'Error creating user account for {subscriber.email}: {str(e)}')
            return None
    
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
            try:
                html_message = render_to_string('emails/waitlist_welcome.html', context)
                plain_message = render_to_string('emails/waitlist_welcome.txt', context)
            except Exception as template_error:
                logger.error(f'Error rendering email templates: {str(template_error)}')
                # Fallback to simple text email
                plain_message = f"""
Welcome to Malikli, {context['user_name']}!

Your account is ready! Here are your login credentials:

Email: {context['email']}
Password: {context['password']}

Login at: {context['login_url']}

Please change your password after logging in for security.

Best regards,
The Malikli Team
                """.strip()
                html_message = None

            # Send email
            success = send_mail(
                subject='Welcome to Malikli - Your Account is Ready!',
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
    
    def process_single_subscriber(self, subscriber: WaitlistSubscriber) -> bool:
        """Process a single waitlist subscriber."""
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
                    print(f'✓ Created account for: {subscriber.email}')
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
    
    def process_waitlist_batch(self, batch_size: int = 10):
        """Process a batch of unprocessed waitlist subscribers."""
        # Get unprocessed subscribers
        unprocessed_subscribers = WaitlistSubscriber.objects.filter(
            is_processed=False
        )[:batch_size]

        if not unprocessed_subscribers.exists():
            print('No unprocessed waitlist subscribers found.')
            return

        batch_processed = 0
        batch_errors = 0

        for subscriber in unprocessed_subscribers:
            if self.process_single_subscriber(subscriber):
                batch_processed += 1
                self.processed_count += 1
            else:
                batch_errors += 1
                self.error_count += 1

        print(f'Batch complete. Processed: {batch_processed}, Errors: {batch_errors}')
        logger.info(f'Batch processing complete. Processed: {batch_processed}, Errors: {batch_errors}')
    
    def run_continuous(self, interval: int = 60, batch_size: int = 10):
        """Run the processor continuously."""
        print(f'Starting continuous waitlist processor (interval: {interval}s)...')
        logger.info(f'Starting continuous processor with {interval}s interval')
        
        try:
            while True:
                try:
                    print(f'\\n[{datetime.now().strftime("%Y-%m-%d %H:%M:%S")}] Checking for new subscribers...')
                    self.process_waitlist_batch(batch_size)
                    print(f'Waiting {interval} seconds before next check...')
                    time.sleep(interval)
                except KeyboardInterrupt:
                    print('\\nReceived interrupt signal. Shutting down gracefully...')
                    break
                except Exception as e:
                    logger.error(f'Error in continuous processor: {str(e)}')
                    print(f'Error occurred: {str(e)}. Continuing in {interval} seconds...')
                    time.sleep(interval)
        except Exception as e:
            logger.error(f'Fatal error in continuous processor: {str(e)}')
            print(f'Fatal error: {str(e)}')
            sys.exit(1)
        
        print(f'\\nShutdown complete. Total processed: {self.processed_count}, Total errors: {self.error_count}')
        logger.info(f'Processor shutdown. Total processed: {self.processed_count}, Total errors: {self.error_count}')
    
    def run_once(self, batch_size: int = 10):
        """Run the processor once."""
        print('Running waitlist processor once...')
        logger.info('Running single batch processing')
        
        self.process_waitlist_batch(batch_size)
        
        print(f'\\nSingle run complete. Processed: {self.processed_count}, Errors: {self.error_count}')
        logger.info(f'Single run complete. Processed: {self.processed_count}, Errors: {self.error_count}')

def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description='Process waitlist subscribers and create user accounts')
    parser.add_argument('--once', action='store_true', help='Run once instead of continuously')
    parser.add_argument('--interval', type=int, default=60, help='Interval in seconds between checks (default: 60)')
    parser.add_argument('--batch-size', type=int, default=10, help='Maximum subscribers to process per batch (default: 10)')
    
    args = parser.parse_args()
    
    # Validate settings
    required_settings = ['DEFAULT_FROM_EMAIL', 'EMAIL_HOST', 'EMAIL_HOST_USER']
    missing_settings = [setting for setting in required_settings if not hasattr(settings, setting)]
    
    if missing_settings:
        print(f"Error: Missing required email settings: {', '.join(missing_settings)}")
        print("Please configure email settings in your Django settings file.")
        sys.exit(1)
    
    # Check if WaitlistSubscriber model exists
    try:
        WaitlistSubscriber.objects.exists()
    except Exception as e:
        print(f"Error: Cannot access WaitlistSubscriber model: {str(e)}")
        print("Please ensure the WaitlistSubscriber model exists and migrations are applied.")
        sys.exit(1)
    
    processor = WaitlistProcessor()
    
    try:
        if args.once:
            processor.run_once(args.batch_size)
        else:
            processor.run_continuous(args.interval, args.batch_size)
    except KeyboardInterrupt:
        print('\\nExiting...')
    except Exception as e:
        logger.error(f'Unexpected error: {str(e)}')
        print(f'Unexpected error: {str(e)}')
        sys.exit(1)

if __name__ == '__main__':
    main()
