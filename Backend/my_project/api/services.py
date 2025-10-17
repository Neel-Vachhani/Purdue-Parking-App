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
from boiler_park_backend.models import Events


def open_file_calendar():
    filepath = '/Users/georgesamra/Purdue-Parking-App/test.ics'
    ics_path = Path(filepath)
    calendar = icalendar.Calendar.from_ical(ics_path.read_bytes())
    events = recurring_ical_events.of(calendar).between(pytz.UTC.localize(
        datetime.now()), pytz.UTC.localize(datetime.now() + timedelta(days=7)))
    event_array = []
    for event in events:
        if event.decoded("DTEND") > pytz.UTC.localize(datetime.now()):
            db_event = Events(
                title=event.get("Summary"),
                description=event.get("DESCRIPTION"),
                start_time=event.decoded("DTSTART").time(),
                end_time=event.decoded("DTEND").time(),
                dates=[event.decoded("DTSTART").date()],
                location=event.get("LOCATION"),
            )
            db_event.save()
            event_array.append([event.get("Summary"), event.get("LOCATION"), event.decoded("DTSTART"),
                                event.decoded("DTEND")])
    return event_array


def open_subscription_calendar(calendar_url):
    url = calendar_url
    url = config('GEORGE_CALENDAR_URL')  # TODO remove before using in prod
    calendar = Calendar(requests.get(url).text)
    event_array = []
    for item in sorted(calendar.events, reverse=False):
        if item.end > pytz.UTC.localize(datetime.now()):
            event_array.append([item.name, item.begin, item.end,
                                item.location, item.description])

    # print(item.name, item.begin, item.end,
    #      item.location, item.description)
    print(event_array)
    return (event_array)


def analyze_calendar(ics):
    #
    pass


if __name__ == "__main__":
    # open_file_calendar()
    open_subscription_calendar("asf")
