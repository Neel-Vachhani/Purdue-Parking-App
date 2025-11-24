from django.urls import path
from . import views

urlpatterns = [
    path('', views.get_data),
    path('add/', views.add_item),
    path('signup/', views.sign_up),
    path('parking/availability/', views.get_parking_availability),
    path('login/', views.log_in),
    path('apple/', views.apple_sign_in),
    path('notification_token/', views.accept_notification_token),
    path('notification_disable/', views.notification_disable),
    path('notification_test/', views.notification_test),
    path('user/origin/', views.user_origin),
    path('geocode/', views.geocode_address),

    # Lot events (User Story #10)
    path('lots/<str:lot_code>/events/', views.list_lot_events),

    # Push notifications (User Story #2 and #11)
    path('notify/sale/', views.notify_parking_pass_sale),
    path('notify/closures/', views.notify_upcoming_closures),
    path('notifications/history/', views.notification_history),
    path('notifications/stats/', views.notification_stats),
    path('notifications/check/', views.check_user_notifications),
    path('closure-notifications/', views.closure_notifications_toggle),
    path("postgres-parking/", views.get_postgres_parking_data),
    path("parking/hourly-average/", views.get_hourly_average_parking),
    path('api/calendar/upload-ics/', views.upload_ics_events),
    path('api/calendar/events/', views.list_calendar_events),
    path('api/update_rating', views.send_user_rating),
    path('api/get_rating', views.get_garage_rating),
    path('reports/', views.garage_reports),
]
