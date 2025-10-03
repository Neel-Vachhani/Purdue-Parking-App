from rest_framework import serializers
from django.db import models
from boiler_park_backend.models import Item


class ItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = Item
        fields = '__all__'
