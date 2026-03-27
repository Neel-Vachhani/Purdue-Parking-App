import psycopg2
from decouple import config
from random import randint, choice
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

# --- Get the target user's ID ---
user_email = "pnandkeo@purdue.edu"
cursor.execute("SELECT id FROM boiler_park_backend_user WHERE email = %s", (user_email,))
user_row = cursor.fetchone()
if not user_row:
    raise ValueError(f"User with email {user_email} not found!")
user_id = user_row[0]

# --- Clear existing UserPark entries for that user ---
cursor.execute("DELETE FROM boiler_park_backend_userpark WHERE user_id = %s", (user_id,))
conn.commit()
print(f"Cleared all existing UserPark entries for {user_email}")

# --- Fetch all parking lot codes (primary key) ---
cursor.execute("SELECT code FROM boiler_park_backend_parkinglot")
lot_codes = [row[0] for row in cursor.fetchall()]
if not lot_codes:
    raise ValueError("No parking lots found in the database!")

# --- Generate dummy parking history ---
rows_to_insert = []
for day_offset in range(30):  # last 30 days
    num_events = randint(1, 3)  # 1–3 parking events per day
    for _ in range(num_events):
        timestamp = datetime.now() - timedelta(
            days=(29 - day_offset),
            hours=randint(7, 22),
            minutes=randint(0, 59)
        )
        lot_code = choice(lot_codes)
        day_of_week = timestamp.strftime("%A")
        rows_to_insert.append((user_id, lot_code, timestamp, day_of_week))

# --- Insert all rows ---
insert_query = """
INSERT INTO boiler_park_backend_userpark (user_id, lot_id, timestamp, day_of_week)
VALUES (%s, %s, %s, %s)
"""
cursor.executemany(insert_query, rows_to_insert)
conn.commit()

cursor.close()
conn.close()
print(f"Inserted {len(rows_to_insert)} new UserPark entries for {user_email}")
