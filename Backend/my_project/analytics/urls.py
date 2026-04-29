"""
analytics/urls.py — URL routes for the analytics app.
Mounted at the project root (see my_project/urls.py), so the full path is
    /api/analytics/forecast/
"""

from django.urls import path

from . import views

urlpatterns = [
    path("api/analytics/forecast/", views.forecast_view, name="analytics-forecast"),
]
