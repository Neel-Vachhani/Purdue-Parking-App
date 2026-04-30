from typing import Dict, Any

# Floor spacing: average 10-12 ft, default 11 ft.
FLOOR_HEIGHT_FEET_DEFAULT = 11.0
FLOOR_HEIGHT_METERS_DEFAULT = FLOOR_HEIGHT_FEET_DEFAULT * 0.3048

# Ground elevation values are placeholders and should be replaced with
# measured data for production accuracy.
# Values are meters above sea level.
GARAGE_ELEVATION_PROFILES: Dict[str, Dict[str, Any]] = {
    "PGH": {
        "name": "Harrison Street Parking Garage",
        "lat": 40.420928743577996,
        "lng": -86.91759020145541,
        "ground_elevation_m": 191.0,
        "floor_height_m": FLOOR_HEIGHT_METERS_DEFAULT,
        "max_floors": 5,
        "has_roof": True,
    },
    "PGU": {
        "name": "University Street Parking Garage",
        "lat": 40.4266903911869,
        "lng": -86.91728093292815,
        "ground_elevation_m": 191.0,
        "floor_height_m": FLOOR_HEIGHT_METERS_DEFAULT,
        "max_floors": 5,
        "has_roof": True,
    },
    "PGNW": {
        "name": "Northwestern Avenue Parking Garage",
        "lat": 40.42964447741563,
        "lng": -86.91111021483658,
        "ground_elevation_m": 198.0,
        "floor_height_m": FLOOR_HEIGHT_METERS_DEFAULT,
        "max_floors": 5,
        "has_roof": True,
    },
    "PGMD": {
        "name": "McCutcheon Drive Parking Garage",
        "lat": 40.43185,
        "lng": -86.91445,
        "ground_elevation_m": 195.0,
        "floor_height_m": FLOOR_HEIGHT_METERS_DEFAULT,
        "max_floors": 5,
        "has_roof": True,
    },
    "PGW": {
        "name": "Wood Street Parking Garage",
        "lat": 40.42785,
        "lng": -86.91885,
        "ground_elevation_m": 191.0,
        "floor_height_m": FLOOR_HEIGHT_METERS_DEFAULT,
        "max_floors": 5,
        "has_roof": True,
    },
    "PGG": {
        "name": "Grant Street Parking Garage",
        "lat": 40.42519706999441,
        "lng": -86.90972814560583,
        "ground_elevation_m": 192.0,
        "floor_height_m": FLOOR_HEIGHT_METERS_DEFAULT,
        "max_floors": 5,
        "has_roof": True,
    },
}


ELEVATION_PROFILE_CODES = set(GARAGE_ELEVATION_PROFILES.keys())
