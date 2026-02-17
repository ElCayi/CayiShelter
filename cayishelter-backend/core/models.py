from django.db import models
from django.contrib.auth import get_user_model


User = get_user_model()

class ExternalEvent(models.Model):
    SEVERITY_CHOICES = [
        ("INFO", "Info"),
        ("WARNING", "Warning"),
        ("CRITICAL", "Critical"),
    ]

    external_id = models.CharField(max_length=100, unique=True)
    title = models.TextField()
    category = models.CharField(max_length=100)
    sector = models.CharField(max_length=50, default="EXTERNAL")
    occurred_at = models.DateTimeField(null=True, blank=True)
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES, default="INFO")
    estimated_impact = models.PositiveSmallIntegerField(default=2)
    requires_shutdown = models.BooleanField(default=False)
    specimen_id = models.IntegerField(null=True, blank=True)
    agitation_index = models.FloatField(null=True, blank=True)
    containment_integrity = models.IntegerField(null=True, blank=True)
    status = models.CharField(max_length=50)
    source = models.CharField(max_length=100, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.external_id} - {self.title}"


class UserTwoFactor(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="two_factor")
    is_enabled = models.BooleanField(default=False)
    secret = models.CharField(max_length=64, blank=True, default="")
    pending_secret = models.CharField(max_length=64, blank=True, default="")
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"2FA<{self.user.username}> enabled={self.is_enabled}"


class RefugeStatus(models.Model):
    oxygen = models.PositiveSmallIntegerField(default=84)
    hygiene = models.PositiveSmallIntegerField(default=52)
    radiation = models.PositiveSmallIntegerField(default=71)
    radiation_absorption_rate = models.FloatField(default=74.0)
    biomass_density = models.FloatField(default=38.0)
    melanin_index = models.PositiveSmallIntegerField(default=61)
    structural_infiltration_level = models.PositiveSmallIntegerField(default=22)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Status O2={self.oxygen} H={self.hygiene} R={self.radiation}"
