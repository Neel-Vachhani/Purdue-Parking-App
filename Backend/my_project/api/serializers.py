from rest_framework import serializers
from django.db import models
from boiler_park_backend.models import Item, User, LotEvent, NotificationLog


class ItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = Item
        fields = '__all__'


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = '__all__'


class LotEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = LotEvent
        fields = '__all__'


class NotificationLogSerializer(serializers.ModelSerializer):
    """Serializer for notification history tracking"""
    user_email = serializers.EmailField(source='user.email', read_only=True)
    
    class Meta:
        model = NotificationLog
        fields = ['id', 'user', 'user_email', 'notification_type', 'message', 'sent_at', 'success', 'error_message']
        read_only_fields = ['sent_at']
