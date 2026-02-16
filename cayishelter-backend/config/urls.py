from django.contrib import admin
from django.urls import path
from dj_rest_auth.views import PasswordResetView, PasswordResetConfirmView
from core.views import health, external_feed, save_external_events, list_events, delete_event
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path("admin/", admin.site.urls),

    path("api/auth/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),

    path("api/auth/password/reset/", PasswordResetView.as_view(), name="password_reset"),
    path("api/auth/password/reset/confirm/", PasswordResetConfirmView.as_view(), name="password_reset_confirm"),

    path("api/health/", health),
    path("api/external-feed/save/", save_external_events),
    path("api/external-feed/", external_feed),
    path("api/events/", list_events),
    path("api/events/<int:pk>/", delete_event),
]
