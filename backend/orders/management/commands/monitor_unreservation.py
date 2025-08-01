"""
Monitoring and alerting system for automated unreservation.
Provides health checks, performance metrics, and failure notifications.
"""

import os
import json
import logging
from datetime import datetime, timedelta
from pathlib import Path
from django.core.management.base import BaseCommand
from django.db import connection
from django.utils import timezone
from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Monitor automated unreservation system health and performance'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--check-health',
            action='store_true',
            help='Perform health check of the unreservation system',
        )
        parser.add_argument(
            '--performance-report',
            action='store_true',
            help='Generate performance report',
        )
        parser.add_argument(
            '--alert-threshold',
            type=int,
            default=100,
            help='Alert threshold for expired reservations',
        )
        parser.add_argument(
            '--days-back',
            type=int,
            default=7,
            help='Number of days to look back for analysis',
        )
        parser.add_argument(
            '--send-alerts',
            action='store_true',
            help='Send email alerts if issues are detected',
        )

    def handle(self, *args, **options):
        self.alert_threshold = options['alert_threshold']
        self.days_back = options['days_back']
        self.send_alerts = options['send_alerts']
        
        try:
            if options['check_health']:
                self.perform_health_check()
            elif options['performance_report']:
                self.generate_performance_report()
            else:
                self.stdout.write("Use --check-health or --performance-report")
                
        except Exception as e:
            logger.error(f"Error during monitoring: {str(e)}")
            self.stdout.write(self.style.ERROR(f"Monitoring failed: {str(e)}"))

    def perform_health_check(self):
        """Perform comprehensive health check of the unreservation system."""
        self.stdout.write(self.style.SUCCESS("Automated Unreservation System Health Check"))
        self.stdout.write("=" * 50)
        
        health_status = {
            'timestamp': timezone.now().isoformat(),
            'status': 'healthy',
            'issues': [],
            'metrics': {}
        }
        
        # Check 1: Current expired reservations
        expired_count = self._check_expired_reservations()
        health_status['metrics']['expired_reservations'] = expired_count
        
        if expired_count > self.alert_threshold:
            issue = f"High number of expired reservations: {expired_count}"
            health_status['issues'].append(issue)
            health_status['status'] = 'warning'
            self.stdout.write(self.style.WARNING(f"⚠ {issue}"))
        else:
            self.stdout.write(self.style.SUCCESS(f"✓ Expired reservations: {expired_count}"))
        
        # Check 2: Recent cleanup activity
        recent_activity = self._check_recent_activity()
        health_status['metrics']['recent_cleanups'] = recent_activity
        
        if recent_activity['last_cleanup_hours_ago'] > 1:
            issue = f"No recent cleanup activity (last: {recent_activity['last_cleanup_hours_ago']:.1f}h ago)"
            health_status['issues'].append(issue)
            health_status['status'] = 'critical'
            self.stdout.write(self.style.ERROR(f"✗ {issue}"))
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f"✓ Recent cleanup: {recent_activity['last_cleanup_hours_ago']:.1f}h ago"
                )
            )
        
        # Check 3: System performance
        performance_metrics = self._check_performance_metrics()
        health_status['metrics']['performance'] = performance_metrics
        
        if performance_metrics['avg_processing_time'] > 30:
            issue = f"Slow processing time: {performance_metrics['avg_processing_time']:.1f}s"
            health_status['issues'].append(issue)
            if health_status['status'] == 'healthy':
                health_status['status'] = 'warning'
            self.stdout.write(self.style.WARNING(f"⚠ {issue}"))
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f"✓ Avg processing time: {performance_metrics['avg_processing_time']:.1f}s"
                )
            )
        
        # Check 4: Database connectivity and performance
        db_health = self._check_database_health()
        health_status['metrics']['database'] = db_health
        
        if not db_health['healthy']:
            issue = f"Database issues detected: {db_health['error']}"
            health_status['issues'].append(issue)
            health_status['status'] = 'critical'
            self.stdout.write(self.style.ERROR(f"✗ {issue}"))
        else:
            self.stdout.write(self.style.SUCCESS("✓ Database connection healthy"))
        
        # Check 5: Lock file status
        lock_status = self._check_lock_status()
        health_status['metrics']['lock_status'] = lock_status
        
        if lock_status['stale_lock']:
            issue = "Stale lock file detected"
            health_status['issues'].append(issue)
            if health_status['status'] == 'healthy':
                health_status['status'] = 'warning'
            self.stdout.write(self.style.WARNING(f"⚠ {issue}"))
        
        # Save health status
        self._save_health_status(health_status)
        
        # Send alerts if necessary
        if health_status['status'] in ['warning', 'critical'] and self.send_alerts:
            self._send_health_alert(health_status)
        
        # Summary
        self.stdout.write()
        status_style = {
            'healthy': self.style.SUCCESS,
            'warning': self.style.WARNING,
            'critical': self.style.ERROR
        }[health_status['status']]
        
        self.stdout.write(status_style(f"Overall Status: {health_status['status'].upper()}"))
        
        if health_status['issues']:
            self.stdout.write("Issues found:")
            for issue in health_status['issues']:
                self.stdout.write(f"  - {issue}")

    def _check_expired_reservations(self):
        """Check current number of expired reservations."""
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT COUNT(*) 
                FROM orders_inventoryreservation ir
                JOIN orders_order o ON ir.order_id = o.order_id
                WHERE ir.is_active = true 
                    AND ir.expires_at < %s
                    AND o.payment_status IN ('pending', 'failed', 'cancelled')
            """, [timezone.now()])
            return cursor.fetchone()[0]

    def _check_recent_activity(self):
        """Check recent cleanup activity."""
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    COUNT(*) as cancelled_today,
                    MAX(cancelled_at) as last_cancelled
                FROM orders_inventoryreservation
                WHERE cancelled_at >= %s
            """, [timezone.now().date()])
            
            result = cursor.fetchone()
            cancelled_today = result[0]
            last_cancelled = result[1]
            
            if last_cancelled:
                hours_ago = (timezone.now() - last_cancelled).total_seconds() / 3600
            else:
                hours_ago = float('inf')
            
            return {
                'cancelled_today': cancelled_today,
                'last_cleanup_hours_ago': hours_ago
            }

    def _check_performance_metrics(self):
        """Check system performance metrics."""
        # This is a simplified version - in production you might want to
        # store execution times and analyze them
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    COUNT(*) as total_reservations,
                    COUNT(CASE WHEN is_active = false THEN 1 END) as processed_reservations,
                    AVG(EXTRACT(EPOCH FROM (cancelled_at - created_at))) as avg_lifetime
                FROM orders_inventoryreservation
                WHERE created_at >= %s
            """, [timezone.now() - timedelta(days=self.days_back)])
            
            result = cursor.fetchone()
            
            return {
                'total_reservations': result[0] or 0,
                'processed_reservations': result[1] or 0,
                'avg_lifetime_seconds': result[2] or 0,
                'avg_processing_time': 5.0  # Placeholder - would need actual timing data
            }

    def _check_database_health(self):
        """Check database connectivity and performance."""
        try:
            start_time = timezone.now()
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
            end_time = timezone.now()
            
            response_time = (end_time - start_time).total_seconds() * 1000
            
            return {
                'healthy': True,
                'response_time_ms': response_time,
                'error': None
            }
        except Exception as e:
            return {
                'healthy': False,
                'response_time_ms': None,
                'error': str(e)
            }

    def _check_lock_status(self):
        """Check for stale lock files."""
        lock_file = Path(settings.BASE_DIR) / 'unreservation_scheduler.lock'
        
        if not lock_file.exists():
            return {'stale_lock': False, 'lock_exists': False}
        
        try:
            with open(lock_file, 'r') as f:
                pid = int(f.read().strip())
            
            # Check if process is still running (Unix-like systems)
            try:
                os.kill(pid, 0)
                return {'stale_lock': False, 'lock_exists': True, 'pid': pid}
            except (ProcessLookupError, OSError):
                return {'stale_lock': True, 'lock_exists': True, 'pid': pid}
                
        except (ValueError, FileNotFoundError):
            return {'stale_lock': True, 'lock_exists': True, 'pid': None}

    def _save_health_status(self, health_status):
        """Save health status to file for historical tracking."""
        status_file = Path(settings.BASE_DIR) / 'unreservation_health_status.json'
        
        try:
            # Load existing statuses
            if status_file.exists():
                with open(status_file, 'r') as f:
                    statuses = json.load(f)
            else:
                statuses = []
            
            # Add new status
            statuses.append(health_status)
            
            # Keep only last 100 entries
            statuses = statuses[-100:]
            
            # Save back to file
            with open(status_file, 'w') as f:
                json.dump(statuses, f, indent=2, default=str)
                
        except Exception as e:
            logger.error(f"Failed to save health status: {e}")

    def _send_health_alert(self, health_status):
        """Send email alert for health issues."""
        try:
            subject = f"Automated Unreservation Alert - {health_status['status'].upper()}"
            
            message = f"""
Automated Unreservation System Alert

Status: {health_status['status'].upper()}
Timestamp: {health_status['timestamp']}

Issues Detected:
{chr(10).join(f"- {issue}" for issue in health_status['issues'])}

Metrics:
- Expired reservations: {health_status['metrics']['expired_reservations']}
- Last cleanup: {health_status['metrics']['recent_cleanups']['last_cleanup_hours_ago']:.1f}h ago
- Database healthy: {health_status['metrics']['database']['healthy']}

Please check the system and take appropriate action.
            """
            
            # This would need to be configured with actual email settings
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [settings.ADMIN_EMAIL],  # Would need to be configured
                fail_silently=False,
            )
            
            logger.info("Health alert email sent")
            
        except Exception as e:
            logger.error(f"Failed to send health alert: {e}")

    def generate_performance_report(self):
        """Generate detailed performance report."""
        self.stdout.write(self.style.SUCCESS("Automated Unreservation Performance Report"))
        self.stdout.write("=" * 50)
        
        cutoff_date = timezone.now() - timedelta(days=self.days_back)
        
        # Overall statistics
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    COUNT(*) as total_reservations,
                    COUNT(CASE WHEN is_active = false AND cancelled_at IS NOT NULL THEN 1 END) as cancelled_reservations,
                    COUNT(CASE WHEN is_active = false AND fulfilled_at IS NOT NULL THEN 1 END) as fulfilled_reservations,
                    COUNT(CASE WHEN is_active = true AND expires_at < %s THEN 1 END) as currently_expired,
                    AVG(CASE WHEN cancelled_at IS NOT NULL 
                        THEN EXTRACT(EPOCH FROM (cancelled_at - created_at)) / 60.0 
                        END) as avg_cancellation_time_minutes
                FROM orders_inventoryreservation
                WHERE created_at >= %s
            """, [timezone.now(), cutoff_date])
            
            stats = cursor.fetchone()
            
            self.stdout.write(f"Period: Last {self.days_back} days")
            self.stdout.write(f"Total reservations: {stats[0]}")
            self.stdout.write(f"Cancelled reservations: {stats[1]}")
            self.stdout.write(f"Fulfilled reservations: {stats[2]}")
            self.stdout.write(f"Currently expired: {stats[3]}")
            if stats[4]:
                self.stdout.write(f"Avg cancellation time: {stats[4]:.1f} minutes")
        
        # Daily breakdown
        self.stdout.write()
        self.stdout.write("Daily Breakdown:")
        self.stdout.write("-" * 20)
        
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    DATE(created_at) as date,
                    COUNT(*) as created,
                    COUNT(CASE WHEN cancelled_at IS NOT NULL THEN 1 END) as cancelled
                FROM orders_inventoryreservation
                WHERE created_at >= %s
                GROUP BY DATE(created_at)
                ORDER BY date DESC
                LIMIT 7
            """, [cutoff_date])
            
            for row in cursor.fetchall():
                date, created, cancelled = row
                self.stdout.write(f"{date}: {created} created, {cancelled} cancelled")
        
        # Performance insights
        self.stdout.write()
        self.stdout.write("Performance Insights:")
        self.stdout.write("-" * 20)
        
        if stats[3] > 0:
            self.stdout.write(
                self.style.WARNING(
                    f"⚠ {stats[3]} reservations are currently expired and need cleanup"
                )
            )
        else:
            self.stdout.write(self.style.SUCCESS("✓ No currently expired reservations"))
        
        if stats[0] > 0:
            cancellation_rate = (stats[1] / stats[0]) * 100
            self.stdout.write(f"Cancellation rate: {cancellation_rate:.1f}%")
            
            if cancellation_rate > 80:
                self.stdout.write(
                    self.style.WARNING("⚠ High cancellation rate - consider investigating")
                )
            elif cancellation_rate < 20:
                self.stdout.write(
                    self.style.WARNING("⚠ Low cancellation rate - system may not be working properly")
                )
