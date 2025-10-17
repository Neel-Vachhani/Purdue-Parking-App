from django.urls import path
from . import views

urlpatterns = [
    path('', views.get_data),
    path('add/', views.add_item),
    path('signup/', views.sign_up),
    path('parking/availability/', views.get_parking_availability),,
    path('notification_token/', views.accept_notification_token),
]
