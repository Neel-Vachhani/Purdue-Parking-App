import time
from datetime import datetime, timedelta
import icalendar
from ics import Calendar
import recurring_ical_events
import requests
from pathlib import Path
from decouple import config
import pytz
from django.utils import timezone
import jwt
import requests
import json
from jwt.algorithms import RSAAlgorithm
from django.core.cache import cache
from django.conf import settings             



def open_file_calendar():
    filepath = '/Users/georgesamra/Purdue-Parking-App/test.ics'
    ics_path = Path(filepath)
    calendar = icalendar.Calendar.from_ical(ics_path.read_bytes())
    events = recurring_ical_events.of(calendar).between(pytz.UTC.localize(
        datetime.now()), pytz.UTC.localize(datetime.now() + timedelta(days=7)))
    event_array = []
    for event in events:
        print(event.get("Summary"))
        print(event.get("LOCATION"))
        print(event.decoded("DTSTART"))
        print(event.decoded("DTEND"))
        event_array.append([event.get("Summary"), event.get("LOCATION"), event.decoded("DTSTART"),
                            event.decoded("DTEND")])
    return event_array


def open_subscription_calendar(calendar_url):
    url = calendar_url
    url = config('GEORGE_CALENDAR_URL')  # TODO remove before using in prod
    calendar = Calendar(requests.get(url).text)
    for item in sorted(calendar.events, reverse=False):
        # if item.end > pytz.UTC.localize(datetime.now()):
        print(item)
    # print(item.name, item.begin, item.end,
    #      item.location, item.description)
    

APPLE_JWKS_URL = "https://appleid.apple.com/auth/keys"
APPLE_ISSUER = "https://appleid.apple.com"
APPLE_AUDIENCE = "com.team6.boilerpark" 



JWKS_URL = "https://appleid.apple.com/auth/keys"
JWKS_CACHE_KEY = "apple_jwks"
JWKS_TTL = 60 * 60 * 12  # 12 hours cache

def _get_apple_jwks():
    """Fetch and cache Apple's JWKS for verifying identity tokens."""
    jwks = cache.get(JWKS_CACHE_KEY)
    if jwks:
        return jwks

    resp = requests.get(JWKS_URL, timeout=5)
    resp.raise_for_status()
    jwks = resp.json()
    cache.set(JWKS_CACHE_KEY, jwks, JWKS_TTL)
    return jwks



def verify_apple_identity(identity_token: str) -> dict:
    unverified_header = jwt.get_unverified_header(identity_token)
    kid = unverified_header.get("kid")
    alg = unverified_header.get("alg")

    jwks = _get_apple_jwks()
    key = next(
        (RSAAlgorithm.from_jwk(json.dumps(k)) for k in jwks.get("keys", [])
         if k.get("kid") == kid and k.get("alg") == alg),
        None
    )
    if key is None:
        raise jwt.InvalidTokenError("No matching Apple public key")

    # Accept both your app bundle and Expo Go
    app_aud = getattr(settings, "APPLE_AUDIENCE", "com.your.bundle")
    audiences = [app_aud, "host.exp.Exponent"]   # 👈 allow Expo Go
    issuer = "https://appleid.apple.com"

    return jwt.decode(
        identity_token,
        key=key,
        algorithms=[alg],
        audience=audiences,   # 👈 list
        issuer=issuer,
        options={"verify_exp": True},
    )



def issue_session_token(user):
    """
    Stub for creating a token (replace with your own JWT/session creation).
    """
    # If you’re using DRF SimpleJWT:
    # from rest_framework_simplejwt.tokens import RefreshToken
    # refresh = RefreshToken.for_user(user)
    # return str(refresh.access_token)

    # Temporary dev token:
    return f"apple_{user.id}_session"



def analyze_calendar(ics):
    #
    pass


if __name__ == "__main__":
    open_file_calendar()
    # open_subscription_calendar("asf")
