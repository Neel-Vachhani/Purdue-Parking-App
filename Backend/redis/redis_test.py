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

# Creating simple key:value pair to test
success = r.set('foo', 'testing, testing, 123')

result = r.get('foo')
print(result)

r.delete('foo')

# Test increment and decrement of certain parking key:value pairs. Existence verified using Redis Insights Portal

# PGU starting value
print(f"Existing Availability of University Street Parking Garage: {r.get('PGU_availability')}")
print("Incrementing Availability of University Street Parking Garage by 1")
r.incr('PGU_availability')

# PGU should be incremented by 1.
print(f"New Availability of University Street Parking Garage: {r.get('PGU_availability')}")

# PGU should be 0 again
print("Decrementing Availability of University Street Parking Garage by 1")
r.decr('PGU_availability')
print(f"Final Availability of University Street Parking Garage: {r.get('PGU_availability')}")
