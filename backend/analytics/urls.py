from django.urls import path
from .views import record_event, analytics_dashboard, analytics_timeseries

urlpatterns = [
    path('analytics/event/', record_event, name='record-analytics-event'),
    path('analytics/dashboard/', analytics_dashboard, name='analytics-dashboard'),
    path('analytics/timeseries/', analytics_timeseries, name='analytics-timeseries'),
]
