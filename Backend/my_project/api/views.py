import logging
from typing import List, Dict, Any, Optional

import bcrypt
import redis
from decouple import config
from redis.exceptions import RedisError
from rest_framework.decorators import api_view
from rest_framework.response import Response

from boiler_park_backend.models import Item, User
from .serializers import ItemSerializer, UserSerializer


logger = logging.getLogger(__name__)


PARKING_LOTS: List[Dict[str, Any]] = [
    {"id": 1, "name": "Harrison Garage", "redis_key": "PGH_availability"},
    {"id": 2, "name": "Grant Street Garage", "redis_key": "PGG_availability"},
    {"id": 3, "name": "University Street Garage", "redis_key": "PGU_availability"},
    {"id": 4, "name": "Northwestern Garage", "redis_key": "PGNW_availability"},
    # Update redis_key if a different counter is used for DS/AI lot
    {"id": 5, "name": "DS/AI Lot", "redis_key": "DISC_ABC_availability"},
]


def _redis_connection() -> redis.Redis:
    redis_kwargs = {"decode_responses": True}

    host = config("REDIS_HOST", default="localhost")
    if host:
        redis_kwargs["host"] = host

    port_value = config("REDIS_PORT", default=None)
    if port_value:
        try:
            redis_kwargs["port"] = int(port_value)
        except (TypeError, ValueError):
            logger.warning(
                "Invalid REDIS_PORT value '%s', falling back to 6379", port_value
            )
            redis_kwargs["port"] = 6379
    else:
        redis_kwargs["port"] = 6379

    username = config("REDIS_USERNAME", default=None)
    if username:
        redis_kwargs["username"] = username

    password = config("REDIS_PASSWORD", default=None)
    if password:
        redis_kwargs["password"] = password

    return redis.Redis(**redis_kwargs)


def _parse_int(value: Any) -> Optional[int]:
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


@api_view(['GET'])
def get_parking_availability(request):
    try:
        client = _redis_connection()
        lots_payload = []
        for lot in PARKING_LOTS:
            raw_value = client.get(lot["redis_key"])
            lots_payload.append({
                "id": lot["id"],
                "name": lot["name"],
                "available": _parse_int(raw_value),
            })
        return Response({"lots": lots_payload})
    except RedisError:
        logger.exception("Unable to fetch parking availability from Redis")
        return Response(
            {"detail": "Unable to reach parking availability service."},
            status=503,
        )
    except Exception:
        logger.exception("Unexpected error while building parking availability response")
        return Response(
            {"detail": "Unexpected error while building parking availability response."},
            status=500,
        )
import bcrypt
from . import services


@api_view(['GET'])
def get_data(request):
    items = Item.objects.all()
    serializer = ItemSerializer(items, many=True)
    return Response(serializer.data)


@api_view(['POST'])
def add_item(request):
    serializer = ItemSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
    return Response(serializer.data)


@api_view(['POST'])
def sign_up(request):
    serializer = UserSerializer(data=request.data)
    if serializer.is_valid():
        email = serializer.validated_data['email']
        name = serializer.validated_data['name']
        password = serializer.validated_data['password']
        parking_pass = serializer.validated_data['parking_pass']
        pass_bytes = password.encode('utf-8')
        salt = bcrypt.gensalt()
        hashed_pass = bcrypt.hashpw(pass_bytes, salt)
        user = User(email=email, password=hashed_pass, name=name,
                    parking_pass=parking_pass)
        user.save()
    return Response("Sign up successful")


@api_view(['POST'])
def accept_notification_token(request):
    token = request.data["token"]
    # save token to database
    return Response("Token received")


@api_view(['POST'])
def log_in(request):
    serializer = UserSerializer(data=request.data)
    if serializer.is_valid():
        email = serializer.validated_data['email']
        password = serializer.validated_data['password']
        entered_password = User.objects.get(email=email).password
        pass_bytes = entered_password.encode('utf-8')
        salt = bcrypt.gensalt()
        hashed_pass = bcrypt.hashpw(pass_bytes, salt)
        result = bcrypt.checkpw(pass_bytes, hashed_pass)
        if result:
            return Response("Login successful")
        else:
            return Response("Login failed")


@api_view(['POST'])
def accept_ical_file(request):
    from . import services
    calendar = request.data["calendar"]
    output = services.open_file_calendar(calendar)
    return Response(output)


@api_view(['POST'])
def test(request):
    print(request.data)
    return Response(request.data)


@api_view(['POST'])
def accept_notification_token(request):
    email = request.data["email"]
    token = request.data["token"]
    user = User.objects.get(email=email)
    user.notification_token = token
    user.save()
    return Response("Token received")
