import icalendar
from ics import Calendar
import requests
from pathlib import Path
from decouple import config
import pytz


def open_calendar():
    # filepath = '/Users/georgesamra/Purdue-Parking-App/Backend/my_project/api/calendar_test.ics'
    # ics_path = Path(filepath)
    # calendar = icalendar.Calendar.from_ical(ics_path.read_bytes())
    # for event in calendar.events:
    # print(event.get("Summary"))
    # print(event.decoded("DTSTART"))
    # print(event.decoded("DTEND"))
    # print(event.get)
    url = config('GEORGE_CALENDAR_URL')
    calendar = Calendar(requests.get(url).text)
    for item in sorted(calendar.events, reverse=False):
        print(item.name, item.begin, item.end, item.location)


def analyze_calendar(ics):
    #
    pass


if __name__ == "__main__":
    open_calendar()
