from django.contrib import admin
from django.urls import path
from core.views import health, external_feed, save_external_events, list_events, delete_event

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", health),
    path("api/external-feed/save/", save_external_events),
    path("api/external-feed/", external_feed), 
    path("api/events/", list_events),
    path("api/events/<int:pk>/", delete_event),

]   
