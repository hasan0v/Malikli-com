"""
Django Management Command: Session Maintenance

This command provides utilities for managing user sessions and monitoring session usage.

Usage:
    python manage.py session_maintenance --cleanup
    python manage.py session_maintenance --stats
    python manage.py session_maintenance --list-active
"""

from django.core.management.base import BaseCommand
from django.contrib.sessions.models import Session
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import datetime, timedelta
import json

User = get_user_model()

class Command(BaseCommand):
    help = 'Manage and monitor user sessions'

    def add_arguments(self, parser):
        parser.add_argument(
            '--cleanup',
            action='store_true',
            help='Remove expired sessions',
        )
        parser.add_argument(
            '--stats',
            action='store_true',
            help='Show session statistics',
        )
        parser.add_argument(
            '--list-active',
            action='store_true',
            help='List active sessions',
        )
        parser.add_argument(
            '--days',
            type=int,
            default=7,
            help='Number of days to look back for statistics (default: 7)',
        )

    def handle(self, *args, **options):
        """Main entry point for the management command."""
        
        if options['cleanup']:
            self.cleanup_sessions()
        elif options['stats']:
            self.show_session_stats(options['days'])
        elif options['list_active']:
            self.list_active_sessions()
        else:
            self.show_help()

    def cleanup_sessions(self):
        """Remove expired sessions from the database."""
        self.stdout.write('🧹 Cleaning up expired sessions...')
        
        expired_count = Session.objects.filter(expire_date__lt=timezone.now()).count()
        
        if expired_count > 0:
            Session.objects.filter(expire_date__lt=timezone.now()).delete()
            self.stdout.write(
                self.style.SUCCESS(f'✅ Removed {expired_count} expired sessions')
            )
        else:
            self.stdout.write('ℹ️  No expired sessions found')

    def show_session_stats(self, days):
        """Show session statistics."""
        self.stdout.write(f'📊 Session Statistics (Last {days} days)')
        self.stdout.write('=' * 50)
        
        now = timezone.now()
        cutoff_date = now - timedelta(days=days)
        
        # Total sessions
        total_sessions = Session.objects.count()
        recent_sessions = Session.objects.filter(expire_date__gte=cutoff_date).count()
        active_sessions = Session.objects.filter(expire_date__gt=now).count()
        expired_sessions = Session.objects.filter(expire_date__lt=now).count()
        
        self.stdout.write(f'Total sessions in database: {total_sessions}')
        self.stdout.write(f'Recent sessions (last {days} days): {recent_sessions}')
        self.stdout.write(f'Currently active sessions: {active_sessions}')
        self.stdout.write(f'Expired sessions: {expired_sessions}')
        
        # Session duration analysis
        self.stdout.write('\\n📈 Session Duration Analysis:')
        
        # Sessions expiring in different time frames
        in_1_hour = Session.objects.filter(
            expire_date__gt=now,
            expire_date__lt=now + timedelta(hours=1)
        ).count()
        
        in_24_hours = Session.objects.filter(
            expire_date__gt=now,
            expire_date__lt=now + timedelta(hours=24)
        ).count()
        
        in_72_hours = Session.objects.filter(
            expire_date__gt=now,
            expire_date__lt=now + timedelta(hours=72)
        ).count()
        
        self.stdout.write(f'Expiring in 1 hour: {in_1_hour}')
        self.stdout.write(f'Expiring in 24 hours: {in_24_hours}')
        self.stdout.write(f'Expiring in 72 hours: {in_72_hours}')

    def list_active_sessions(self):
        """List currently active sessions."""
        self.stdout.write('👥 Active Sessions')
        self.stdout.write('=' * 50)
        
        now = timezone.now()
        active_sessions = Session.objects.filter(expire_date__gt=now).order_by('-expire_date')
        
        if not active_sessions.exists():
            self.stdout.write('ℹ️  No active sessions found')
            return
        
        for session in active_sessions:
            try:
                # Decode session data to get user info
                session_data = session.get_decoded()
                user_id = session_data.get('_auth_user_id')
                
                if user_id:
                    try:
                        user = User.objects.get(pk=user_id)
                        username = user.username
                        email = user.email
                    except User.DoesNotExist:
                        username = 'Unknown'
                        email = 'Unknown'
                else:
                    username = 'Anonymous'
                    email = 'N/A'
                
                # Calculate time until expiry
                time_left = session.expire_date - now
                hours_left = time_left.total_seconds() / 3600
                
                self.stdout.write(
                    f'Session: {session.session_key[:8]}... | '
                    f'User: {username} ({email}) | '
                    f'Expires: {session.expire_date.strftime("%Y-%m-%d %H:%M")} | '
                    f'Time left: {hours_left:.1f}h'
                )
                
            except Exception as e:
                self.stdout.write(f'Error processing session {session.session_key}: {str(e)}')

    def show_help(self):
        """Show usage help."""
        self.stdout.write('🔧 Session Maintenance Tool')
        self.stdout.write('=' * 30)
        self.stdout.write('')
        self.stdout.write('Available commands:')
        self.stdout.write('  --cleanup      Remove expired sessions')
        self.stdout.write('  --stats        Show session statistics')
        self.stdout.write('  --list-active  List active sessions')
        self.stdout.write('')
        self.stdout.write('Examples:')
        self.stdout.write('  python manage.py session_maintenance --cleanup')
        self.stdout.write('  python manage.py session_maintenance --stats --days 14')
        self.stdout.write('  python manage.py session_maintenance --list-active')
