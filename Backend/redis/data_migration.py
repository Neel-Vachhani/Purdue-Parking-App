"""
Save Redis availability counters to Postgres preserving column ordering.
"""

from datetime import datetime
import psycopg2
import redis
from decouple import config

TABLE_NAME = 'parking_availability_data'
PARKING_LOTS = [
    'PGMD_availability',
    'PGU_availability',
    'PGNW_availability',
    'PGG_availability',
    'PGW_availability',
    'PGGH_availability',
    'PGH_availability',
    'LOT_R_availability',
    'LOT_H_availability',
    'LOT_FB_availability',
    'KFPC_availability',
    'LOT_A_availability',
    'CREC_availability',
    'LOT_O_availability',
    'TARK_WILY_availability',
    'LOT_AA_availability',
    'LOT_BB_availability',
    'WND_KRACH_availability',
    'SHRV_ERHT_MRDH_availability',
    'MCUT_HARR_HILL_availability',
    'DUHM_availability',
    'PIERCE_ST_availability',
    'PGM_availability',
    'SMTH_BCHM_availability',
    'DISC_A_availability',
    'DISC_AB_availability',
    'DISC_ABC_availability',
    'AIRPORT_availability',
]

def get_redis_connection():
    return redis.Redis(
      host=config('REDIS_HOST'),
      port=config('REDIS_PORT'),
      decode_responses=True,
      username=config('REDIS_USERNAME'),
      password=config('REDIS_PASSWORD'),
    )

def get_postgres_connection():
    return psycopg2.connect(
      host=config('DB_HOST'),
      port=config('DB_PORT'),
      database=config('DB_NAME'),
      user=config('DB_USERNAME'),
      password=config('DB_PASSWORD')
    )

def fetch_redis_values(r):
    """Return a dict mapping redis_keys to their counter value"""
    values = {}
    for k in PARKING_LOTS:
        v = r.get(k)
        values[k] = int(v)
    return values

def save_snapshot_to_postgres(values_map):
    """
    Insert the current counter data into the postgres database while preserving ordering such that
    the current counter values line up with their respective columns.
    values_map: dict keyed by Redis keys from PARKING_LOTS.
    """
    columns = ['timestamp'] + [k.lower() for k in PARKING_LOTS]
    placeholders = ['%s'] * len(columns)

    insert_sql = f"""
    INSERT INTO {TABLE_NAME} ({', '.join(columns)})
    VALUES ({', '.join(placeholders)})
    """

    # Build the tuple of values in the same order
    current_time = datetime.utcnow()
    row_values = [current_time] + [values_map[k] for k in PARKING_LOTS]

    conn = None
    cur = None
    try:
        conn = get_postgres_connection()
        cur = conn.cursor()
        cur.execute(insert_sql, tuple(row_values))
        conn.commit()
        print(f"Saved snapshot to {TABLE_NAME} at {current_time} (UTC)")
    except Exception as e:
        if conn:
            conn.rollback()
        print("Error saving snapshot to Postgres:", e)
        raise
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

def main():
    r = get_redis_connection()
    values = fetch_redis_values(r)
    save_snapshot_to_postgres(values)

if __name__ == '__main__':
    main()