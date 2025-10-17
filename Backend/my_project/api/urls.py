from django.urls import path
from . import views

urlpatterns = [
    path('', views.get_data),
    path('add/', views.add_item),
    path('signup/', views.sign_up),
    path('notification_token/', views.accept_notification_token),
]
