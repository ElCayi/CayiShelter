from django.db import models
from django.conf import settings

class ExternalEvent(models.Model):
    external_id = models.CharField(max_length=100, unique=True)
    title = models.TextField()
    category = models.CharField(max_length=100)
    occurred_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=50)
    source = models.CharField(max_length=100, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.external_id} - {self.title}"
