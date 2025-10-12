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
            count = payload.get("value") or payload.get("count")
            await self.send(text_data=json.dumps({
                "type": "parking_update",
                "data": {"lot": payload["lot"], "count": count}
            }))
        else:
            logger.debug("Skipping payload without lot/count: %s", payload)