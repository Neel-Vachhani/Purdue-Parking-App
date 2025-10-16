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


def open_file_calendar():
    filepath = '/Users/georgesamra/Purdue-Parking-App/test.ics'
    ics_path = Path(filepath)
    calendar = icalendar.Calendar.from_ical(ics_path.read_bytes())
    events = recurring_ical_events.of(calendar).between(pytz.UTC.localize(
        datetime.now()), pytz.UTC.localize(datetime.now() + timedelta(days=7)))
    for event in events:
        print(event.get("Summary"))
        print(event.decoded("DTSTART"))
        print(event.decoded("DTEND"))


def open_subscription_calendar(calendar_url):
    url = calendar_url
    url = config('GEORGE_CALENDAR_URL')  # TODO remove before using in prod
    calendar = Calendar(requests.get(url).text)
    for item in sorted(calendar.events, reverse=False):
        # if item.end > pytz.UTC.localize(datetime.now()):
        print(item)
    # print(item.name, item.begin, item.end,
    #      item.location, item.description)


def analyze_calendar(ics):
    #
    pass


if __name__ == "__main__":
    open_file_calendar()
    # open_subscription_calendar("asf")
