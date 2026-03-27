"""
ASGI config for my_project project.
"""

import os
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

# 1) Configure Django settings FIRST
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "my_project.settings")

from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from django.urls import path
from boiler_park_backend.consumers import ParkingConsumer

# 2) Initialize Django ASGI app
django_asgi_app = get_asgi_application()

# 3) Build the protocol router
application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AuthMiddlewareStack(
        URLRouter([
            path("ws/parking/", ParkingConsumer.as_asgi()),
            path("ws/parking", ParkingConsumer.as_asgi()),
        ])
    ),
})
