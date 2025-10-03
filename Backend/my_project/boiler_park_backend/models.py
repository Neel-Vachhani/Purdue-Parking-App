# from django.contrib.postgres.fields import ArrayField
# from location_field.models.plain import PlainLocationField
from django.db import models

# Create your models here.
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
    created = models.DateTimeField(auto_now_add=True)
