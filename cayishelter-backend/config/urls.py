from django.contrib import admin
from django.urls import path
from core.views import health, external_feed, save_external_events

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", health),
    path("api/external-feed/save/", save_external_events),
    path("api/external-feed/", external_feed), 
]
