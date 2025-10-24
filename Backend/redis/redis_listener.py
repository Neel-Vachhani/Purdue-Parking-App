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


pubsub = r.pubsub(ignore_subscribe_messages=True)

pubsub.psubscribe('__keyspace@0__:*')

print("Listener started")
try:
  while True:
    message = pubsub.get_message(timeout=0.1)
    if message is None:
      continue
    print(message)
except KeyboardInterrupt:
  print("Listener terminated")
finally:
  pubsub.unsubscribe()
  pubsub.close()
  print("Pub/Sub stopped")