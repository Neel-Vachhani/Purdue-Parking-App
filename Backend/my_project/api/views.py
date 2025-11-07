import logging
from statistics import mean
from typing import List, Dict, Any, Optional
from django.db import connection


import bcrypt
import psycopg2
import redis
from decouple import config
from rest_framework.response import Response
from redis.exceptions import RedisError
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework import status, serializers
from rest_framework.permissions import AllowAny, IsAuthenticated
from boiler_park_backend.models import Item, User, LotEvent, NotificationLog
from .serializers import ItemSerializer, UserSerializer, LotEventSerializer, NotificationLogSerializer
from .services import verify_apple_identity, issue_session_token
import jwt
from datetime import datetime, timedelta


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
    lot_code = request.GET.get("lot")
    period = request.GET.get("period", "day").lower()

    if not lot_code:
        return Response({"error": "Missing 'lot' query parameter."}, status=400)
    else:
        lot_code = lot_code.upper()
    if period not in ["day", "week", "month"]:
        return Response({"error": "Invalid period. Must be 'day', 'week', or 'month'."}, status=400)
    lot_entry = next(
        (lot for lot in PARKING_LOTS if lot["code"].lower() == lot_code.lower()), None)
    if not lot_entry:
        return Response({"error": f"Lot '{lot_code}' not found."}, status=404)

    column_name = lot_entry["redis_key"]

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
        SELECT id, timestamp, {column_name}
        FROM parking_availability_data
        WHERE timestamp >= NOW() - INTERVAL '{interval}'
        ORDER BY timestamp ASC;
    """
    try:
        cursor.execute(query)
    except psycopg2.OperationalError:
        conn = get_postgres_connection()
        cursor = conn.cursor()
        cursor.execute(query)

    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    # Format results as list of dicts
    results = [{"id": r[0], "timestamp": r[1], "availability": r[2]}
               for r in rows]
    return Response(results)


@api_view(["GET"])
def get_hourly_average_parking(request):
    """
    Returns average availability for a given lot at a specific hour, 
    optionally filtered by weekday, based on past 30 days of data.

    Query Params:
      - lot (str): e.g., 'pgmd', 'lot_a', etc. [required]
      - hour (int): 0–23 [required]
      - weekday (str): optional, e.g., 'monday', 'tuesday', etc.
    """
    lot_code = request.GET.get("lot")
    hour_param = request.GET.get("hour")
    weekday_param = request.GET.get("weekday")

    # Validate inputs
    if not lot_code or hour_param is None:
        return Response({"error": "Missing required parameters 'lot' or 'hour'."}, status=400)
    lot_code = lot_code.upper()
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

    lot_entry = next((lot for lot in PARKING_LOTS if lot["code"].lower() == lot_code.lower()), None)
    if not lot_entry:
        return Response({"error": f"Lot '{lot_code}' not found."}, status=404)

    column_name = lot_entry["redis_key"]

    # Connect to Postgres
    conn = psycopg2.connect(
        host=config("DB_HOST"),
        port=config("DB_PORT"),
        database=config("DB_NAME"),
        user=config("DB_USERNAME"),
        password=config("DB_PASSWORD")
    )
    cursor = conn.cursor()

    # Get last 30 days of availability data
    query = f"""
        SELECT timestamp, {column_name}
        FROM parking_availability_data
        WHERE timestamp >= NOW() - INTERVAL '30 days';
    """
    cursor.execute(query)
    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    if not rows:
        return Response({"error": "No data found for this lot."}, status=404)

    # Filter by hour and optional weekday
    filtered = [avail for ts, avail in rows if ts.hour == hour and (weekday_index is None or ts.weekday() == weekday_index)]
    if not filtered:
        return Response({"error": "No matching data for that hour/weekday."}, status=404)

    avg_availability = round(mean(filtered), 2)

    return Response({
        "lot": lot_code.lower(),
        "hour": hour,
        "weekday": weekday_param or "all_days",
        "average_availability": avg_availability
    })



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

    # Save push token if provided
    push_token = request.data.get("push_token")
    if push_token:
        user.notification_token = push_token
        user.save(update_fields=["notification_token"])
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
    # Get from raw data, not validated
    push_token = request.data.get('push_token')

    salt = bcrypt.gensalt()
    hashed_pass = bcrypt.hashpw(
        raw_password.encode('utf-8'), salt).decode('utf-8')

    user = User(
        email=email,
        name=name,
        password=hashed_pass,
        parking_pass=parking_pass,
        notification_token=push_token if push_token else None,
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


@api_view(['GET', 'POST'])
# TODO: tighten to IsAuthenticated with session once auth flow is finalized
@permission_classes([AllowAny])
def user_origin(request):
    """Get or set the user's default origin address.

    GET:  /user/origin/?email=<email>
    POST: { email, default_origin }
    """
    email = request.data.get(
        "email") if request.method == 'POST' else request.query_params.get("email")
    if not email:
        return Response({"detail": "email required"}, status=400)

    user = User.objects.filter(email=email).first()
    if not user:
        return Response({"detail": "user not found"}, status=404)

    if request.method == 'GET':
        return Response({"default_origin": getattr(user, "default_origin", None)})

    default_origin = request.data.get("default_origin", "")
    user.default_origin = default_origin
    user.save(update_fields=["default_origin"])
    return Response({"status": "ok", "default_origin": user.default_origin})


@api_view(['POST'])
def accept_ical_file(request):
    from . import services
    calendar = request.data["calendar"]
    output = services.open_file_calendar(calendar)
    return Response(output)


@api_view(['POST'])
def accept_notification_token(request):
    email = request.data.get("email") or request.data.get(
        "username")  # Support both for backwards compatibility
    token = request.data.get("token", "")

    if not email:
        return Response({"detail": "email is required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(email=email)
        user.notification_token = token
        user.save(update_fields=["notification_token"])
        return Response({"status": "ok", "message": "Token saved successfully"})
    except User.DoesNotExist:
        return Response({"detail": "User not found"}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
def notification_disable(request):
    """
    Disable push notifications by clearing the user's notification token.
    Used by User Story #2 - AC2 (disable notifications).

    Body:
        email: User's email address

    Returns:
        status: ok if successful
    """
    email = request.data.get("email")

    if not email:
        return Response({"detail": "email is required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(email=email)
        user.notification_token = None
        user.save(update_fields=["notification_token"])
        logger.info(f"Notifications disabled for user {email}")
        return Response({"status": "ok", "message": "Notifications disabled successfully"})
    except User.DoesNotExist:
        return Response({"detail": "User not found"}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
def notification_test(request):
    """
    Send a test notification to verify the user's push token works.
    Used by User Story #2 - AC1 (test notification after enabling).

    Body:
        email: User's email address

    Returns:
        status: ok if notification sent successfully
        error: if notification failed
    """
    from .push_notifications import send_push_message

    email = request.data.get("email")

    if not email:
        return Response({"detail": "email is required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(email=email)

        if not user.notification_token:
            return Response(
                {"detail": "User has no notification token registered"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Send test notification
        name = (user.name or user.email or "Boilermaker").split()[0]
        test_message = f"Hi {name}! Test notification successful. You're all set to receive parking pass sale alerts."

        try:
            send_push_message(
                token=user.notification_token,
                message=test_message,
                extra={"type": "test", "user_id": user.id}
            )

            # Log the test notification
            NotificationLog.objects.create(
                user=user,
                notification_type='pass_sale',  # Using pass_sale type for consistency
                message=test_message,
                success=True
            )

            logger.info(f"Test notification sent to user {email}")
            return Response({"status": "ok", "message": "Test notification sent successfully"})

        except Exception as e:
            error_msg = str(e)
            logger.error(
                f"Failed to send test notification to {email}: {error_msg}")

            # Log the failed notification
            NotificationLog.objects.create(
                user=user,
                notification_type='pass_sale',
                message=test_message,
                success=False,
                error_message=error_msg
            )

            return Response(
                {"detail": "Failed to send test notification", "error": error_msg},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    except User.DoesNotExist:
        return Response({"detail": "User not found"}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
def list_lot_events(request, lot_code: str):
    from django.utils.timezone import now
    qs = LotEvent.objects.filter(
        lot_code__iexact=lot_code, end_time__gte=now()).order_by('start_time')[:100]
    return Response(LotEventSerializer(qs, many=True).data)


@api_view(['POST'])
def notify_parking_pass_sale(request):
    """
    Broadcast parking pass sale notifications to all opted-in users.
    Used by User Story #2 - Push notifications for pass sales.

    Body:
        message (optional): Custom notification message

    Returns:
        sent: Number of successful notifications
        failed: Number of failed notifications
        message: The message that was sent
    """
    from .push_notifications import send_push_message

    # Get message from request, with default
    message = request.data.get("message") or "Parking passes are on sale!"

    # Get all users with notification tokens (opted-in)
    users = User.objects.exclude(notification_token__isnull=True).exclude(
        notification_token__exact="")

    sent = 0
    failed = 0

    for user in users:
        try:
            # Personalize with user's name
            name = (user.name or user.email or "Boilermaker").split()[0]
            personalized_message = f"Hi {name}, {message}"

            # Send push notification
            send_push_message(
                token=user.notification_token,
                message=personalized_message,
                extra={"type": "pass_sale", "user_id": user.id}
            )

            # Log successful notification
            NotificationLog.objects.create(
                user=user,
                notification_type='pass_sale',
                message=personalized_message,
                success=True
            )
            sent += 1

        except Exception as e:
            error_msg = str(e)
            logger.error(f"Failed to send push to user {user.id}: {error_msg}")

            # Log failed notification
            NotificationLog.objects.create(
                user=user,
                notification_type='pass_sale',
                message=personalized_message if 'personalized_message' in locals() else message,
                success=False,
                error_message=error_msg
            )
            failed += 1

    logger.info(f"Pass sale notification: {sent} sent, {failed} failed")

    return Response({
        "sent": sent,
        "failed": failed,
        "total_users": sent + failed,
        "message": message
    })


@api_view(['POST'])
def notify_upcoming_closures(request):
    """Stub endpoint for closure notifications (schedule integration later)."""
    lot = request.data.get("lot") or "PGH"
    date = request.data.get("date") or "tomorrow"
    return Response({"queued": True, "lot": lot, "date": date})


@api_view(['GET'])
def notification_history(request):
    """
    Get notification history with optional filtering.
    Used for debugging and monitoring User Story #2 and #11.

    Query params:
        user_email: Filter by user email
        notification_type: Filter by type (pass_sale, lot_closure, etc.)
        limit: Number of results (default 50, max 200)

    Example:
        /api/notifications/history/?notification_type=pass_sale&limit=10
    """
    # Start with all notifications
    notifications = NotificationLog.objects.all()

    # Filter by user email if provided
    user_email = request.query_params.get('user_email')
    if user_email:
        notifications = notifications.filter(user__email__icontains=user_email)

    # Filter by notification type if provided
    notification_type = request.query_params.get('notification_type')
    if notification_type:
        notifications = notifications.filter(
            notification_type=notification_type)

    # Limit results
    limit = min(int(request.query_params.get('limit', 50)), 200)
    notifications = notifications[:limit]

    return Response(NotificationLogSerializer(notifications, many=True).data)


@api_view(['GET'])
def notification_stats(request):
    """
    Get notification statistics.
    Shows success/failure rates by notification type.

    Example:
        /api/notifications/stats/
    """
    from django.db.models import Count, Q

    stats = {}

    # Get stats for each notification type
    for type_code, type_name in NotificationLog.NOTIFICATION_TYPES:
        type_notifications = NotificationLog.objects.filter(
            notification_type=type_code)

        stats[type_code] = {
            'name': type_name,
            'total': type_notifications.count(),
            'successful': type_notifications.filter(success=True).count(),
            'failed': type_notifications.filter(success=False).count()
        }

    # Overall stats
    all_notifications = NotificationLog.objects.all()
    stats['overall'] = {
        'total': all_notifications.count(),
        'successful': all_notifications.filter(success=True).count(),
        'failed': all_notifications.filter(success=False).count()
    }

    # Opted-in users count
    stats['opted_in_users'] = User.objects.exclude(
        notification_token__isnull=True
    ).exclude(
        notification_token__exact=""
    ).count()

    return Response(stats)


@api_view(['GET'])
def check_user_notifications(request):
    """
    Check if a user will receive notifications.
    Useful for debugging opt-in/opt-out issues.

    Query params:
        email: User's email address

    Example:
        /api/notifications/check/?email=user@purdue.edu
    """
    email = request.query_params.get('email')
    if not email:
        return Response({"error": "email parameter required"}, status=400)

    try:
        user = User.objects.get(email=email)

        # Check if user has notification token
        has_token = bool(
            user.notification_token and user.notification_token.strip())

        # Get recent notifications for this user
        recent_notifications = NotificationLog.objects.filter(user=user)[:5]

        return Response({
            'email': user.email,
            'name': user.name,
            'opted_in': has_token,
            'notification_token': user.notification_token[:20] + '...' if has_token else None,
            'recent_notifications': NotificationLogSerializer(recent_notifications, many=True).data
        })

    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=404)


@api_view(['GET', 'POST'])
# TODO: tighten to IsAuthenticated once auth is finalized
@permission_classes([AllowAny])
def closure_notifications_toggle(request):
    """
    Get or set user's closure notification preference.
    Used by User Story #11 - Opt-in/opt-out for closure alerts.

    GET:  /closure-notifications/?email=<email>
    POST: { email, enabled: true/false }

    Returns:
        closure_notifications_enabled: boolean
    """
    email = request.data.get(
        "email") if request.method == 'POST' else request.query_params.get("email")
    if not email:
        return Response({"detail": "email required"}, status=400)

    user = User.objects.filter(email=email).first()
    if not user:
        return Response({"detail": "user not found"}, status=404)

    if request.method == 'GET':
        return Response({
            "closure_notifications_enabled": user.closure_notifications_enabled
        })

    # POST - update preference
    enabled = request.data.get("enabled", True)
    user.closure_notifications_enabled = bool(enabled)
    user.save(update_fields=["closure_notifications_enabled"])

    return Response({
        "status": "ok",
        "closure_notifications_enabled": user.closure_notifications_enabled
    })


DUMMY_GARAGE_DETAILS = {
    "address": "123 Grant St, West Lafayette, IN 47906",
    "coordinates": {"lat": 40.4240, "lng": -86.9138},
    "hours": {
        "mon_fri": "24/7",
        "sat": "24/7",
        "sun": "24/7",
    },
    "rates": {
        "per_hour": 2.0,
        "daily_max": 12.0,
        "free_after": None,
    },
    "amenities": {
        "ev_chargers": 8,
        "accessible_spots": 12,
        "restrooms": True,
        "security": "Cameras and patrol",
        "elevators": True,
    },
    "restrictions": {
        "height_clearance_ft": 7.0,
        "permit_required": False,
        "overnight_allowed": True,
    },
    "features": {
        "covered": True,
        "shaded": True,
        "heated": False,
        "bike_parking": True,
    },
    "levels": [
        {"level": "B1", "total": 120, "available": 18, "covered": True},
        {"level": "L1", "total": 150, "available": 25, "covered": True},
        {"level": "L2", "total": 150, "available": 31, "covered": True},
        {"level": "Roof", "total": 100, "available": 12, "covered": False},
    ],
}


def _compute_totals(levels):
    total = sum(l["total"] for l in levels)
    available = sum(l["available"] for l in levels)
    occupied = max(total - available, 0)
    pct_available = round((available / total) * 100, 1) if total else 0.0
    return total, available, occupied, pct_available


def _mock_occupancy_series(minutes=60, step=10, base_available=86, jitter=5):
    now = datetime.utcnow()
    points = []
    for i in range(0, minutes + 1, step):
        t = now - timedelta(minutes=i)
        # deterministic wobble for stable dummy output
        wobble = ((i // step) % (jitter * 2)) - jitter
        points.append({
            "ts_utc": t.replace(microsecond=0).isoformat() + "Z",
            "available": max(base_available + wobble, 0),
        })
    return list(reversed(points))


@api_view(["GET"])
def get_garage_detail(request, garage_id: int):
    """
    Return a single garage with rich dummy data.
    Path param: garage_id (int)
    Example response fields include totals, levels, features, and a short occupancy series.
    """
    # Find the garage skeleton from PARKING_LOTS
    garage = next((g for g in PARKING_LOTS if g["id"] == int(garage_id)), None)
    if not garage:
        return Response(
            {"detail": f"Garage with id {garage_id} not found"},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Clone the base dummy template per garage and adjust a few values to feel unique
    details = dict(DUMMY_GARAGE_DETAILS)  # shallow copy
    levels = [dict(l) for l in DUMMY_GARAGE_DETAILS["levels"]]

    # Light per-garage customization
    name = garage["name"]
    if "Harrison" in name:
        details["address"] = "504 Northwestern Ave, West Lafayette, IN 47906"
        details["features"]["covered"] = True
        levels[0]["available"] = 10
        levels[-1]["available"] = 20
    elif "Grant Street" in name:
        details["address"] = "120 N Grant St, West Lafayette, IN 47906"
        details["amenities"]["ev_chargers"] = 12
        details["features"]["shaded"] = True
    elif "University Street" in name:
        details["address"] = "504 University St, West Lafayette, IN 47906"
        details["restrictions"]["height_clearance_ft"] = 6.8
        details["features"]["covered"] = False
        for l in levels:
            l["covered"] = False
    elif "Northwestern" in name:
        details["address"] = "220 Northwestern Ave, West Lafayette, IN 47906"
        details["rates"]["per_hour"] = 1.5
    elif "DS/AI" in name:
        details["address"] = "Discovery Park Lot, West Lafayette, IN 47907"
        details["features"]["covered"] = False
        details["features"]["shaded"] = False
        levels = [
            {"level": "Surface", "total": 220, "available": 64, "covered": False}
        ]

    total, available, occupied, pct_available = _compute_totals(levels)

    payload = {
        "id": garage["id"],
        "name": name,
        "redis_key": garage["redis_key"],
        "address": details["address"],
        "coordinates": details["coordinates"],
        "hours": details["hours"],
        "rates": details["rates"],
        "amenities": details["amenities"],
        "restrictions": details["restrictions"],
        "features": details["features"],
        "levels": levels,
        "totals": {
            "capacity": total,
            "available": available,
            "occupied": occupied,
            "pct_available": pct_available,
        },
        "availability": {
            "last_updated_utc": datetime.utcnow().replace(microsecond=0).isoformat() + "Z",
            "series": _mock_occupancy_series(base_available=available),
        },
        "notices": [
            # examples of runtime messages you might surface in the UI
            {"type": "info", "message": "Elevator maintenance on L2 from 2 pm to 4 pm"},
            {"type": "advice", "message": "EV chargers busiest 11 am to 2 pm"},
        ],
    }

    return Response(payload, status=status.HTTP_200_OK)


# Simple icon names your frontend can map to real assets
ICON_MAP = {
    "covered": "shield-roof",
    "uncovered": "shield-off",
    "shaded": "tree",
    "unshaded": "sun",
}


def _derive_indicators_from_levels(levels):
    """Compute lot level indicators from a list of level dicts."""
    total = sum(l["total"] for l in levels) or 0
    total_available = sum(l["available"] for l in levels) or 0

    covered_total = sum(l["total"] for l in levels if l.get("covered"))
    covered_available = sum(l["available"] for l in levels if l.get("covered"))

    uncovered_total = total - covered_total
    uncovered_available = total_available - covered_available

    pct_available = round((total_available / total) * 100, 1) if total else 0.0
    pct_available_covered = round(
        (covered_available / covered_total) * 100, 1) if covered_total else 0.0
    pct_available_uncovered = round(
        (uncovered_available / uncovered_total) * 100, 1) if uncovered_total else 0.0

    has_any_covered = covered_total > 0
    has_any_uncovered = uncovered_total > 0

    return {
        "totals": {
            "capacity": total,
            "available": total_available,
            "pct_available": pct_available,
            "covered_capacity": covered_total,
            "covered_available": covered_available,
            "covered_pct_available": pct_available_covered,
            "uncovered_capacity": uncovered_total,
            "uncovered_available": uncovered_available,
            "uncovered_pct_available": pct_available_uncovered,
        },
        "flags": {
            "has_covered": has_any_covered,
            "has_uncovered": has_any_uncovered,
        },
    }


def _label_for_coverage(has_covered: bool, has_uncovered: bool):
    """Human friendly label and icon for coverage."""
    if has_covered and not has_uncovered:
        return {"label": "Covered", "icon": ICON_MAP["covered"]}
    if not has_covered and has_uncovered:
        return {"label": "Uncovered", "icon": ICON_MAP["uncovered"]}
    if has_covered and has_uncovered:
        # choose one icon for mixed
        return {"label": "Mixed", "icon": ICON_MAP["covered"]}
    return {"label": "Unknown", "icon": ICON_MAP["uncovered"]}


def _boolean_to_label(flag: bool, true_label="Yes", false_label="No"):
    return true_label if flag else false_label


@api_view(["GET"])
def get_garage_shade_cover(request, garage_id: int):
    """
    Returns shade and cover indicators for one garage:
    - top level labels for covered and shaded
    - per level coverage
    - availability split by covered vs uncovered
    """
    # Reuse the same per garage detail builder you added earlier
    # If you named it differently, import or adjust below call
    # this returns a DRF Response
    detail_resp = get_garage_detail(request, garage_id)
    if detail_resp.status_code != status.HTTP_200_OK:
        return detail_resp

    data = detail_resp.data
    features = data.get("features", {})
    levels = data.get("levels", [])

    analysis = _derive_indicators_from_levels(levels)
    has_covered = analysis["flags"]["has_covered"]
    has_uncovered = analysis["flags"]["has_uncovered"]
    coverage_label = _label_for_coverage(has_covered, has_uncovered)

    shaded_flag = bool(features.get("shaded", False))
    shaded_label = {
        "label": _boolean_to_label(shaded_flag, "Shaded", "Unshaded"),
        "icon": ICON_MAP["shaded"] if shaded_flag else ICON_MAP["unshaded"],
    }

    # Per level simplified indicators
    per_level = [
        {
            "level": l["level"],
            "covered": bool(l.get("covered", False)),
            "label": "Covered" if l.get("covered", False) else "Uncovered",
            "available": l.get("available", 0),
            "total": l.get("total", 0),
        }
        for l in levels
    ]

    payload = {
        "id": data["id"],
        "name": data["name"],
        "coverage": {
            "label": coverage_label["label"],
            "icon": coverage_label["icon"],
            "has_covered": has_covered,
            "has_uncovered": has_uncovered,
        },
        "shade": {
            "label": shaded_label["label"],
            "icon": shaded_label["icon"],
            "shaded": shaded_flag,
        },
        "availability_split": analysis["totals"],
        "levels": per_level,
        # optional quick badges your UI can render directly
        "badges": [
            {"type": "coverage",
                "text": coverage_label["label"], "icon": coverage_label["icon"]},
            {"type": "shade",
                "text": shaded_label["label"], "icon": shaded_label["icon"]},
        ],
    }
    return Response(payload, status=status.HTTP_200_OK)


@api_view(["GET"])
def list_shade_cover_indicators(request):
    """
    Returns shade and cover badges for all garages.
    Useful for list and map screens.
    """
    results = []
    for g in PARKING_LOTS:
        # call the detail builder to keep the single source of truth
        detail_resp = get_garage_detail(request, g["id"])
        if detail_resp.status_code != status.HTTP_200_OK:
            continue
        data = detail_resp.data
        features = data.get("features", {})
        levels = data.get("levels", [])
        analysis = _derive_indicators_from_levels(levels)

        has_covered = analysis["flags"]["has_covered"]
        has_uncovered = analysis["flags"]["has_uncovered"]
        coverage_label = _label_for_coverage(has_covered, has_uncovered)

        shaded_flag = bool(features.get("shaded", False))
        shaded_label = "Shaded" if shaded_flag else "Unshaded"

        results.append({
            "id": data["id"],
            "name": data["name"],
            "coverage": coverage_label["label"],
            "coverage_icon": coverage_label["icon"],
            "shade": shaded_label,
            "shade_icon": ICON_MAP["shaded"] if shaded_flag else ICON_MAP["unshaded"],
            # small useful bits for UI sorting or badges
            "pct_available": analysis["totals"]["pct_available"],
            "covered_pct_available": analysis["totals"]["covered_pct_available"],
            "uncovered_pct_available": analysis["totals"]["uncovered_pct_available"],
        })
    return Response({"garages": results}, status=status.HTTP_200_OK)
