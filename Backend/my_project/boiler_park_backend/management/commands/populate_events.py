from django.core.management.base import BaseCommand
from boiler_park_backend.models import LotEvent
from datetime import datetime
from django.utils import timezone


class Command(BaseCommand):
    help = 'Populate parking lot events for 2024-2025 season'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('Starting to populate events...'))
        
        # Calculate tomorrow's date for test event
        from datetime import datetime, timedelta
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        # Football games affecting parking
        football_events = [
            {
                "title": "TEST: Maintenance Closure",
                "description": "Test event for notification testing. Parking restricted for maintenance work.",
                "start_time": f"{tomorrow} 08:00:00",
                "end_time": f"{tomorrow} 17:00:00",
            },
            {
                "title": "Football Game: Purdue vs #1 Ohio State",
                "description": "Parking restricted for home football game. Event parking starts at 8 AM. Tow time begins at 6 AM.",
                "start_time": "2025-11-08 06:00:00",
                "end_time": "2025-11-08 20:00:00",
            },
            {
                "title": "Football Game: Purdue vs Indiana (Rivalry Week)",
                "description": "Parking restricted for home football game. Event parking starts at 8 AM. Tow time begins at 6 AM.",
                "start_time": "2025-11-28 06:00:00",
                "end_time": "2025-11-28 23:30:00",
            },
        ]
        
        # Men's Basketball games affecting parking (Nov-Dec 2025)
        # Purdue Men's Basketball home games at Mackey Arena
        basketball_events = [
            {
                "title": "Men's Basketball: Purdue vs Oakland",
                "description": "Northwestern Avenue Garage restricted for home basketball game. Event parking active.",
                "start_time": "2025-11-07 19:00:00",
                "end_time": "2025-11-08 01:00:00",
            },
            {
                "title": "Men's Basketball: Purdue vs Akron",
                "description": "Northwestern Avenue Garage restricted for home basketball game. Event parking active.",
                "start_time": "2025-11-16 19:30:00",
                "end_time": "2025-11-17 01:00:00",
            },
            {
                "title": "Men's Basketball: Purdue vs Eastern Illinois",
                "description": "Northwestern Avenue Garage restricted for home basketball game. Event parking active.",
                "start_time": "2025-11-28 12:00:00",
                "end_time": "2025-11-28 18:00:00",
            },
            {
                "title": "Men's Basketball: Purdue vs Iowa State",
                "description": "Northwestern Avenue Garage restricted for home basketball game. Event parking active.",
                "start_time": "2025-12-06 12:00:00",
                "end_time": "2025-12-06 18:00:00",
            },
            {
                "title": "Men's Basketball: Purdue vs Minnesota",
                "description": "Northwestern Avenue Garage restricted for home basketball game. Event parking active.",
                "start_time": "2025-12-10 19:00:00",
                "end_time": "2025-12-11 01:00:00",
            },
            {
                "title": "Men's Basketball: Purdue vs Marquette",
                "description": "Northwestern Avenue Garage restricted for home basketball game. Event parking active.",
                "start_time": "2025-12-13 14:00:00",
                "end_time": "2025-12-13 20:00:00",
            },
            {
                "title": "Men's Basketball: Purdue vs Kent State",
                "description": "Northwestern Avenue Garage restricted for home basketball game. Event parking active.",
                "start_time": "2025-12-29 19:00:00",
                "end_time": "2025-12-30 01:00:00",
            },
        ]
        
        # Lots affected by football games (based on Purdue parking website)
        football_lots = [
            "PGU",    # University Street Garage
            "PGNW",   # Northwestern Avenue Garage
            "LOT_A",  # Lot A (North of Cary Quad)
            "LOT_R",  # Lot R (North of Ross-Ade)
            "LOT_H",  # Lot H (North of Football Practice Field)
            "LOT_FB", # Lot FB (East of Football Practice Field)
            "LOT_O",  # Lot O (East of Rankin Track)
            "LOT_AA", # Lot AA (6th & Russell)
            "LOT_BB", # Lot BB (6th & Waldron)
        ]
        
        # Lots affected by basketball games (primarily Northwestern Ave Garage)
        basketball_lots = [
            "PGNW",   # Northwestern Avenue Garage (main impact)
        ]
        
        created_count = 0
        skipped_count = 0
        
        # Process football events
        for event in football_events:
            for lot_code in football_lots:
                obj, created = LotEvent.objects.get_or_create(
                    lot_code=lot_code,
                    start_time=timezone.make_aware(datetime.fromisoformat(event["start_time"])),
                    defaults={
                        'title': event['title'],
                        'description': event['description'],
                        'end_time': timezone.make_aware(datetime.fromisoformat(event["end_time"])),
                    }
                )
                if created:
                    created_count += 1
                    self.stdout.write(
                        f'  ✓ Created: {event["title"]} for {lot_code}'
                    )
                else:
                    skipped_count += 1
        
        # Process basketball events
        for event in basketball_events:
            for lot_code in basketball_lots:
                obj, created = LotEvent.objects.get_or_create(
                    lot_code=lot_code,
                    start_time=timezone.make_aware(datetime.fromisoformat(event["start_time"])),
                    defaults={
                        'title': event['title'],
                        'description': event['description'],
                        'end_time': timezone.make_aware(datetime.fromisoformat(event["end_time"])),
                    }
                )
                if created:
                    created_count += 1
                    self.stdout.write(
                        f'  ✓ Created: {event["title"]} for {lot_code}'
                    )
                else:
                    skipped_count += 1
        
        self.stdout.write(self.style.SUCCESS(
            f'\nDone! Created {created_count} new events, skipped {skipped_count} duplicates.'
        ))
        self.stdout.write(self.style.SUCCESS(
            f'Total events in database: {LotEvent.objects.count()}'
        ))

