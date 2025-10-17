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
    print(calendar)


if __name__ == "__main__":
    open_file_calendar()
    # open_subscription_calendar("asf")
