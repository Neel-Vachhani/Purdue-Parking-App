# Confidence Level System

## Overview

The confidence level system calculates and assigns confidence levels to parking availability data based on data freshness. This helps users understand how reliable the parking information is.

## Confidence Levels

The system uses three confidence levels:

- **High**: Data was updated within the last 15 minutes
- **Medium**: Data was updated within the last 30 minutes (but more than 15 minutes ago)
- **Low**: Data is older than 30 minutes or unavailable

## Implementation

### Core Module: `confidence.py`

The `confidence.py` module provides the following key functions:

1. **`get_confidence_for_lot(redis_key, redis_client=None, current_time=None)`**
   - Returns the confidence level and last update timestamp for a parking lot
   - Checks Redis first for timestamp, then falls back to Postgres

2. **`calculate_confidence_level(last_update, current_time=None)`**
   - Calculates confidence level based on data age
   - Handles timezone-aware and naive datetime objects

3. **`update_timestamp_in_redis(redis_key, redis_client=None, timestamp=None)`**
   - Updates the last_updated timestamp in Redis
   - Should be called whenever parking availability data is updated

4. **`get_last_update_timestamp(redis_key, redis_client=None)`**
   - Retrieves the last update timestamp from Redis or Postgres
   - Returns None if no timestamp is available

### API Integration

The `get_parking_availability` endpoint in `views.py` has been updated to include confidence levels in the response:

```json
{
  "lots": [
    {
      "id": 1,
      "code": "PGH",
      "name": "Harrison Street Parking Garage",
      "available": 45,
      "confidence": "High",
      "last_updated": "2024-01-15T10:30:00"
    }
  ]
}
```

### Timestamp Tracking

Timestamps are stored in Redis with the key pattern: `{redis_key}:last_updated`

For example:
- `PGH_availability:last_updated` stores the timestamp for Harrison Street Parking Garage

### Data Migration Integration

The `data_migration.py` script has been updated to automatically update Redis timestamps when saving data to Postgres. This ensures timestamps are kept in sync with data updates.

### Initialization Script

The `initialize_timestamps.py` script can be used to initialize or sync Redis timestamps from Postgres data:

```bash
python Backend/my_project/api/initialize_timestamps.py
```

This is useful when:
- Redis timestamps are missing
- Timestamps need to be synced after a Redis restart
- Initializing the system for the first time

## Usage

### Updating Timestamps When Data Changes

When parking availability data is updated (e.g., via `incr`, `decr`, `set` operations), you should also update the timestamp:

```python
from api.confidence import update_timestamp_in_redis

# After updating availability
redis_client.incr('PGH_availability')
update_timestamp_in_redis('PGH_availability', redis_client)
```

### Getting Confidence Levels

Confidence levels are automatically included in the `get_parking_availability` API response. You can also calculate them programmatically:

```python
from api.confidence import get_confidence_for_lot

confidence, last_update = get_confidence_for_lot('PGH_availability')
print(f"Confidence: {confidence}, Last Updated: {last_update}")
```

## Configuration

Confidence thresholds can be adjusted in `confidence.py`:

```python
HIGH_CONFIDENCE_THRESHOLD_MINUTES = 15  # Data < 15 minutes old
MEDIUM_CONFIDENCE_THRESHOLD_MINUTES = 30  # Data < 30 minutes old
```

## Fallback Behavior

The system uses a fallback strategy for timestamp retrieval:

1. **First**: Check Redis for `{redis_key}:last_updated`
2. **Fallback**: Query Postgres for the most recent timestamp in `parking_availability_data` table
3. **Default**: Return "Low" confidence if no timestamp is found

This ensures confidence levels are available even if Redis timestamps are missing.

