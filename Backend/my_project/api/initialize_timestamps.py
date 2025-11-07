"""
Utility script to initialize or update Redis timestamps based on Postgres data.
This can be run periodically or when Redis timestamps are missing.

Usage:
    python initialize_timestamps.py
"""
import sys
from pathlib import Path

# Add Django project to path
HERE = Path(__file__).resolve().parent
DJANGO_PROJECT_DIR = HERE.parent
if str(DJANGO_PROJECT_DIR) not in sys.path:
    sys.path.insert(0, str(DJANGO_PROJECT_DIR))

import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "my_project.settings")

import django
django.setup()

from api.confidence import get_postgres_connection, update_timestamp_in_redis, get_redis_connection
from api.views import PARKING_LOTS
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def initialize_timestamps_from_postgres():
    """
    Initialize Redis timestamps from the most recent Postgres data for each parking lot.
    This is useful when Redis timestamps are missing or need to be synced.
    """
    try:
        redis_client = get_redis_connection()
        conn = get_postgres_connection()
        cursor = conn.cursor()
        
        updated_count = 0
        skipped_count = 0
        
        for lot in PARKING_LOTS:
            redis_key = lot["redis_key"]
            column_name = redis_key.lower()
            
            # Get the most recent timestamp for this lot from Postgres
            query = f"""
                SELECT MAX(timestamp)
                FROM parking_availability_data
                WHERE {column_name} IS NOT NULL;
            """
            cursor.execute(query)
            result = cursor.fetchone()
            
            if result and result[0]:
                timestamp = result[0]
                success = update_timestamp_in_redis(redis_key, redis_client, timestamp)
                if success:
                    logger.info("Initialized timestamp for %s: %s", redis_key, timestamp)
                    updated_count += 1
                else:
                    logger.warning("Failed to update timestamp for %s", redis_key)
                    skipped_count += 1
            else:
                logger.debug("No Postgres data found for %s", redis_key)
                skipped_count += 1
        
        cursor.close()
        conn.close()
        
        logger.info("Timestamp initialization complete: %d updated, %d skipped", updated_count, skipped_count)
        return updated_count, skipped_count
        
    except Exception as e:
        logger.exception("Error initializing timestamps: %s", e)
        raise


if __name__ == "__main__":
    logger.info("Starting timestamp initialization from Postgres...")
    initialize_timestamps_from_postgres()
    logger.info("Timestamp initialization finished.")

