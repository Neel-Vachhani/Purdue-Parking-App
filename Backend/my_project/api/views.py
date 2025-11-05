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
from boiler_park_backend.models import Item, User, LotEvent, NotificationLog
from .serializers import ItemSerializer, UserSerializer, LotEventSerializer, NotificationLogSerializer
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
        email= provided_email if provided_email else f"apple_{apple_sub[:16]}",
        name= f"apple_{apple_sub[:16]}",
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
    push_token = request.data.get('push_token')  # Get from raw data, not validated

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
@permission_classes([AllowAny])  # TODO: tighten to IsAuthenticated with session once auth flow is finalized
def user_origin(request):
    """Get or set the user's default origin address.

    GET:  /user/origin/?email=<email>
    POST: { email, default_origin }
    """
    email = request.data.get("email") if request.method == 'POST' else request.query_params.get("email")
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
    email = request.data.get("email") or request.data.get("username")  # Support both for backwards compatibility
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
            logger.error(f"Failed to send test notification to {email}: {error_msg}")
            
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
    qs = LotEvent.objects.filter(lot_code__iexact=lot_code, end_time__gte=now()).order_by('start_time')[:100]
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
    users = User.objects.exclude(notification_token__isnull=True).exclude(notification_token__exact="")
    
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
        notifications = notifications.filter(notification_type=notification_type)
    
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
        type_notifications = NotificationLog.objects.filter(notification_type=type_code)
        
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
        has_token = bool(user.notification_token and user.notification_token.strip())
        
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
@permission_classes([AllowAny])  # TODO: tighten to IsAuthenticated once auth is finalized
def closure_notifications_toggle(request):
    """
    Get or set user's closure notification preference.
    Used by User Story #11 - Opt-in/opt-out for closure alerts.
    
    GET:  /closure-notifications/?email=<email>
    POST: { email, enabled: true/false }
    
    Returns:
        closure_notifications_enabled: boolean
    """
    email = request.data.get("email") if request.method == 'POST' else request.query_params.get("email")
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
