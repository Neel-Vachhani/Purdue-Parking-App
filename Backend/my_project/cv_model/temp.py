import redis
from decouple import config

r = redis.Redis(
    host=config("REDIS_HOST"),
    port=config("REDIS_PORT"),
    username=config("REDIS_USERNAME"),
    password=config("REDIS_PASSWORD"),
    decode_responses=True
)

# Check a single garage
print(r.get("PGMD_availability"))  # Should print current car count

# Or check all garages
keys = [
    'PGMD_availability', 'PGU_availability', 'PGNW_availability',
    'PGG_availability', 'PGW_availability', 'PGGH_availability',
    'PGH_availability', 'LOT_R_availability', 'LOT_H_availability',
    'LOT_FB_availability', 'KFPC_availability', 'LOT_A_availability'
    # ... add all your keys
]
for k in keys:
    print(k, r.get(k))
