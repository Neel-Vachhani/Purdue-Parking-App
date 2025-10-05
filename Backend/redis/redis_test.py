import redis
from decouple import config

r = redis.Redis(
    host=config('REDIS_HOST'),
    port=config('REDIS_PORT'),
    decode_responses=True,
    username=config('REDIS_USERNAME'),
    password=config('REDIS_PASSWORD'),
)

success = r.set('foo', 'testing, testing, 123')

result = r.get('foo')
print(result)

