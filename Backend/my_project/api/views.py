import logging
from typing import List, Dict, Any, Optional

import bcrypt
import psycopg2
import redis
from decouple import config
from redis.exceptions import RedisError
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.response import Response
from rest_framework import status, serializers
from rest_framework.permissions import AllowAny, IsAuthenticated
from boiler_park_backend.models import Item, User
from .serializers import ItemSerializer, UserSerializer
from .services import verify_apple_identity, issue_session_token
import jwt



logger = logging.getLogger(__name__)





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

def get_postgres_connection(): 
    return psycopg2.connect( 
        host=config('DB_HOST'), 
        port=config('DB_PORT'), 
        database=config('DB_NAME'), 
        user=config('DB_USERNAME'), 
        password=config('DB_PASSWORD') 
    )

@api_view(["GET"])
def get_postgres_parking_data(request):
    """
    Returns occupancy history for a given lot and period.
    period = 'day', 'week', 'month'
    """
    # Define lot names and totals inside the function
    lot = request.GET.get("lot")
    period = request.GET.get("period", "day").lower()

    if not lot:
        return Response({"error": "Missing 'lot' query parameter."}, status=400)

    if period not in ["day", "week", "month"]:
        return Response({"error": "Invalid period. Must be 'day', 'week', or 'month'."}, status=400)

    # Connect to Postgres
    conn = psycopg2.connect(
        host=config("DB_HOST"),
        port=config("DB_PORT"),
        database=config("DB_NAME"),
        user=config("DB_USERNAME"),
        password=config("DB_PASSWORD")
    )
    cursor = conn.cursor()

    # Determine date range for filtering
    interval = {
        "day": "1 day",
        "week": "7 days",
        "month": "30 days"
    }[period]

    query = f"""
        SELECT id, timestamp, {lot}_availability
        FROM parking_availability_data
        WHERE timestamp >= NOW() - INTERVAL '{interval}'
        ORDER BY timestamp ASC;
    """
    cursor.execute(query)
    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    # Format results as list of dicts
    results = [{"id": r[0], "timestamp": r[1], "availability": r[2]} for r in rows]

    return Response(results)

@api_view(['GET'])
def get_parking_availability(request):
    PARKING_LOTS: List[Dict[str, Any]] = [
        {"id": 1, "name": "Harrison Garage", "redis_key": "PGH_availability"},
        {"id": 2, "name": "Grant Street Garage", "redis_key": "PGG_availability"},
        {"id": 3, "name": "University Street Garage", "redis_key": "PGU_availability"},
        {"id": 4, "name": "Northwestern Garage", "redis_key": "PGNW_availability"},
        # Update redis_key if a different counter is used for DS/AI lot
        {"id": 5, "name": "DS/AI Lot", "redis_key": "DISC_ABC_availability"},
    ]
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


@api_view(['POST'])
@permission_classes([AllowAny])
def apple_sign_in(request):
    print(">>> Apple endpoint hit")
    print("Headers:", dict(request.headers))
    print("Body:", request.data)

    identity_token = request.data.get("identity_token")
    if not identity_token:
        return Response({"detail": "identity_token is required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        payload = verify_apple_identity(identity_token)
    except jwt.ExpiredSignatureError:
        return Response({"detail": "Apple token expired"}, status=400)
    except jwt.InvalidTokenError as e:
        return Response({"detail": f"Invalid Apple token: {e}"}, status=400)

    apple_sub = payload.get("sub")
    if not apple_sub:
        return Response({"detail": "Missing sub in Apple token"}, status=status.HTTP_400_BAD_REQUEST)

    # Use Apple 'sub' as fallback email
    provided_email = request.data.get("email") or payload.get("email")
    if not provided_email:
        provided_email = f"{apple_sub}@apple.local"   # 👈 store sub in the email field

    full_name = request.data.get("full_name") or {}
    first_name = full_name.get("givenName") or ""
    last_name = full_name.get("familyName") or ""

    # Find or create user by this derived email
    user = User.objects.filter(email__iexact=provided_email).first()
    if not user:
      user = User(
        email= provided_email if provided_email else f"apple_{apple_sub[:16]}",
        name= f"apple_{apple_sub[:16]}",
        password="abc",  
        parking_pass="a",
      )
      user.save()

    token = issue_session_token(user)

    return Response(
        {
            "token": token if isinstance(token, str) else token.get("access", token),
            "user": {
                "id": user.id,
                "email": getattr(user, "email", None),
                "first_name": getattr(user, "first_name", ""),
                "last_name": getattr(user, "last_name", ""),
            },
        },
        status=status.HTTP_200_OK,
    )



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
    print("Incoming signup data:", request.data)  # server log for debugging
    serializer = UserSerializer(data=request.data)

    if not serializer.is_valid():
        print("Validation errors:", serializer.errors)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    email = serializer.validated_data['email']
    name = serializer.validated_data.get('name', email)
    raw_password = serializer.validated_data['password']
    parking_pass = serializer.validated_data.get('parking_pass', "abcd")

    salt = bcrypt.gensalt()
    hashed_pass = bcrypt.hashpw(raw_password.encode('utf-8'), salt).decode('utf-8')

    user = User(
        email=email,
        name=name,
        password=hashed_pass,  
        parking_pass=parking_pass,
    )
    user.save()

    return Response(
        {"message": "User created successfully", "user": UserSerializer(user).data},
        status=status.HTTP_201_CREATED,
    )

@api_view(['POST'])
def accept_notification_token(request):
    token = request.data["token"]
    # save token to database
    return Response("Token received")

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()

@api_view(['POST'])
def log_in(request):
    s = LoginSerializer(data=request.data)
    s.is_valid(raise_exception=True)

    email = s.validated_data['email']
    raw_password = s.validated_data['password']

    user = User.objects.filter(email=email).first()
    if not user:
        return Response({"detail": "Invalid email or password."}, status=status.HTTP_400_BAD_REQUEST)

    stored_hash = user.password.encode('utf-8')
    if not bcrypt.checkpw(raw_password.encode('utf-8'), stored_hash):
        return Response({"detail": "Invalid email or password."}, status=status.HTTP_400_BAD_REQUEST)

    return Response(
        {
            "message": "Login successful",
            "user": {"id": user.id, "email": user.email, "name": getattr(user, "name", "")},
        },
        status=status.HTTP_200_OK,
    )


@api_view(['POST'])
def accept_ical_file(request):
    from . import services
    calendar = request.data["calendar"]
    output = services.open_file_calendar(calendar)
    return Response(output)


@api_view(['POST'])
def accept_notification_token(request):
    username = request.data["username"]
    token = request.data["token"]
    user = User.objects.get(name=username)
    user.notification_token = token
    user.save()
    return Response("Token received")
