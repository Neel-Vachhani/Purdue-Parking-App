from exponent_server_sdk import (
    DeviceNotRegisteredError,
    PushClient,
    PushMessage,
    PushServerError,
    PushTicketError,
)
import os
import requests
from requests.exceptions import ConnectionError, HTTPError
import rollbar

ROLLBAR_TOKEN = os.getenv("ROLLBAR_ACCESS_TOKEN")
ROLLBAR_ENV = os.getenv("ROLLBAR_ENV", os.getenv("ENVIRONMENT", "development"))

if ROLLBAR_TOKEN:
    rollbar.init(ROLLBAR_TOKEN, environment=ROLLBAR_ENV)


def _report_exc(extra_data=None):
    if ROLLBAR_TOKEN:
        rollbar.report_exc_info(extra_data=extra_data)

# Optionally providing an access token within a session if you have enabled push security
session = requests.Session()
session.headers.update(
    {
        "Authorization": f"Bearer {os.getenv('EXPO_TOKEN', '')}",
        "accept": "application/json",
        "accept-encoding": "gzip, deflate",
        "content-type": "application/json",
    }
)

# Basic arguments. You should extend this function with the push features you
# want to use, or simply pass in a `PushMessage` object.


def send_push_message(token, message, extra=None):
    try:
        response = PushClient(session=session).publish(
            PushMessage(to=token,
                        body=message,
                        data=extra))
    except PushServerError as exc:
        # Encountered some likely formatting/validation error.
        _report_exc(
            extra_data={
                'token': token,
                'message': message,
                'extra': extra,
                'errors': exc.errors,
                'response_data': exc.response_data,
            })
        raise
    except (ConnectionError, HTTPError) as exc:
        # Encountered some Connection or HTTP error - retry a few times in
        # case it is transient.
        _report_exc(extra_data={'token': token, 'message': message, 'extra': extra})
        raise

    try:
        # We got a response back, but we don't know whether it's an error yet.
        # This call raises errors so we can handle them with normal exception
        # flows.
        response.validate_response()
    except DeviceNotRegisteredError:
        # Mark the push token as inactive by clearing it from user
        from boiler_park_backend.models import User
        User.objects.filter(notification_token=token).update(notification_token=None)
    except PushTicketError as exc:
        # Encountered some other per-notification error.
        _report_exc(
            extra_data={
                'token': token,
                'message': message,
                'extra': extra,
                'push_response': exc.push_response._asdict(),
            })
        raise
