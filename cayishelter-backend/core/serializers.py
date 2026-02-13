from rest_framework import serializers
from .models import ExternalEvent


class ExternalEventSerializer(serializers.ModelSerializer):
    # 👇 Añadimos este campo calculado
    origin = serializers.SerializerMethodField()

    class Meta:
        model = ExternalEvent
        fields = "__all__"  # esto ahora incluirá también origin
        read_only_fields = (
            "id",
            "created_at",
            "external_id",
            "title",
            "category",
            "occurred_at",
            "status",
            "source",
        )

    # 👇 Función que genera el campo
    def get_origin(self, obj):
        return "EXTERNAL"
