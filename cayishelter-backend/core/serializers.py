from rest_framework import serializers
from .models import ExternalEvent, RefugeStatus


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
        return "INTERNAL" if (obj.source or "").upper() == "INTERNAL" else "EXTERNAL"


class RefugeStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = RefugeStatus
        fields = (
            "oxygen",
            "hygiene",
            "radiation",
            "radiation_absorption_rate",
            "biomass_density",
            "melanin_index",
            "structural_infiltration_level",
            "updated_at",
        )
