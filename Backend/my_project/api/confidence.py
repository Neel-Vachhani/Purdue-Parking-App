"""
Utility module for calculating confidence levels based on data freshness.
Confidence levels indicate how reliable the parking availability data is
based on when it was last updated.
"""
from datetime import datetime, timedelta
from typing import Optional, Literal
import redis
import psycopg2
from decouple import config
import logging

logger = logging.getLogger(__name__)

# Confidence level thresholds (in minutes)
# High: Data updated within the last 15 minutes
# Medium: Data updated within the last 30 minutes
# Low: Data older than 30 minutes or unavailable
HIGH_CONFIDENCE_THRESHOLD_MINUTES = 15
MEDIUM_CONFIDENCE_THRESHOLD_MINUTES = 30

ConfidenceLevel = Literal["High", "Medium", "Low"]


def get_redis_connection() -> redis.Redis:
    """Get a Redis connection."""
    redis_kwargs = {"decode_responses": True}
    
    host = config("REDIS_HOST", default="localhost")
    if host:
        redis_kwargs["host"] = host
    
    port_value = config("REDIS_PORT", default=None)
    if port_value:
        try:
            redis_kwargs["port"] = int(port_value)
        except (TypeError, ValueError):
            logger.warning(
                "Invalid REDIS_PORT value '%s', falling back to 6379", port_value
            )
            redis_kwargs["port"] = 6379
    else:
        redis_kwargs["port"] = 6379
    
    username = config("REDIS_USERNAME", default=None)
    if username:
        redis_kwargs["username"] = username
    
    password = config("REDIS_PASSWORD", default=None)
    if password:
        redis_kwargs["password"] = password
    
    return redis.Redis(**redis_kwargs)


def get_postgres_connection():
    """Get a Postgres connection."""
    return psycopg2.connect(
        host=config('DB_HOST'),
        port=config('DB_PORT'),
        database=config('DB_NAME'),
        user=config('DB_USERNAME'),
        password=config('DB_PASSWORD')
    )


def get_last_update_timestamp_from_redis(redis_key: str, redis_client: redis.Redis) -> Optional[datetime]:
    """
    Get the last update timestamp for a parking lot from Redis.
    Checks for a timestamp key: {redis_key}:last_updated
    
    Args:
        redis_key: The Redis key for the parking lot (e.g., 'PGH_availability')
        redis_client: Redis client instance
        
    Returns:
        datetime if timestamp exists, None otherwise
    """
    try:
        timestamp_key = f"{redis_key}:last_updated"
        timestamp_str = redis_client.get(timestamp_key)
        if timestamp_str:
            # Parse ISO format timestamp
            return datetime.fromisoformat(timestamp_str)
    except Exception as e:
        logger.debug("Could not get timestamp from Redis for %s: %s", redis_key, e)
    return None


def get_last_update_timestamp_from_postgres(redis_key: str) -> Optional[datetime]:
    """
    Get the most recent timestamp for a parking lot from Postgres.
    Falls back to Postgres if Redis timestamp is not available.
    
    Args:
        redis_key: The Redis key for the parking lot (e.g., 'PGH_availability')
        
    Returns:
        datetime if data exists, None otherwise
    """
    try:
        conn = get_postgres_connection()
        cursor = conn.cursor()
        
        # Query the most recent timestamp for this column
        column_name = redis_key.lower()
        query = f"""
            SELECT MAX(timestamp)
            FROM parking_availability_data
            WHERE {column_name} IS NOT NULL;
        """
        cursor.execute(query)
        result = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if result and result[0]:
            return result[0]
    except Exception as e:
        logger.debug("Could not get timestamp from Postgres for %s: %s", redis_key, e)
    return None


def get_last_update_timestamp(redis_key: str, redis_client: Optional[redis.Redis] = None) -> Optional[datetime]:
    """
    Get the last update timestamp for a parking lot.
    First checks Redis, then falls back to Postgres.
    
    Args:
        redis_key: The Redis key for the parking lot (e.g., 'PGH_availability')
        redis_client: Optional Redis client instance (creates new if not provided)
        
    Returns:
        datetime if timestamp exists, None otherwise
    """
    # Try Redis first
    if redis_client is None:
        try:
            redis_client = get_redis_connection()
        except Exception as e:
            logger.debug("Could not create Redis connection: %s", e)
            redis_client = None
    
    if redis_client:
        timestamp = get_last_update_timestamp_from_redis(redis_key, redis_client)
        if timestamp:
            return timestamp
    
    # Fall back to Postgres
    return get_last_update_timestamp_from_postgres(redis_key)


def calculate_confidence_level(
    last_update: Optional[datetime],
    current_time: Optional[datetime] = None
) -> ConfidenceLevel:
    """
    Calculate confidence level based on data freshness.
    
    Args:
        last_update: The datetime when the data was last updated
        current_time: Optional current time (defaults to now)
        
    Returns:
        "High", "Medium", or "Low" confidence level
    """
    if last_update is None:
        return "Low"
    
    if current_time is None:
        # Use UTC for consistency
        current_time = datetime.utcnow()
    
    # Handle timezone-aware vs naive datetime comparison
    # Convert both to naive UTC for comparison
    if last_update.tzinfo is not None:
        # Convert timezone-aware to naive UTC
        last_update_naive = last_update.replace(tzinfo=None) - (last_update.utcoffset() or timedelta(0))
    else:
        last_update_naive = last_update
    
    if current_time.tzinfo is not None:
        # Convert timezone-aware to naive UTC
        current_time_naive = current_time.replace(tzinfo=None) - (current_time.utcoffset() or timedelta(0))
    else:
        current_time_naive = current_time
    
    age_delta = current_time_naive - last_update_naive
    age_minutes = age_delta.total_seconds() / 60
    
    # Handle negative age (future timestamps) - treat as Low confidence
    if age_minutes < 0:
        return "Low"
    
    if age_minutes <= HIGH_CONFIDENCE_THRESHOLD_MINUTES:
        return "High"
    elif age_minutes <= MEDIUM_CONFIDENCE_THRESHOLD_MINUTES:
        return "Medium"
    else:
        return "Low"


def get_confidence_for_lot(
    redis_key: str,
    redis_client: Optional[redis.Redis] = None,
    current_time: Optional[datetime] = None
) -> tuple[ConfidenceLevel, Optional[datetime]]:
    """
    Get confidence level and last update timestamp for a parking lot.
    
    Args:
        redis_key: The Redis key for the parking lot (e.g., 'PGH_availability')
        redis_client: Optional Redis client instance
        current_time: Optional current time for testing
        
    Returns:
        Tuple of (confidence_level, last_update_timestamp)
    """
    last_update = get_last_update_timestamp(redis_key, redis_client)
    confidence = calculate_confidence_level(last_update, current_time)
    return confidence, last_update


def update_timestamp_in_redis(redis_key: str, redis_client: Optional[redis.Redis] = None, timestamp: Optional[datetime] = None) -> bool:
    """
    Update the last_updated timestamp for a parking lot in Redis.
    This should be called whenever the parking availability data is updated.
    
    Args:
        redis_key: The Redis key for the parking lot (e.g., 'PGH_availability')
        redis_client: Optional Redis client instance (creates new if not provided)
        timestamp: Optional timestamp to set (defaults to current UTC time)
        
    Returns:
        True if successful, False otherwise
    """
    try:
        if redis_client is None:
            redis_client = get_redis_connection()
        
        if timestamp is None:
            timestamp = datetime.utcnow()
        
        timestamp_key = f"{redis_key}:last_updated"
        # Store timestamp as ISO format string
        timestamp_str = timestamp.isoformat()
        redis_client.set(timestamp_key, timestamp_str)
        
        logger.debug("Updated timestamp for %s: %s", redis_key, timestamp_str)
        return True
    except Exception as e:
        logger.error("Failed to update timestamp for %s: %s", redis_key, e)
        return False

