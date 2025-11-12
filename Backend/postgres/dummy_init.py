import psycopg2
from decouple import config
from random import randint
from datetime import datetime, timedelta

# --- Connect to Postgres ---
conn = psycopg2.connect(
    host=config("DB_HOST"),
    port=config("DB_PORT"),
    database=config("DB_NAME"),
    user=config("DB_USERNAME"),
    password=config("DB_PASSWORD")
)
cursor = conn.cursor()

# --- Clear existing data ---
cursor.execute("DELETE FROM parking_availability_data;")
conn.commit()
print("Cleared all existing rows.")

# --- Garage columns and max capacities ---
garage_columns = {
    "pgmd_availability": 150,
    "pgu_availability": 826,
    "pgnw_availability": 434,
    "pgg_availability": 648,
    "pgw_availability": 200,
    "pggh_availability": 130,
    "pgh_availability": 800,
    "lot_r_availability": 120,
    "lot_h_availability": 80,
    "lot_fb_availability": 100,
    "kfpc_availability": 100,
    "lot_a_availability": 120,
    "crec_availability": 150,
    "lot_o_availability": 100,
    "tark_wily_availability": 100,
    "lot_aa_availability": 100,
    "lot_bb_availability": 80,
    "wnd_krach_availability": 100,
    "shrv_erht_mrdh_availability": 120,
    "mcut_harr_hill_availability": 100,
    "duhm_availability": 60,
    "pierce_st_availability": 100,
    "pgm_availability": 200,
    "smth_bchm_availability": 120,
    "disc_a_availability": 100,
    "disc_ab_availability": 100,
    "disc_abc_availability": 100,
    "airport_availability": 80
}

# --- Generate hourly dummy data for last 30 days ---
rows_to_insert = []
for day_offset in range(30):
    for hour in range(24):
        timestamp = datetime.now() - timedelta(days=(29 - day_offset), hours=(23 - hour))
        row = [timestamp]
        for lot, capacity in garage_columns.items():
            # Random occupancy between 10% and 90% of capacity
            row.append(randint(int(capacity*0.1), int(capacity*0.9)))
        rows_to_insert.append(tuple(row))

# --- Build query ---
columns = ", ".join(["timestamp"] + list(garage_columns.keys()))
placeholders = ", ".join(["%s"] * (1 + len(garage_columns)))
insert_query = f"INSERT INTO parking_availability_data ({columns}) VALUES ({placeholders})"

# --- Insert all rows ---
cursor.executemany(insert_query, rows_to_insert)
conn.commit()
cursor.close()
conn.close()
print(f"Inserted {len(rows_to_insert)} hourly dummy rows for the past 30 days.")
