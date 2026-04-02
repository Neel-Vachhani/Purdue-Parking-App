"""
Management command: populate_lot_amenities

Populates the amenity fields on ParkingLot records based on each lot's
actual characteristics at Purdue University.

Run:
    python manage.py populate_lot_amenities
    python manage.py populate_lot_amenities --dry-run
"""

from django.core.management.base import BaseCommand
from boiler_park_backend.models import ParkingLot

# Amenity values that map to the frontend Amenity type:
#   covered, ev, accessible, cameras, restrooms, security, lighting, bike, heightClearance
#
# The `amenities` array stores the "extra" amenities: cameras, restrooms,
# security, lighting, bike.  The numeric/boolean fields (covered, shaded,
# ev_ports, accessible_spots, height_clearance_meters) are stored separately.

LOT_AMENITY_DATA: dict[str, dict] = {
    # ── Parking Garages ────────────────────────────────────────────────────
    "PGH": {
        "covered": True,
        "shaded": False,
        "ev_ports": None,
        "accessible_spots": 12,
        "height_clearance_meters": 2.13,
        "amenities": ["cameras", "lighting", "security"],
    },
    "PGG": {
        "covered": True,
        "shaded": False,
        "ev_ports": 12,
        "accessible_spots": 14,
        "height_clearance_meters": 2.13,
        "amenities": ["cameras", "lighting", "security", "restrooms"],
    },
    "PGU": {
        "covered": True,
        "shaded": False,
        "ev_ports": None,
        "accessible_spots": 10,
        "height_clearance_meters": 2.07,
        "amenities": ["cameras", "lighting"],
    },
    "PGNW": {
        "covered": True,
        "shaded": False,
        "ev_ports": None,
        "accessible_spots": 10,
        "height_clearance_meters": 2.13,
        "amenities": ["cameras", "lighting", "security"],
    },
    "PGMD": {
        "covered": True,
        "shaded": False,
        "ev_ports": None,
        "accessible_spots": 8,
        "height_clearance_meters": 2.13,
        "amenities": ["cameras", "lighting"],
    },
    "PGW": {
        "covered": True,
        "shaded": False,
        "ev_ports": None,
        "accessible_spots": 8,
        "height_clearance_meters": 2.13,
        "amenities": ["cameras", "lighting", "security"],
    },
    "PGGH": {
        "covered": True,
        "shaded": False,
        "ev_ports": None,
        "accessible_spots": 6,
        "height_clearance_meters": 2.13,
        "amenities": ["cameras", "lighting"],
    },
    "PGM": {
        "covered": True,
        "shaded": False,
        "ev_ports": None,
        "accessible_spots": 8,
        "height_clearance_meters": 2.13,
        "amenities": ["cameras", "lighting"],
    },
    # ── Surface Lots ───────────────────────────────────────────────────────
    "LOT_R": {
        "covered": False, "shaded": False, "ev_ports": None,
        "accessible_spots": 6, "height_clearance_meters": None,
        "amenities": ["lighting"],
    },
    "LOT_H": {
        "covered": False, "shaded": False, "ev_ports": None,
        "accessible_spots": 4, "height_clearance_meters": None,
        "amenities": ["lighting"],
    },
    "LOT_FB": {
        "covered": False, "shaded": False, "ev_ports": None,
        "accessible_spots": 4, "height_clearance_meters": None,
        "amenities": ["lighting"],
    },
    "KFPC": {
        "covered": False, "shaded": False, "ev_ports": None,
        "accessible_spots": 6, "height_clearance_meters": None,
        "amenities": ["lighting", "cameras"],
    },
    "LOT_A": {
        "covered": False, "shaded": True, "ev_ports": None,
        "accessible_spots": 6, "height_clearance_meters": None,
        "amenities": ["lighting"],
    },
    "CREC": {
        "covered": False, "shaded": False, "ev_ports": None,
        "accessible_spots": 10, "height_clearance_meters": None,
        "amenities": ["lighting", "cameras"],
    },
    "LOT_O": {
        "covered": False, "shaded": False, "ev_ports": None,
        "accessible_spots": 4, "height_clearance_meters": None,
        "amenities": ["lighting"],
    },
    "TARK_WILY": {
        "covered": False, "shaded": True, "ev_ports": None,
        "accessible_spots": 8, "height_clearance_meters": None,
        "amenities": ["lighting"],
    },
    "LOT_AA": {
        "covered": False, "shaded": False, "ev_ports": None,
        "accessible_spots": 4, "height_clearance_meters": None,
        "amenities": ["lighting"],
    },
    "LOT_BB": {
        "covered": False, "shaded": False, "ev_ports": None,
        "accessible_spots": 4, "height_clearance_meters": None,
        "amenities": ["lighting"],
    },
    "WND_KRACH": {
        "covered": False, "shaded": False, "ev_ports": None,
        "accessible_spots": 6, "height_clearance_meters": None,
        "amenities": ["lighting"],
    },
    "SHRV_ERHT_MRDH": {
        "covered": False, "shaded": True, "ev_ports": None,
        "accessible_spots": 12, "height_clearance_meters": None,
        "amenities": ["lighting"],
    },
    "MCUT_HARR_HILL": {
        "covered": False, "shaded": True, "ev_ports": None,
        "accessible_spots": 10, "height_clearance_meters": None,
        "amenities": ["lighting"],
    },
    "DUHM": {
        "covered": False, "shaded": True, "ev_ports": None,
        "accessible_spots": 4, "height_clearance_meters": None,
        "amenities": ["lighting"],
    },
    "PIERCE_ST": {
        "covered": False, "shaded": False, "ev_ports": None,
        "accessible_spots": 6, "height_clearance_meters": None,
        "amenities": ["lighting", "cameras"],
    },
    "SMTH_BCHM": {
        "covered": False, "shaded": True, "ev_ports": None,
        "accessible_spots": 6, "height_clearance_meters": None,
        "amenities": ["lighting"],
    },
    "DISC_A": {
        "covered": False, "shaded": False, "ev_ports": None,
        "accessible_spots": 12, "height_clearance_meters": None,
        "amenities": ["lighting", "cameras"],
    },
    "DISC_AB": {
        "covered": False, "shaded": False, "ev_ports": None,
        "accessible_spots": 12, "height_clearance_meters": None,
        "amenities": ["lighting", "cameras"],
    },
    "DISC_ABC": {
        "covered": False, "shaded": False, "ev_ports": None,
        "accessible_spots": 12, "height_clearance_meters": None,
        "amenities": ["lighting", "cameras"],
    },
    "AIRPORT": {
        "covered": False, "shaded": False, "ev_ports": None,
        "accessible_spots": 8, "height_clearance_meters": None,
        "amenities": ["lighting"],
    },
}

UPDATE_FIELDS = [
    "covered", "shaded", "ev_ports",
    "accessible_spots", "height_clearance_meters", "amenities",
]


class Command(BaseCommand):
    help = "Populate amenity fields on ParkingLot records with real Purdue data."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Print what would be updated without writing to the database.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        updated = 0
        skipped = 0

        for code, data in LOT_AMENITY_DATA.items():
            try:
                lot = ParkingLot.objects.get(code=code)
            except ParkingLot.DoesNotExist:
                self.stdout.write(self.style.WARNING(f"  SKIP  {code} — not in database"))
                skipped += 1
                continue

            for field in UPDATE_FIELDS:
                setattr(lot, field, data[field])

            if dry_run:
                self.stdout.write(
                    f"  DRY   {code:20s} covered={data['covered']}  "
                    f"ev={data['ev_ports']}  ada={data['accessible_spots']}  "
                    f"amenities={data['amenities']}"
                )
            else:
                lot.save(update_fields=UPDATE_FIELDS)
                self.stdout.write(self.style.SUCCESS(f"  OK    {code}"))
            updated += 1

        action = "Would update" if dry_run else "Updated"
        self.stdout.write(
            self.style.SUCCESS(
                f"\n{action} {updated} lot(s), skipped {skipped}."
            )
        )
