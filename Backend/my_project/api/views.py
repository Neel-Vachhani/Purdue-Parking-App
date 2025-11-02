import logging
from typing import List, Dict, Any, Optional

import bcrypt
from httpcore import Response
import redis
from decouple import config
from redis.exceptions import RedisError
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework import status, serializers
from rest_framework.permissions import AllowAny
from boiler_park_backend.models import Item, User
from .serializers import ItemSerializer, UserSerializer
from .services import verify_apple_identity, issue_session_token
import jwt
from datetime import datetime, timedelta




logger = logging.getLogger(__name__)


PARKING_LOTS: List[Dict[str, Any]] = [
    {"id": 1, "name": "Harrison Garage", "redis_key": "PGH_availability"},
    {"id": 2, "name": "Grant Street Garage", "redis_key": "PGG_availability"},
    {"id": 3, "name": "University Street Garage", "redis_key": "PGU_availability"},
    {"id": 4, "name": "Northwestern Garage", "redis_key": "PGNW_availability"},
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
    pct_available_covered = round((covered_available / covered_total) * 100, 1) if covered_total else 0.0
    pct_available_uncovered = round((uncovered_available / uncovered_total) * 100, 1) if uncovered_total else 0.0

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
        return {"label": "Mixed", "icon": ICON_MAP["covered"]}  # choose one icon for mixed
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
    detail_resp = get_garage_detail(request, garage_id)  # this returns a DRF Response
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
            {"type": "coverage", "text": coverage_label["label"], "icon": coverage_label["icon"]},
            {"type": "shade", "text": shaded_label["label"], "icon": shaded_label["icon"]},
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

