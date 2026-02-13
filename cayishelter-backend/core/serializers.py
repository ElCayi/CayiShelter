from rest_framework import serializers
from .models import ExternalEvent


class ExternalEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExternalEvent
        fields = "__all__"
        read_only_fields = ("id", "created_at")
