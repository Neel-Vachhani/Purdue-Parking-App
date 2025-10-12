"""Redis keyspace → Channels bridge (filtered)"""
import os, sys, logging
from pathlib import Path
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
import redis, django

# Add Django project to path
HERE = Path(__file__).resolve().parent
DJANGO_PROJECT_DIR = HERE.parent / "my_project"
if str(DJANGO_PROJECT_DIR) not in sys.path:
    sys.path.insert(0, str(DJANGO_PROJECT_DIR))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "my_project.settings")
django.setup()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("redis_bridge")

# Config
try:
    from decouple import config
except:
    config = lambda k, default=None: os.getenv(k, default)

PUBSUB_PATTERN = "__keyspace@0__:*"
INTERESTING_EVENTS = {"set", "incr", "incrby", "decr", "decrby", "del"}

channel_layer = get_channel_layer()
r = redis.Redis(
    host=config('REDIS_HOST'),
    port=config('REDIS_PORT'),
    decode_responses=True,
    username=config('REDIS_USERNAME'),
    password=config('REDIS_PASSWORD'),
)
pubsub = r.pubsub(ignore_subscribe_messages=True)
pubsub.psubscribe(PUBSUB_PATTERN)

logger.info("Bridge subscribed to %s", PUBSUB_PATTERN)

def key_to_lot(key: str) -> str:
    return key[:-len("_availability")] if key.endswith("_availability") else key

def read_value(redis_client, key: str):
    try:
        t = redis_client.type(key)
        if t == "string":
            v = redis_client.get(key)
            return int(v) if v and v.isdigit() else v
        elif t == "hash":
            if redis_client.hexists(key, "count"):
                return int(redis_client.hget(key, "count"))
        elif t == "zset":
            return redis_client.zcard(key)
        elif t == "set":
            return redis_client.scard(key)
    except Exception as e:
        logger.exception("Error reading %s: %s", key, e)
    return None

try:
    while True:
        msg = pubsub.get_message(timeout=0.1)
        if not msg:
            continue
        if msg.get("type") not in ("pmessage", "message"):
            continue
        event = msg.get("data")
        if isinstance(event, bytes):
            event = event.decode()
        if event not in INTERESTING_EVENTS:
            continue
        
        channel = msg.get("channel")
        if isinstance(channel, bytes):
            channel = channel.decode()
        key = channel.split(":", 1)[1] if ":" in channel else channel
        
        if key.startswith("asgi") or key.startswith("_"):
            continue
        
        value = read_value(r, key)
        lot = key_to_lot(key)
        
        payload = {"lot": lot, "value": value, "key": key, "event": event}
        logger.info("Forwarding %s -> %s", key, payload)
        async_to_sync(channel_layer.group_send)(
            "parking_updates",
            {"type": "parking_message", "payload": payload}
        )
except KeyboardInterrupt:
    logger.info("Bridge stopped")
finally:
    pubsub.close()