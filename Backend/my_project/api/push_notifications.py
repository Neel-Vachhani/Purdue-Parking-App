from os import path
from fcm_django.api.rest_framework import FCMDeviceAuthorizedViewSet
from datetime import datetime, timedelta

from firebase_admin.messaging import Message, Notification
from fcm_django.models import FCMDevice

urlpatterns = [
    # Only allow creation of devices by authenticated users
    path('devices', FCMDeviceAuthorizedViewSet.as_view(
        {'post': 'create'}), name='create_fcm_device'),
    # ...
]


def parking_pass_push_notifications(sale_date):
    # You can still use .filter() or any methods that return QuerySet (from the chain)
    devices = FCMDevice.objects.all()
    if datetime.now() < (sale_date - timedelta(days=7)):
        devices.send_message(Message(
            notification=Notification(
                title="Parking Passes On Sale Soon", body="Parking Passes will go on sale on {sale_date}. Get yours through the Purdue Parking Portal"),
        ))
    if datetime.now() == (sale_date):
        devices.send_message(Message(
            notification=Notification(
                title="Parking Passes On Sale", body="Parking Passes have gone on sale. Get yours through the Purdue Parking Portal"),
        ))
