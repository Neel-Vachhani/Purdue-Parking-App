# from django.contrib.postgres.fields import ArrayField
# from location_field.models.plain import PlainLocationField
from django.db import models
from django.contrib.postgres.fields import ArrayField
from location_field.models.plain import PlainLocationField


# Create your models here.


class User(models.Model):

    parking_passes = {
        "A": "A",
        "B": "B",
        "C": "C",
        "Res": "Resident"
    }

    def empty_rating_json():
        return {
            "codes": {
                "PGH": 0,
                "PGG": 0,
                "PGU": 0,
                "PGNW": 0,
                "PGMD": 0,
                "PGW": 0,
                "PGGH": 0,
                "PGM": 0,
                "LOT_R": 0,
                "LOT_H": 0,
                "LOT_FB": 0,
                "KFPC": 0,
                "LOT_A": 0,
                "CREC": 0,
                "LOT_O": 0,
                "TARK_WILY": 0,
                "LOT_AA": 0,
                "LOT_BB": 0,
                "WND_KRACH": 0,
                "SHRV_ERHT_MRDH": 0,
                "MCUT_HARR_HILL": 0,
                "DUHM": 0,
                "PIERCE_ST": 0,
                "SMTH_BCHM": 0,
                "DISC_A": 0,
                "DISC_AB": 0,
                "DISC_ABC": 0,
                "AIRPORT": 0
            }
        }

    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=45)
    email = models.EmailField()
    password = models.CharField(max_length=100)

    parking_pass = models.CharField(
        max_length=5,
        choices=parking_passes,
        blank=True,
        null=True
    )

    notification_token = models.CharField(
        max_length=255,
        blank=True,
        null=True
    )

    default_origin = models.CharField(
        max_length=255,
        blank=True,
        null=True
    )
    other_location = models.CharField(
        max_length=255, blank=True, null=True)

    closure_notifications_enabled = models.BooleanField(default=True)

    # stays JSON → matches db jsonb
    lot_ratings = models.JSONField(
        default=dict,
        null=True,
        blank=True
    )

    # FIX: must be ArrayField because DB column is VARCHAR[]
    favorite_lots = ArrayField(
        models.CharField(max_length=255),
        default=list,
        null=True,
        blank=True
    )

    # stays varchar
    events = models.CharField(
        max_length=255,
        null=True,
        blank=True
    )

    # events = models.CharField()


class ParkingLot(models.Model):
    parking_passes = {
        "A": "A",
        "B": "B",
        "C": "C",
        "SG": "SG",
        "Res": "Residence Hall",
        "Paid": "Paid"
    }
    code = models.CharField(primary_key=True, max_length=20)
    name = models.CharField(max_length=100)
    paid = models.BooleanField(null=True)
    lat = models.FloatField()
    lng = models.FloatField()
    parking_passes = ArrayField(models.CharField(
        max_length=100, choices=parking_passes, blank=True))
    rating = models.FloatField(null=True)
    num_of_ratings = models.PositiveIntegerField()


class CalendarEvent(models.Model):
    id = models.AutoField(primary_key=True)
    title = models.CharField(max_length=1000)
    description = models.CharField(max_length=1000)
    start_time = models.TimeField(max_length=1000)
    end_time = models.TimeField(max_length=1000)
    dates = ArrayField(models.DateField(max_length=1000))
    location = PlainLocationField(max_length=1000, based_fields=['address'])
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, null=True, blank=True)

    def __str__(self):
        return f"{self.title} ({self.user.email})"


class Item(models.Model):
    name = models.CharField(max_length=50)
    password = models.CharField(max_length=100)
    created = models.DateTimeField(auto_now_add=True)

class UserPark(models.Model):
    """
    Logs every time a user parks in a garage.
    Used by User Story #9 - User parking insights & history.
    """

    id = models.AutoField(primary_key=True)

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='parking_logs'
    )

    lot = models.ForeignKey(
        ParkingLot,
        on_delete=models.CASCADE,
        related_name='user_logs'
    )

    timestamp = models.DateTimeField(auto_now_add=True)

    day_of_week = models.CharField(max_length=9, blank=True, null=True)
    # Example: "Monday", "Tuesday"

    class Meta:
        indexes = [
            models.Index(fields=['user', 'timestamp']),
            models.Index(fields=['lot', 'timestamp']),
            models.Index(fields=['user', 'day_of_week']),
        ]

    def save(self, *args, **kwargs):
        if not self.day_of_week:
            self.day_of_week = self.timestamp.strftime("%A")
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.user.email} parked at {self.lot.code} on {self.timestamp}"



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

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='notifications')
    notification_type = models.CharField(
        max_length=20, choices=NOTIFICATION_TYPES)
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


class GarageIssueReport(models.Model):
    """Stores user-submitted issue reports for parking garages."""

    lot_code = models.CharField(max_length=32)
    lot_name = models.CharField(max_length=120)
    description = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["lot_code", "-created_at"])]
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.lot_code} report at {self.created_at:%Y-%m-%d %H:%M}" 
