from django.urls import path
from . import views

urlpatterns = [
    path('', views.get_data),
    path('api/signup/', views.sign_up),
    path('api/parking/availability/', views.get_parking_availability),
    path('api/login/', views.log_in),
    path('api/apple/', views.apple_sign_in),
    path('api/notification_token/', views.accept_notification_token),
    path('api/notification_disable/', views.notification_disable),
    path('api/notification_test/', views.notification_test),
    path('api/user/origin/', views.user_origin),
    path('api/user/location/', views.get_location),
    path('api/user/get_user', views.get_user),
    path('api/geocode/', views.geocode_address),
    path('api/confirm_parking/', views.create_parking_log),
    path('api/nearest-garage/', views.nearest_garage_from_location),
    path('api/user/insights/', views.user_insights, name='user_insights'),

    # Lot events (User Story #10)
    path('api/lots/<str:lot_code>/events/', views.list_lot_events),

    # Push notifications (User Story #2 and #11)
    path('api/notify/sale/', views.notify_parking_pass_sale),
    path('api/notify/closures/', views.notify_upcoming_closures),
    path('api/notifications/history/', views.notification_history),
    path('api/notifications/stats/', views.notification_stats),
    path('api/notifications/check/', views.check_user_notifications),
    path('api/closure-notifications/', views.closure_notifications_toggle),
    path('api/favorite-alerts/', views.favorite_lot_alert_preferences),
    path("api/postgres-parking/", views.get_postgres_parking_data),
    path("api/parking/hourly-average/", views.get_hourly_average_parking),
    path('api/calendar/upload-ics/', views.upload_ics_events),
    path('api/calendar/events/', views.list_calendar_events),
    path('api/parking/comparison', views.get_parking_comparison, name='parking_comparison'),
    path('api/update_rating', views.send_user_rating),
    path('api/get_rating', views.get_garage_rating),
    path('api/reports/', views.garage_reports),
    path('api/update_specific_rating', views.update_specific_rating)
]
