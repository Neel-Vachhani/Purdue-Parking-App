import psycopg2
from decouple import config

conn = psycopg2.connect(
    host=config('DB_HOST'),
    port=config('DB_PORT'),
    database=config('DB_NAME'),
    user=config('DB_USERNAME'),
    password=config('DB_PASSWORD')
)
cursor = conn.cursor()

create_table_query = """
CREATE TABLE IF NOT EXISTS parking_availability_data (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    pgmd_availability INTEGER,
    pgu_availability INTEGER,
    pgnw_availability INTEGER,
    pgg_availability INTEGER,
    pgw_availability INTEGER,
    pggh_availability INTEGER,
    pgh_availability INTEGER,
    lot_r_availability INTEGER,
    lot_h_availability INTEGER,
    lot_fb_availability INTEGER,
    kfpc_availability INTEGER,
    lot_a_availability INTEGER,
    crec_availability INTEGER,
    lot_o_availability INTEGER,
    tark_wily_availability INTEGER,
    lot_aa_availability INTEGER,
    lot_bb_availability INTEGER,
    wnd_krach_availability INTEGER,
    shrv_erht_mrdh_availability INTEGER,
    mcut_harr_hill_availability INTEGER,
    duhm_availability INTEGER,
    pierce_st_availability INTEGER,
    pgm_availability INTEGER,
    smth_bchm_availability INTEGER,
    disc_a_availability INTEGER,
    disc_ab_availability INTEGER,
    disc_abc_availability INTEGER,
    airport_availability INTEGER
);
"""

cursor.execute(create_table_query)
conn.commit()
cursor.close()
conn.close()
print("Tables created")