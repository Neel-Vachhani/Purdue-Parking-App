import icalendar
from ics import Calendar
import requests
from pathlib import Path
from decouple import config
import pytz


def open_file_calendar():
    filepath = '/Users/georgesamra/Purdue-Parking-App/test.ics'
    ics_path = Path(filepath)
    calendar = icalendar.Calendar.from_ical(ics_path.read_bytes())
    for event in calendar.events:
        print(event.get("Summary"))
        print(event.get("Location"))
        print(event.decoded("DTSTART"))
        print(event.decoded("DTEND"))


def open_subscription_calendar(calendar_url):
    url = calendar_url
    url = config('GEORGE_CALENDAR_URL')  # TODO remove before using in prod
    calendar = Calendar(requests.get(url).text)
    for item in sorted(calendar.events, reverse=False):
        if "CS" in item.name:
            print(item.name, item.begin, item.end,
                  item.location, item.description)


def analyze_calendar(ics):
    #
    pass


if __name__ == "__main__":
    open_file_calendar()
    # open_subscription_calendar("asf")
