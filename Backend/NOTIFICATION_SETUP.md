# Notification System Setup Guide

## User Story #2 - Push Notification Backend Infrastructure

This guide explains the new notification tracking system and how to use it.

---

## 🚀 Quick Start

### 1. Run Database Migrations

```bash
cd Backend/my_project
python manage.py makemigrations
python manage.py migrate
```

This creates the `NotificationLog` table.

### 2. Start the Server

```bash
python manage.py runserver 0.0.0.0:8000
```

---

## 📊 What Was Added

### New Database Model: `NotificationLog`

Tracks every push notification sent to users:

- **user**: Who received it
- **notification_type**: Type (pass_sale, lot_closure, etc.)
- **message**: The notification text
- **sent_at**: Timestamp
- **success**: Whether it worked
- **error_message**: Error details if failed

### New API Endpoints

#### 1. Send Parking Pass Sale Notification
```bash
POST /api/notify/sale/
Body: {"message": "Parking passes on sale!"}
```

**What it does:**
- Sends notification to all opted-in users
- Logs every send attempt (success + failures)
- Returns stats: sent, failed, total_users

**Response:**
```json
{
  "sent": 45,
  "failed": 2,
  "total_users": 47,
  "message": "Parking passes on sale!"
}
```

#### 2. View Notification History
```bash
GET /api/notifications/history/
GET /api/notifications/history/?user_email=student@purdue.edu
GET /api/notifications/history/?notification_type=pass_sale&limit=10
```

**What it does:**
- Shows all sent notifications
- Filter by user email or notification type
- Useful for debugging

#### 3. Get Notification Stats
```bash
GET /api/notifications/stats/
```

**What it does:**
- Shows success/failure rates by type
- Shows total opted-in users
- Useful for monitoring

**Response:**
```json
{
  "pass_sale": {
    "name": "Parking Pass Sale",
    "total": 47,
    "successful": 45,
    "failed": 2
  },
  "overall": {
    "total": 150,
    "successful": 145,
    "failed": 5
  },
  "opted_in_users": 52
}
```

#### 4. Check User Notification Status
```bash
GET /api/notifications/check/?email=student@purdue.edu
```

**What it does:**
- Checks if a user will receive notifications
- Shows their opt-in status
- Shows recent notifications they received
- Useful for debugging opt-out issues

---

## 🧪 Testing Without Apple Developer Account

You can test everything EXCEPT actual push notifications:

### What Works:
✅ Send notification requests  
✅ Log notification attempts  
✅ View notification history  
✅ Check user opt-in status  
✅ Monitor success/failure rates  

### What Doesn't Work Yet:
❌ Actual push notifications to devices (needs Apple APNs setup)

### Test Example:

```bash
# 1. Send a test notification
curl -X POST http://localhost:8000/api/notify/sale/ \
  -H "Content-Type: application/json" \
  -d '{"message": "Test notification"}'

# 2. Check if it was logged
curl http://localhost:8000/api/notifications/history/?limit=5

# 3. View stats
curl http://localhost:8000/api/notifications/stats/
```

---

## 👥 For Teammates

### If You're Integrating Frontend:

The notification system is ready! When you add Apple Developer credentials:

1. Update `push_notifications.py` with APNs config
2. Everything else will work automatically
3. All notifications will be logged

### If You're Working on User Story #11 (Lot Closures):

Use the same pattern:

```python
# In your closure notification function
NotificationLog.objects.create(
    user=user,
    notification_type='lot_closure',
    message=f"Lot {lot_name} closing on {date}",
    success=True
)
```

---

## 📝 Notification Types

Currently supported:
- `pass_sale` - Parking pass sales (User Story #2)
- `lot_closure` - Lot closure alerts (User Story #11)
- `permit_expiring` - Permit expiration reminders
- `event_closure` - Event day closures

Add more types in `models.py` → `NotificationLog.NOTIFICATION_TYPES`

---

## 🐛 Debugging

### Check if user is opted-in:
```bash
curl "http://localhost:8000/api/notifications/check/?email=user@purdue.edu"
```

### View failed notifications:
```bash
# Check notification history for errors
curl "http://localhost:8000/api/notifications/history/?limit=20"
# Look for "success": false
```

### Check total opted-in users:
```bash
curl "http://localhost:8000/api/notifications/stats/"
# Look at "opted_in_users" count
```

---

## ✅ Acceptance Criteria Status

### User Story #2 Acceptance Criteria:

| Criterion | Status | Notes |
|-----------|--------|-------|
| Device registration tracked | ✅ Done | Via `notification_token` field |
| Opt-out prevents notifications | ✅ Done | Empty token = no notifications |
| All opted-in users receive notifications | ✅ Done | Filters users with tokens |
| Multiple devices support | ⏳ Pending | Needs Apple account to test |
| Notifications logged | ✅ Done | Every send attempt logged |

---

## 🚨 Next Steps (Need Apple Developer Account)

When you get Apple Developer credentials, update:

1. **File**: `Backend/my_project/api/push_notifications.py`
2. **Add**: APNs auth key (.p8 file)
3. **Add**: Key ID, Team ID
4. **Test**: Send real push to device

Everything else is ready to go!

---

## Questions?

Ask Anthony (@anthonymccrovitz) - I built this system.

