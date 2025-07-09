"""
Django Management Command: Clean Expired Sessions

This command removes expired sessions from the database to keep it clean.
Should be run periodically via cron job in production.

Usage:
    python manage.py cleanup_sessions
"""

from django.core.management.base import BaseCommand
from django.contrib.sessions.models import Session
from django.utils import timezone

class Command(BaseCommand):
    help = 'Clean up expired sessions from the database'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting',
        )

    def handle(self, *args, **options):
        """Clean up expired sessions."""
        now = timezone.now()
        
        # Find expired sessions
        expired_sessions = Session.objects.filter(expire_date__lt=now)
        count = expired_sessions.count()
        
        if options['dry_run']:
            self.stdout.write(
                self.style.WARNING(f'DRY RUN: Would delete {count} expired sessions')
            )
        else:
            if count > 0:
                expired_sessions.delete()
                self.stdout.write(
                    self.style.SUCCESS(f'Successfully deleted {count} expired sessions')
                )
            else:
                self.stdout.write(
                    self.style.SUCCESS('No expired sessions found to delete')
                )
        
        # Show current session statistics
        active_sessions = Session.objects.filter(expire_date__gte=now).count()
        total_sessions = Session.objects.count()
        
        self.stdout.write(f'Current session statistics:')
        self.stdout.write(f'  Active sessions: {active_sessions}')
        self.stdout.write(f'  Total sessions: {total_sessions}')
        
        if not options['dry_run'] and count > 0:
            self.stdout.write(f'  Cleaned up: {count} expired sessions')
