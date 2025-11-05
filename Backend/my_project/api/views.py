import logging
from statistics import mean
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



PARKING_LOTS: List[Dict[str, Any]] = [
    {"id": 1, "code": "PGH", "name": "Harrison Street Parking Garage",
        "redis_key": "PGH_availability"},
    {"id": 2, "code": "PGG", "name": "Grant Street Parking Garage",
        "redis_key": "PGG_availability"},
    {"id": 3, "code": "PGU", "name": "University Street Parking Garage",
        "redis_key": "PGU_availability"},
    {"id": 4, "code": "PGNW", "name": "Northwestern Avenue Parking Garage",
        "redis_key": "PGNW_availability"},
    {"id": 5, "code": "PGMD", "name": "McCutcheon Drive Parking Garage",
        "redis_key": "PGMD_availability"},
    {"id": 6, "code": "PGW", "name": "Wood Street Parking Garage",
        "redis_key": "PGW_availability"},
    {"id": 7, "code": "PGGH", "name": "Graduate House Parking Garage",
        "redis_key": "PGGH_availability"},
    {"id": 8, "code": "PGM", "name": "Marsteller Street Parking Garage",
        "redis_key": "PGM_availability"},
    {"id": 9, "code": "LOT_R",
        "name": "Lot R (North of Ross-Ade)", "redis_key": "LOT_R_availability"},
    {"id": 10, "code": "LOT_H",
        "name": "Lot H (North of Football Practice Field)", "redis_key": "LOT_H_availability"},
    {"id": 11, "code": "LOT_FB",
        "name": "Lot FB (East of Football Practice Field)", "redis_key": "LOT_FB_availability"},
    {"id": 12, "code": "KFPC", "name": "Kozuch Football Performance Complex Lot",
        "redis_key": "KFPC_availability"},
    {"id": 13, "code": "LOT_A",
        "name": "Lot A (North of Cary Quad)", "redis_key": "LOT_A_availability"},
    {"id": 14, "code": "CREC", "name": "Co-Rec Parking Lots",
        "redis_key": "CREC_availability"},
    {"id": 15, "code": "LOT_O",
        "name": "Lot O (East of Rankin Track)", "redis_key": "LOT_O_availability"},
    {"id": 16, "code": "TARK_WILY", "name": "Tarkington Wiley Parking Lots",
        "redis_key": "TARK_WILY_availability"},
    {"id": 17, "code": "LOT_AA",
        "name": "Lot AA (6th & Russell)", "redis_key": "LOT_AA_availability"},
    {"id": 18, "code": "LOT_BB",
        "name": "Lot BB (6th & Waldron)", "redis_key": "LOT_BB_availability"},
    {"id": 19, "code": "WND_KRACH", "name": "Windsor & Krach Shared Parking Lot",
        "redis_key": "WND_KRACH_availability"},
    {"id": 20, "code": "SHRV_ERHT_MRDH", "name": "Shreve, Earhart & Meredith Shared Lot",
        "redis_key": "SHRV_ERHT_MRDH_availability"},
    {"id": 21, "code": "MCUT_HARR_HILL", "name": "McCutcheon, Harrison & Hillenbrand Shared Lot",
        "redis_key": "MCUT_HARR_HILL_availability"},
    {"id": 22, "code": "DUHM", "name": "Duhme Hall Parking Lot",
        "redis_key": "DUHM_availability"},
    {"id": 23, "code": "PIERCE_ST", "name": "Pierce Street Parking Lot",
        "redis_key": "PIERCE_ST_availability"},
    {"id": 24, "code": "SMTH_BCHM", "name": "Smith & Biochemistry Lot",
        "redis_key": "SMTH_BCHM_availability"},
    {"id": 25, "code": "DISC_A",
        "name": "Discovery Lot (A Permit)", "redis_key": "DISC_A_availability"},
    {"id": 26, "code": "DISC_AB",
        "name": "Discovery Lot (AB Permit)", "redis_key": "DISC_AB_availability"},
    {"id": 27, "code": "DISC_ABC",
        "name": "Discovery Lot (ABC Permit)", "redis_key": "DISC_ABC_availability"},
    {"id": 28, "code": "AIRPORT", "name": "Airport Parking Lots",
        "redis_key": "AIRPORT_availability"},
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

@api_view(["GET"])
def get_hourly_average_parking(request):
    """
    Returns average occupancy for a given lot at a specific hour, 
    optionally filtered by weekday, based on past 30 days of data.

    Query Params:
      - lot (str): e.g., 'pgmd', 'lot_a', etc. [required]
      - hour (int): 0–23 [required]
      - weekday (str): optional, e.g., 'monday', 'tuesday', etc.
      - threshold (float): optional, e.g., 80 (to flag full lots)
    """
    lot = request.GET.get("lot")
    hour_param = request.GET.get("hour")
    weekday_param = request.GET.get("weekday")
    threshold_param = request.GET.get("threshold")

    # Validate inputs
    if not lot or hour_param is None:
        return Response({"error": "Missing required parameters 'lot' or 'hour'."}, status=400)
    
    try:
        hour = int(hour_param)
        if not (0 <= hour <= 23):
            raise ValueError
    except ValueError:
        return Response({"error": "Invalid 'hour'. Must be an integer between 0 and 23."}, status=400)

    # Optional: normalize weekday name
    weekdays_map = {
        "monday": 0, "tuesday": 1, "wednesday": 2,
        "thursday": 3, "friday": 4, "saturday": 5, "sunday": 6
    }
    weekday_index = None
    if weekday_param:
        weekday_param = weekday_param.lower()
        if weekday_param not in weekdays_map:
            return Response({"error": "Invalid 'weekday' parameter."}, status=400)
        weekday_index = weekdays_map[weekday_param]

    # Connect to Postgres
    conn = psycopg2.connect(
        host=config("DB_HOST"),
        port=config("DB_PORT"),
        database=config("DB_NAME"),
        user=config("DB_USERNAME"),
        password=config("DB_PASSWORD")
    )
    cursor = conn.cursor()

    # Build SQL query
    query = f"""
        SELECT timestamp, {lot}_availability
        FROM parking_availability_data
        WHERE timestamp >= NOW() - INTERVAL '30 days';
    """
    cursor.execute(query)
    rows = cursor.fetchall()
    print(rows)
    cursor.close()
    conn.close()

    if not rows:
        return Response({"error": "No data found for this lot."}, status=404)

    # Filter by hour and optional weekday
    filtered = []
    for ts, avail in rows:
        if ts.hour == hour:
            if weekday_index is None or ts.weekday() == weekday_index:
                filtered.append(avail)

    if not filtered:
        return Response({"error": "No matching data for that hour/weekday."}, status=404)

    avg_occupancy = mean(filtered)

    # Optional threshold logic
    result = {
        "lot": lot,
        "hour": hour,
        "weekday": weekday_param or "all_days",
        "average_occupancy": round(avg_occupancy, 2),
    }

    if threshold_param:
        try:
            threshold = float(threshold_param)
            result["likely_full"] = avg_occupancy >= threshold
        except ValueError:
            return Response({"error": "Invalid threshold. Must be a number."}, status=400)

    return Response(result)


@api_view(['GET'])
def get_parking_availability(request):
    try:
        client = _redis_connection()
        lots_payload = []
        for lot in PARKING_LOTS:
            raw_value = client.get(lot["redis_key"])
            lots_payload.append({
                "id": lot["id"],
                "code": lot.get("code"),
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
        logger.exception(
            "Unexpected error while building parking availability response")
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
        # 👈 store sub in the email field
        provided_email = f"{apple_sub}@apple.local"

    full_name = request.data.get("full_name") or {}
    first_name = full_name.get("givenName") or ""
    last_name = full_name.get("familyName") or ""

    # Find or create user by this derived email
    user = User.objects.filter(email__iexact=provided_email).first()
    if not user:
        user = User(
            email=provided_email if provided_email else f"apple_{apple_sub[:16]}",
            name=f"apple_{apple_sub[:16]}",
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
    hashed_pass = bcrypt.hashpw(
        raw_password.encode('utf-8'), salt).decode('utf-8')

    user = User(
        email=email,
        name=name,
        password=hashed_pass,
        parking_pass=parking_pass,
    )
    user.save()

    return Response(
        {"message": "User created successfully",
            "user": UserSerializer(user).data},
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
