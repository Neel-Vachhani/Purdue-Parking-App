import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer

logger = logging.getLogger("parking_consumer")

class ParkingConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.group_name = "parking_updates"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        logger.info("WS connected: %s joined %s", self.channel_name, self.group_name)

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)
        logger.info("WS disconnected: %s left %s", self.channel_name, self.group_name)

    async def parking_message(self, event):
        payload = event.get("payload", {})
        logger.info("Sending to client: %s", payload)
        # Only forward if payload has lot and value
        if payload.get("lot") and ("value" in payload or "count" in payload):
            # Preserve zero as a valid value ("or" would drop 0).
            raw_count = payload["value"] if "value" in payload else payload.get("count")

            try:
                count = int(raw_count) if raw_count is not None else None
            except (TypeError, ValueError):
                count = raw_count

            if count is None:
                logger.debug("Skipping payload with null count: %s", payload)
                return

            meta = {
                "source": payload.get("source", "redis_pubsub"),
                "event": payload.get("event"),
                "key": payload.get("key"),
                "event_ts_utc": payload.get("event_ts_utc"),
            }

            await self.send(text_data=json.dumps({
                "type": "parking_update",
                "data": {"lot": payload["lot"], "count": count, "meta": meta}
            }))
        else:
            logger.debug("Skipping payload without lot/count: %s", payload)