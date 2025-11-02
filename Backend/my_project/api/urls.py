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
    path('user/origin/', views.user_origin),
    
    # Lot events (User Story #10)
    path('lots/<str:lot_code>/events/', views.list_lot_events),
    
    # Push notifications (User Story #2 and #11)
    path('notify/sale/', views.notify_parking_pass_sale),
    path('notify/closures/', views.notify_upcoming_closures),
    path('notifications/history/', views.notification_history),
    path('notifications/stats/', views.notification_stats),
    path('notifications/check/', views.check_user_notifications),
]
