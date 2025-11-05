# from django.contrib.postgres.fields import ArrayField
# from location_field.models.plain import PlainLocationField
from django.db import models

# Create your models here.


class User(models.Model):

    parking_passes = {
        "A": "A",
        "B": "B",
        "C": "C",
        "Res": "Resident"
    }

    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=45)
    email = models.EmailField()
    password = models.CharField(max_length=100)
    parking_pass = models.CharField(
        max_length=5, choices=parking_passes, blank=True, null=True)
    notification_token = models.CharField(
        max_length=255, blank=True, null=True)
    default_origin = models.CharField(
        max_length=255, blank=True, null=True)
    # events = models.CharField()


'''

class User(models.Model):
    parking_passes = {
        "A": "A",
        "B": "B",
        "C": "C",
        "Res": "Resident"
    }

    id = models.AutoField(primary_key=True)
    email = models.EmailField()
    parking_pass = models.CharField(
        max_length=5, choices=parking_passes, blank=True, null=True)
    events = models.CharField()


class ParkingLot(models.Model):
    parking_passes = {
        "A": "A",
        "B": "B",
        "C": "C",
        "Res": "Resident"
    }
    special_lot = {
        "FB": "Football",
        "BB": "Basketball"
    }
    id = models.AutoField(primary_key=True)
    location = PlainLocationField()
    name = models.CharField(max_length=50)
    capacity = models.PositiveIntegerField()
    free_slots = models.PositiveIntegerField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    parking_passes = ArrayField(models.CharField(
        max_length=10, choices=parking_passes, blank=True))
    special_lot = models.CharField(
        max_length=10, choices=special_lot, null=True, blank=True)
    cameras = ArrayField(models.CharField(max_length=30))


class CalendarEvent(models.Model):
    id = models.AutoField(primary_key=True)
    title = models.CharField(max_length=100)
    descripton = models.CharField(max_length=200)
    start_time = models.TimeField()
    end_time = models.TimeField()
    dates = ArrayField(models.DateField())
    location = PlainLocationField()
    user = models.ForeignKey(User, on_delete=models.CASCADE)


class CampusEvent(models.Model):
    id = models.AutoField(primary_key=True)
    title = models.CharField(max_length=50)
    description = models.CharField(max_length=150)


class Camera(models.Model):
    id = models.AutoField(primary_key=True)
'''


class Item(models.Model):
    name = models.CharField(max_length=50)
    password = models.CharField(max_length=100)
    created = models.DateTimeField(auto_now_add=True)


class LotEvent(models.Model):
    """
    Tracks closure/event information for parking lots.
    Used by User Story #10 - Calendar of closures/events.
    """
    lot_code = models.CharField(max_length=32)
    title = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()

    class Meta:
        indexes = [models.Index(fields=['lot_code', 'start_time'])]


class NotificationLog(models.Model):
    """
    Tracks all push notifications sent to users.
    Used by User Story #2 (parking pass sales) and #11 (lot closures).
    
    Fields:
    - user: Who received the notification
    - notification_type: 'pass_sale', 'lot_closure', 'permit_expiring', etc.
    - message: The notification text
    - sent_at: When it was sent
    - success: Whether it sent successfully
    - error_message: Error details if failed
    """
    NOTIFICATION_TYPES = [
        ('pass_sale', 'Parking Pass Sale'),
        ('lot_closure', 'Lot Closure Alert'),
        ('permit_expiring', 'Permit Expiring'),
        ('event_closure', 'Event Day Closure'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES)
    message = models.TextField()
    sent_at = models.DateTimeField(auto_now_add=True)
    success = models.BooleanField(default=True)
    error_message = models.TextField(blank=True, null=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['user', 'sent_at']),
            models.Index(fields=['notification_type', 'sent_at'])
        ]
        ordering = ['-sent_at']  # Most recent first
    
    def __str__(self):
        status = "✓" if self.success else "✗"
        return f"{status} {self.notification_type} to {self.user.email} at {self.sent_at}"
