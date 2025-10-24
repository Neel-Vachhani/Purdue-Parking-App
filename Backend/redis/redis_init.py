import redis
from decouple import config

# Initialization of Redis connection using Secrets stored in .env file
r = redis.Redis(
    host=config('REDIS_HOST'),
    port=config('REDIS_PORT'),
    decode_responses=True,
    username=config('REDIS_USERNAME'),
    password=config('REDIS_PASSWORD'),
)


"""
Initialization of Redis key:value pairs for each large-capacity (approximately greater than 50 spots)
parking structure across purdue's campus for A, B, C, SG, Grad House, and Residence Hall Permit-restricted
parking, as well as paid garage parking. Parking structures/lots with published names, primary buildings, or
notable locations (e.g Airport) are labeled as such. Parking structures/lots without the aforementioned descriptors
are labeled using Purdue Football parking lot names (e.g Lot R).
"""
r.set('PGMD_availability', 0)                 # Mccutcheon Drive Parking Garage
r.set('PGU_availability', 0)                  # University Street Parking Garage
r.set('PGNW_availability', 0)                 # Northwestern Avenue Parking Garage
r.set('PGG_availability', 0)                  # Grant Street Parking Garage
r.set('PGW_availability', 0)                  # Wood Street Parking Garage
r.set('PGGH_availability', 0)                 # Graduate House Parking Garage
r.set('PGH_availability', 0)                  # Harrison Street Parking Garage
r.set('LOT_R_availability', 0)                # Lot R (North of Ross-Ade) Parking Lot
r.set('LOT_H_availability', 0)                # Lot H (North of Football Practice Field) Parking Lot
r.set('LOT_FB_availability', 0)               # Lot FB (East of Football Practice Field) Parking Lot
r.set('KFPC_availability', 0)                 # Kozuch Football Performance Complex Parking Lot
r.set('LOT_A_availability', 0)                # Lot A (North of Cary-Quad) Parking Lot
r.set('CREC_availability', 0)                 # Co-Rec Parking Lots
r.set('LOT_O_availability', 0)                # Lot O (East of Rankin Track) Parking Lot
r.set('TARK_WILY_availability', 0)            # Tarkington Wiley Parking Lots
r.set('LOT_AA_availability', 0)               # 6th & Russell Parking Lot
r.set('LOT_BB_availability', 0)               # 6th & Waldron Parking Lot
r.set('WND_KRACH_availability', 0)            # Windsor & Krach Shared Parking Lot (South of Krach)
r.set('SHRV_ERHT_MRDH_availability', 0)       # Shreve, Earhart, and Meredith Shared Parking Lot
r.set('MCUT_HARR_HILL_availability', 0)       # McCutchen, Harrison, and Hillenbrand Shared Parking Lot
r.set('DUHM_availability', 0)                 # Parking Lot off 1st Street (South of Duhme Hall)
r.set('PIERCE_ST_availability', 0)            # Paid Parking Lot off Pierce Street (East of PGW)
r.set('PGM_availability', 0)                  # Marsteller Street Parking Garage (North of Yue-Kong Pao Hall)
r.set('SMTH_BCHM_availability', 0)            # Parking Lot b/t Smith Hall and Biochemistry Building
r.set('DISC_A_availability', 0)               # A Permit Parking Availability for Discovery Lot (South of FLEX Lab)
r.set('DISC_AB_availability', 0)              # AB Permit Parking Availability for Discovery Lot (South of FLEX Lab)
r.set('DISC_ABC_availability', 0)             # ABC Permit Parking Availability for Discovery Lot (South of FLEX Lab)
r.set('AIRPORT_availability', 0)              # Airport Parking Lots
