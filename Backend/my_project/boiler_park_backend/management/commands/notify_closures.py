from django.core.management.base import BaseCommand
from boiler_park_backend.models import LotEvent, User, NotificationLog
from api.push_notifications import send_push_message
from datetime import timedelta
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Scan upcoming lot closures and send notifications to users"

    def add_arguments(self, parser):
        parser.add_argument(
            '--hours',
            type=int,
            default=24,
            help='Look ahead this many hours for closures (default: 24)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be sent without actually sending'
        )

    def handle(self, *args, **options):
        hours_ahead = options['hours']
        dry_run = options['dry_run']
        
        # Find events starting within the specified timeframe
        now = timezone.now()
        future_time = now + timedelta(hours=hours_ahead)
        
        upcoming_events = LotEvent.objects.filter(
            start_time__gte=now,
            start_time__lte=future_time
        ).order_by('start_time')
        
        self.stdout.write(f"Found {upcoming_events.count()} upcoming events in next {hours_ahead} hours")
        
        if upcoming_events.count() == 0:
            self.stdout.write(self.style.WARNING("No upcoming closures found. Exiting."))
            return
        
        # Get users with:
        # 1. notification_token (opted-in to push)
        # 2. closure_notifications_enabled = True (opted-in to closure alerts)
        users = User.objects.filter(
            closure_notifications_enabled=True
        ).exclude(
            notification_token__isnull=True
        ).exclude(
            notification_token__exact=""
        )
        
        self.stdout.write(f"Found {users.count()} users eligible for notifications")
        
        if users.count() == 0:
            self.stdout.write(self.style.WARNING("No users opted-in for closure notifications. Exiting."))
            return
        
        sent = 0
        failed = 0
        
        # Group events by lot to avoid duplicate notifications
        lots_with_events = {}
        for event in upcoming_events:
            if event.lot_code not in lots_with_events:
                lots_with_events[event.lot_code] = []
            lots_with_events[event.lot_code].append(event)
        
        # Send one notification per lot (with all events for that lot)
        for lot_code, events in lots_with_events.items():
            # Format message based on number of events
            if len(events) == 1:
                event = events[0]
                date_str = event.start_time.strftime('%b %d')
                message = f"Heads up: {lot_code} will be closed on {date_str} - {event.title}"
            else:
                date_str = events[0].start_time.strftime('%b %d')
                message = f"Heads up: {lot_code} has {len(events)} upcoming closures starting {date_str}"
            
            self.stdout.write(f"\nSending for {lot_code}: '{message}'")
            
            for user in users:
                if dry_run:
                    self.stdout.write(f"  [DRY RUN] Would send to {user.email}")
                    sent += 1
                    continue
                
                try:
                    # Send push notification
                    send_push_message(
                        token=user.notification_token,
                        message=message,
                        extra={
                            "type": "lot_closure",
                            "lot_code": lot_code,
                            "event_id": events[0].id
                        }
                    )
                    
                    # Log successful notification
                    NotificationLog.objects.create(
                        user=user,
                        notification_type='lot_closure',
                        message=message,
                        success=True
                    )
                    sent += 1
                    
                except Exception as e:
                    error_msg = str(e)
                    logger.error(f"Failed to send notification to {user.email}: {error_msg}")
                    
                    # Log failed notification
                    NotificationLog.objects.create(
                        user=user,
                        notification_type='lot_closure',
                        message=message,
                        success=False,
                        error_message=error_msg
                    )
                    failed += 1
        
        self.stdout.write(self.style.SUCCESS(
            f"\n✓ Sent {sent} notifications, {failed} failed"
        ))


