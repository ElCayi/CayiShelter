from django.contrib import admin
from django.urls import path
from core.views import health, external_feed

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", health),
    path("api/external-feed/", external_feed),
]
