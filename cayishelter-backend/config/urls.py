from django.contrib import admin
from django.urls import path
from dj_rest_auth.views import PasswordResetView, PasswordResetConfirmView
from core.views import (
    health,
    external_feed,
    save_external_events,
    list_events,
    export_events_csv,
    delete_event,
    auth_login,
    auth_2fa_verify,
    auth_2fa_status,
    auth_2fa_setup,
    auth_2fa_confirm,
    auth_2fa_disable,
    refuge_status,
    simulate_internal_incident,
    simulate_radiotrophic_cycle,
)
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path("admin/", admin.site.urls),

    path("api/auth/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/auth/login/", auth_login, name="auth_login"),
    path("api/auth/2fa/verify/", auth_2fa_verify, name="auth_2fa_verify"),
    path("api/auth/2fa/status/", auth_2fa_status, name="auth_2fa_status"),
    path("api/auth/2fa/setup/", auth_2fa_setup, name="auth_2fa_setup"),
    path("api/auth/2fa/confirm/", auth_2fa_confirm, name="auth_2fa_confirm"),
    path("api/auth/2fa/disable/", auth_2fa_disable, name="auth_2fa_disable"),

    path("api/auth/password/reset/", PasswordResetView.as_view(), name="password_reset"),
    path("api/auth/password/reset/confirm/", PasswordResetConfirmView.as_view(), name="password_reset_confirm"),

    path("api/health/", health),
    path("api/status/", refuge_status),
    path("api/incidents/simulate/", simulate_internal_incident),
    path("api/radiotrophy/simulate/", simulate_radiotrophic_cycle),
    path("api/external-feed/save/", save_external_events),
    path("api/external-feed/", external_feed),
    path("api/events/", list_events),
    path("api/events/export/", export_events_csv),
    path("api/events/<int:pk>/", delete_event),
]
