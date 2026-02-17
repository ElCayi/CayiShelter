import requests
import pyotp
import random
import csv
from django.contrib.auth import authenticate
from django.core import signing
from django.http import HttpResponse
from django.utils import timezone
from requests.adapters import HTTPAdapter
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from urllib3.util.retry import Retry

from .models import ExternalEvent, RefugeStatus, UserTwoFactor
from .serializers import ExternalEventSerializer, RefugeStatusSerializer


def _issue_tokens(user):
    refresh = RefreshToken.for_user(user)
    return {"access": str(refresh.access_token), "refresh": str(refresh)}


SEVERITY_WEIGHTS = [("INFO", 55), ("WARNING", 33), ("CRITICAL", 12)]
GROUP_WEIGHTS = [("INFRA", 60), ("OPS", 25), ("SPECIMEN", 15)]

INCIDENT_GROUPS = {
    "INFRA": [
        {"title": "Oxygen scrubber efficiency below 85%", "category": "LIFE_SUPPORT", "sector": "LIFE_SUPPORT", "impact": {"oxygen": -8, "hygiene": 0, "radiation": 0}},
        {"title": "CO2 accumulation detected in Sector B", "category": "LIFE_SUPPORT", "sector": "LIFE_SUPPORT", "impact": {"oxygen": -10, "hygiene": -2, "radiation": 0}},
        {"title": "Ventilation duct partial obstruction", "category": "LIFE_SUPPORT", "sector": "LIFE_SUPPORT", "impact": {"oxygen": -7, "hygiene": -3, "radiation": 0}},
        {"title": "Backup oxygen tank usage initiated", "category": "LIFE_SUPPORT", "sector": "LIFE_SUPPORT", "impact": {"oxygen": -4, "hygiene": 0, "radiation": 0}},
        {"title": "Water recycling membrane degradation", "category": "LIFE_SUPPORT", "sector": "LIFE_SUPPORT", "impact": {"oxygen": -2, "hygiene": -8, "radiation": 0}},
        {"title": "Elevated bacterial count in gray water loop", "category": "LIFE_SUPPORT", "sector": "LIFE_SUPPORT", "impact": {"oxygen": 0, "hygiene": -10, "radiation": 0}},
        {"title": "Pump 2 pressure instability", "category": "LIFE_SUPPORT", "sector": "LIFE_SUPPORT", "impact": {"oxygen": -3, "hygiene": -5, "radiation": 0}},
        {"title": "Storage tank level below 40%", "category": "LIFE_SUPPORT", "sector": "LIFE_SUPPORT", "impact": {"oxygen": 0, "hygiene": -6, "radiation": 0}},
        {"title": "Generator fuel consumption above expected", "category": "LIFE_SUPPORT", "sector": "LIFE_SUPPORT", "impact": {"oxygen": -2, "hygiene": 0, "radiation": 1}},
        {"title": "Battery bank degradation (Cell cluster C3)", "category": "LIFE_SUPPORT", "sector": "LIFE_SUPPORT", "impact": {"oxygen": -2, "hygiene": 0, "radiation": 0}},
        {"title": "Load imbalance across power grid", "category": "LIFE_SUPPORT", "sector": "LIFE_SUPPORT", "impact": {"oxygen": -3, "hygiene": -1, "radiation": 1}},
        {"title": "Cooling system overheating (Power Core)", "category": "LIFE_SUPPORT", "sector": "LIFE_SUPPORT", "impact": {"oxygen": -4, "hygiene": 0, "radiation": 4}},
        {"title": "Unauthorized access attempt (bad credentials)", "category": "SECURITY", "sector": "SECURITY", "impact": {"oxygen": 0, "hygiene": 0, "radiation": 0}},
        {"title": "Repeated door access failures (badge mismatch)", "category": "SECURITY", "sector": "SECURITY", "impact": {"oxygen": 0, "hygiene": -1, "radiation": 0}},
        {"title": "CCTV signal loss (Camera 12)", "category": "SECURITY", "sector": "SECURITY", "impact": {"oxygen": 0, "hygiene": 0, "radiation": 0}},
        {"title": "Mechanical failure in airlock seal", "category": "SECURITY", "sector": "SECURITY", "impact": {"oxygen": -5, "hygiene": -1, "radiation": 3}},
        {"title": "External sensor ping — unknown movement", "category": "SECURITY", "sector": "SECURITY", "impact": {"oxygen": 0, "hygiene": 0, "radiation": 1}},
        {"title": "Failed biometric verification (3 attempts)", "category": "SECURITY", "sector": "SECURITY", "impact": {"oxygen": 0, "hygiene": 0, "radiation": 0}},
        {"title": "Radiation level above baseline (+12%)", "category": "ENVIRONMENT", "sector": "ENVIRONMENT", "impact": {"oxygen": 0, "hygiene": -2, "radiation": 9}},
        {"title": "Atmospheric particulate increase", "category": "ENVIRONMENT", "sector": "ENVIRONMENT", "impact": {"oxygen": -2, "hygiene": -3, "radiation": 0}},
        {"title": "Seismic micro-tremor detected", "category": "ENVIRONMENT", "sector": "ENVIRONMENT", "impact": {"oxygen": -1, "hygiene": -1, "radiation": 1}},
        {"title": "External temperature drop (-18C shift)", "category": "ENVIRONMENT", "sector": "ENVIRONMENT", "impact": {"oxygen": -1, "hygiene": 0, "radiation": 0}},
        {"title": "Barometric pressure anomaly", "category": "ENVIRONMENT", "sector": "ENVIRONMENT", "impact": {"oxygen": -2, "hygiene": -1, "radiation": 0}},
    ],
    "OPS": [
        {"title": "Food ration projection below 30 days", "category": "SUPPLY", "sector": "SUPPLY", "impact": {"oxygen": 0, "hygiene": -2, "radiation": 0}},
        {"title": "Expired medical inventory detected", "category": "SUPPLY", "sector": "SUPPLY", "impact": {"oxygen": 0, "hygiene": -2, "radiation": 0}},
        {"title": "Critical spare part unavailable", "category": "SUPPLY", "sector": "SUPPLY", "impact": {"oxygen": -2, "hygiene": -2, "radiation": 0}},
        {"title": "Inventory mismatch > 5%", "category": "SUPPLY", "sector": "SUPPLY", "impact": {"oxygen": 0, "hygiene": -1, "radiation": 0}},
        {"title": "Cold storage temperature deviation", "category": "SUPPLY", "sector": "SUPPLY", "impact": {"oxygen": 0, "hygiene": -3, "radiation": 0}},
        {"title": "Dehydration index trend increasing", "category": "MEDICAL", "sector": "MEDICAL", "impact": {"oxygen": -1, "hygiene": -2, "radiation": 0}},
        {"title": "Minor respiratory irritation cases (cluster)", "category": "MEDICAL", "sector": "MEDICAL", "impact": {"oxygen": -3, "hygiene": -1, "radiation": 0}},
        {"title": "Stress index rising (psych evaluation)", "category": "MEDICAL", "sector": "MEDICAL", "impact": {"oxygen": 0, "hygiene": -2, "radiation": 0}},
        {"title": "Minor injury — work accident", "category": "MEDICAL", "sector": "MEDICAL", "impact": {"oxygen": 0, "hygiene": -1, "radiation": 0}},
        {"title": "Vitamin D deficiency detected", "category": "MEDICAL", "sector": "MEDICAL", "impact": {"oxygen": 0, "hygiene": -1, "radiation": 0}},
    ],
    "SPECIMEN": [
        {"title": "Specimen agitation level above baseline", "category": "SPECIMEN", "sector": "RESEARCH", "impact": {"oxygen": -1, "hygiene": -2, "radiation": 0}},
        {"title": "Abnormal sleep cycle detected", "category": "SPECIMEN", "sector": "RESEARCH", "impact": {"oxygen": 0, "hygiene": -1, "radiation": 0}},
        {"title": "Feeding refusal (Specimen 04)", "category": "SPECIMEN", "sector": "RESEARCH", "impact": {"oxygen": 0, "hygiene": -1, "radiation": 0}},
        {"title": "Vocalization increase (unidentified pattern)", "category": "SPECIMEN", "sector": "RESEARCH", "impact": {"oxygen": 0, "hygiene": -1, "radiation": 0}},
        {"title": "Group synchronization anomaly", "category": "SPECIMEN", "sector": "RESEARCH", "impact": {"oxygen": 0, "hygiene": -2, "radiation": 1}},
        {"title": "Containment door micro-seal degradation", "category": "SPECIMEN", "sector": "RESEARCH", "impact": {"oxygen": -2, "hygiene": -2, "radiation": 2}},
        {"title": "Electromagnetic restraint fluctuation", "category": "SPECIMEN", "sector": "RESEARCH", "impact": {"oxygen": -1, "hygiene": -1, "radiation": 2}},
        {"title": "Sedation pump pressure irregularity", "category": "SPECIMEN", "sector": "RESEARCH", "impact": {"oxygen": 0, "hygiene": -1, "radiation": 1}},
        {"title": "Sensor blackout (Chamber 3)", "category": "SPECIMEN", "sector": "RESEARCH", "impact": {"oxygen": 0, "hygiene": 0, "radiation": 2}},
        {"title": "Containment integrity at 78% — structural fatigue", "category": "SPECIMEN", "sector": "RESEARCH", "impact": {"oxygen": -2, "hygiene": -2, "radiation": 4}},
        {"title": "Sedation resistance detected (threshold exceeded)", "category": "SPECIMEN", "sector": "RESEARCH", "impact": {"oxygen": 0, "hygiene": -2, "radiation": 3}},
        {"title": "Unauthorized communication attempt (unknown channel)", "category": "SPECIMEN", "sector": "RESEARCH", "impact": {"oxygen": 0, "hygiene": -1, "radiation": 2}},
    ],
}


def _get_or_create_refuge_status():
    status_obj = RefugeStatus.objects.first()
    if status_obj:
        return status_obj
    return RefugeStatus.objects.create()


def _clamp_metric(value):
    return max(0, min(100, value))


def _clamp_float(value, min_value=0.0, max_value=100.0):
    return max(min_value, min(max_value, round(value, 2)))


def _pick_weighted(weighted_items):
    values = [item[0] for item in weighted_items]
    weights = [item[1] for item in weighted_items]
    return random.choices(values, weights=weights, k=1)[0]


def _estimate_impact_from_severity(severity):
    if severity == "CRITICAL":
        return random.randint(7, 10)
    if severity == "WARNING":
        return random.randint(4, 7)
    return random.randint(1, 4)


RADIOTROPHY_EVENTS = {
    "INFO": [
        "Radiation absorption rate stable",
        "Melanin density within expected parameters",
        "Shielding layer thickness increasing (Sector 2)",
    ],
    "WARNING": [
        "Over-accumulation of absorbed isotopes",
        "Fungal mass expansion beyond containment grid",
        "Thermal increase in bio-shield layer",
    ],
    "CRITICAL": [
        "Radiotrophic surge detected",
        "Energy conversion spike exceeding baseline",
        "Structural pressure from biomass expansion",
        "Spore cloud enriched with radioactive particles",
    ],
}


@api_view(["POST"])
@permission_classes([AllowAny])
def auth_login(request):
    username = request.data.get("username", "").strip()
    password = request.data.get("password", "")
    user = authenticate(request=request, username=username, password=password)

    if not user:
        return Response({"detail": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)

    two_factor = getattr(user, "two_factor", None)
    if two_factor and two_factor.is_enabled and two_factor.secret:
        challenge = signing.dumps({"uid": user.id}, salt="cayi-2fa-login")
        return Response({"requires_2fa": True, "challenge": challenge})

    tokens = _issue_tokens(user)
    return Response({"requires_2fa": False, **tokens})


@api_view(["POST"])
@permission_classes([AllowAny])
def auth_2fa_verify(request):
    challenge = request.data.get("challenge", "")
    otp_code = str(request.data.get("code", "")).strip()

    if not challenge or not otp_code:
        return Response({"detail": "Challenge and code are required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        payload = signing.loads(challenge, salt="cayi-2fa-login", max_age=300)
        user_id = payload.get("uid")
    except signing.BadSignature:
        return Response({"detail": "Invalid or expired challenge"}, status=status.HTTP_400_BAD_REQUEST)
    except signing.SignatureExpired:
        return Response({"detail": "Challenge expired"}, status=status.HTTP_400_BAD_REQUEST)

    two_factor = UserTwoFactor.objects.filter(user_id=user_id, is_enabled=True).first()
    if not two_factor or not two_factor.secret:
        return Response({"detail": "2FA is not enabled for this account"}, status=status.HTTP_400_BAD_REQUEST)

    totp = pyotp.TOTP(two_factor.secret)
    if not totp.verify(otp_code, valid_window=1):
        return Response({"detail": "Invalid verification code"}, status=status.HTTP_401_UNAUTHORIZED)

    tokens = _issue_tokens(two_factor.user)
    return Response(tokens)


@api_view(["GET"])
def auth_2fa_status(request):
    two_factor, _ = UserTwoFactor.objects.get_or_create(user=request.user)
    return Response({"is_enabled": two_factor.is_enabled})


@api_view(["POST"])
def auth_2fa_setup(request):
    two_factor, _ = UserTwoFactor.objects.get_or_create(user=request.user)
    secret = pyotp.random_base32()
    two_factor.pending_secret = secret
    two_factor.save(update_fields=["pending_secret", "updated_at"])

    issuer = "CayiShelter"
    label = f"{issuer}:{request.user.username}"
    otpauth_url = pyotp.totp.TOTP(secret).provisioning_uri(name=label, issuer_name=issuer)

    return Response({"otpauth_url": otpauth_url, "secret": secret})


@api_view(["POST"])
def auth_2fa_confirm(request):
    otp_code = str(request.data.get("code", "")).strip()
    two_factor, _ = UserTwoFactor.objects.get_or_create(user=request.user)

    if not two_factor.pending_secret:
        return Response({"detail": "No pending setup found"}, status=status.HTTP_400_BAD_REQUEST)

    totp = pyotp.TOTP(two_factor.pending_secret)
    if not totp.verify(otp_code, valid_window=1):
        return Response({"detail": "Invalid verification code"}, status=status.HTTP_400_BAD_REQUEST)

    two_factor.secret = two_factor.pending_secret
    two_factor.pending_secret = ""
    two_factor.is_enabled = True
    two_factor.save(update_fields=["secret", "pending_secret", "is_enabled", "updated_at"])
    return Response({"ok": True, "is_enabled": True})


@api_view(["POST"])
def auth_2fa_disable(request):
    otp_code = str(request.data.get("code", "")).strip()
    two_factor = UserTwoFactor.objects.filter(user=request.user, is_enabled=True).first()

    if not two_factor or not two_factor.secret:
        return Response({"detail": "2FA is not enabled"}, status=status.HTTP_400_BAD_REQUEST)

    if not pyotp.TOTP(two_factor.secret).verify(otp_code, valid_window=1):
        return Response({"detail": "Invalid verification code"}, status=status.HTTP_400_BAD_REQUEST)

    two_factor.is_enabled = False
    two_factor.secret = ""
    two_factor.pending_secret = ""
    two_factor.save(update_fields=["is_enabled", "secret", "pending_secret", "updated_at"])
    return Response({"ok": True, "is_enabled": False})


@api_view(["GET"])
def refuge_status(request):
    status_obj = _get_or_create_refuge_status()
    serializer = RefugeStatusSerializer(status_obj)
    return Response(serializer.data)


@api_view(["POST"])
def simulate_internal_incident(request):
    selected_group = _pick_weighted(GROUP_WEIGHTS)
    incident = random.choice(INCIDENT_GROUPS[selected_group])
    severity = _pick_weighted(SEVERITY_WEIGHTS)
    estimated_impact = _estimate_impact_from_severity(severity)
    requires_shutdown = severity == "CRITICAL" and incident["sector"] in {"LIFE_SUPPORT", "SECURITY", "RESEARCH"}

    status_obj = _get_or_create_refuge_status()

    impact = incident["impact"]
    status_obj.oxygen = _clamp_metric(status_obj.oxygen + impact["oxygen"])
    status_obj.hygiene = _clamp_metric(status_obj.hygiene + impact["hygiene"])
    status_obj.radiation = _clamp_metric(status_obj.radiation + impact["radiation"])
    status_obj.save(update_fields=["oxygen", "hygiene", "radiation", "updated_at"])

    external_id = f"INT-{timezone.now().strftime('%Y%m%d%H%M%S')}-{random.randint(1000, 9999)}"
    created_event = ExternalEvent.objects.create(
        external_id=external_id,
        title=incident["title"],
        category=incident["category"],
        sector="INTERNAL",
        occurred_at=timezone.now(),
        severity=severity,
        estimated_impact=estimated_impact,
        requires_shutdown=requires_shutdown,
        specimen_id=random.randint(1, 8) if incident["category"] == "SPECIMEN" else None,
        agitation_index=round(random.uniform(0.4, 0.98), 2) if incident["category"] == "SPECIMEN" else None,
        containment_integrity=random.randint(70, 98) if incident["category"] == "SPECIMEN" else None,
        status="ACTIVE" if severity in {"WARNING", "CRITICAL"} else "MONITORING",
        source="INTERNAL",
    )

    event_data = ExternalEventSerializer(created_event).data
    status_data = RefugeStatusSerializer(status_obj).data
    return Response({"ok": True, "event": event_data, "status": status_data})


@api_view(["POST"])
def simulate_radiotrophic_cycle(request):
    status_obj = _get_or_create_refuge_status()
    radiation_pressure = status_obj.radiation / 100.0

    status_obj.radiation_absorption_rate = _clamp_float(
        status_obj.radiation_absorption_rate + random.uniform(-1.5, 2.5) + (radiation_pressure * 2.0),
        45.0,
        99.0,
    )
    status_obj.biomass_density = _clamp_float(
        status_obj.biomass_density + random.uniform(-0.8, 2.2) + (radiation_pressure * 1.8),
        10.0,
        95.0,
    )
    status_obj.melanin_index = _clamp_metric(
        status_obj.melanin_index + random.randint(-1, 3) + (1 if status_obj.radiation >= 65 else 0)
    )
    status_obj.structural_infiltration_level = _clamp_metric(
        status_obj.structural_infiltration_level
        + random.randint(0, 2)
        + (1 if status_obj.biomass_density >= 55 else 0)
        + (1 if status_obj.melanin_index >= 85 else 0)
    )

    if status_obj.structural_infiltration_level >= 70 or (
        status_obj.melanin_index > 90 and status_obj.radiation_absorption_rate > 92
    ):
        severity = "CRITICAL"
    elif (
        status_obj.radiation_absorption_rate > 92
        or status_obj.biomass_density > 60
        or status_obj.structural_infiltration_level >= 50
    ):
        severity = "WARNING"
    else:
        severity = "INFO"

    if severity == "INFO":
        status_obj.radiation = _clamp_metric(status_obj.radiation - random.randint(1, 3))
    elif severity == "WARNING":
        status_obj.radiation = _clamp_metric(status_obj.radiation + random.randint(-1, 2))
    else:
        status_obj.radiation = _clamp_metric(status_obj.radiation + random.randint(1, 4))

    status_obj.save(
        update_fields=[
            "radiation",
            "radiation_absorption_rate",
            "biomass_density",
            "melanin_index",
            "structural_infiltration_level",
            "updated_at",
        ]
    )

    event_title = random.choice(RADIOTROPHY_EVENTS[severity])
    event_id = f"RTF-{timezone.now().strftime('%Y%m%d%H%M%S')}-{random.randint(1000, 9999)}"
    event = ExternalEvent.objects.create(
        external_id=event_id,
        title=event_title,
        category="RADIOTROPHY",
        sector="INTERNAL",
        occurred_at=timezone.now(),
        severity=severity,
        estimated_impact=_estimate_impact_from_severity(severity),
        requires_shutdown=(severity == "CRITICAL"),
        status="ACTIVE" if severity in {"WARNING", "CRITICAL"} else "MONITORING",
        source="INTERNAL",
    )

    return Response(
        {
            "ok": True,
            "event": ExternalEventSerializer(event).data,
            "status": RefugeStatusSerializer(status_obj).data,
        }
    )


@api_view(["GET"])
@permission_classes([AllowAny])
def health(request):
    return Response({"state": "CayiShelter backend online"})


def _session_with_retries() -> requests.Session:
    s = requests.Session()
    retries = Retry(
        total=3,
        backoff_factor=0.6,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["GET"],
    )
    adapter = HTTPAdapter(max_retries=retries)
    s.mount("https://", adapter)
    s.mount("http://", adapter)
    return s


@api_view(["GET"])
@permission_classes([AllowAny])
def external_feed(request):
    url = "https://eonet.gsfc.nasa.gov/api/v3/events"
    headers = {"User-Agent": "Mozilla/5.0 (CayiShelter/1.0)", "Accept": "application/json"}

    try:
        s = _session_with_retries()
        res = s.get(url, headers=headers, timeout=(10, 45))
        res.raise_for_status()
        data = res.json()

        events = []
        for event in data.get("events", [])[:15]:
            category = event["categories"][0]["title"] if event.get("categories") else "Unknown"
            geometry = event.get("geometry", [])
            occurred_at = geometry[0]["date"] if geometry else None
            state = "ACTIVE" if not event.get("closed") else "CLOSED"
            events.append(
                {
                    "external_id": event.get("id"),
                    "title": event.get("title"),
                    "category": category,
                    "occurred_at": occurred_at,
                    "status": state,
                    "source": "OMN",
                }
            )

        return Response(events)
    except Exception as e:
        fallback = [
            {
                "external_id": "SIM-001",
                "title": "Surface fires detected near equatorial band (simulated).",
                "category": "Wildfires",
                "occurred_at": "2026-02-13T00:00:00Z",
                "status": "ACTIVE",
                "source": "OMN",
            },
            {
                "external_id": "SIM-002",
                "title": "Seismic anomaly cluster registered (simulated).",
                "category": "Earthquakes",
                "occurred_at": "2026-02-12T00:00:00Z",
                "status": "ACTIVE",
                "source": "OMN",
            },
        ]
        return Response(fallback, status=200)


@api_view(["GET"])
def list_events(request):
    qs = ExternalEvent.objects.order_by("-occurred_at", "-created_at")
    serializer = ExternalEventSerializer(qs, many=True)
    return Response(serializer.data)


@api_view(["GET"])
def export_events_csv(request):
    qs = ExternalEvent.objects.order_by("-occurred_at", "-created_at")
    timestamp = timezone.now().strftime("%Y%m%d_%H%M%S")
    filename = f"cayishelter_events_{timestamp}.csv"

    response = HttpResponse(content_type="text/csv")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'

    writer = csv.writer(response)
    writer.writerow(
        [
            "id",
            "origin",
            "external_id",
            "title",
            "category",
            "sector",
            "severity",
            "estimated_impact",
            "requires_shutdown",
            "specimen_id",
            "agitation_index",
            "containment_integrity",
            "occurred_at",
            "status",
            "source",
            "created_at",
        ]
    )

    for ev in qs:
        origin = "INTERNAL" if (ev.source or "").upper() == "INTERNAL" else "EXTERNAL"
        writer.writerow(
            [
                ev.id,
                origin,
                ev.external_id,
                ev.title,
                ev.category,
                ev.sector,
                ev.severity,
                ev.estimated_impact,
                ev.requires_shutdown,
                ev.specimen_id or "",
                ev.agitation_index or "",
                ev.containment_integrity or "",
                ev.occurred_at.isoformat() if ev.occurred_at else "",
                ev.status,
                ev.source or "",
                ev.created_at.isoformat() if ev.created_at else "",
            ]
        )

    return response


@api_view(["DELETE"])
def delete_event(request, pk):
    try:
        event = ExternalEvent.objects.get(pk=pk)
        event.delete()
        return Response({"ok": True})
    except ExternalEvent.DoesNotExist:
        return Response(status=404)


@api_view(["POST"])
def save_external_events(request):
    if not isinstance(request.data, list):
        return Response({"error": "Expected a list of events"}, status=status.HTTP_400_BAD_REQUEST)

    created = 0
    updated = 0

    for item in request.data:
        external_id = item.get("external_id")
        if not external_id:
            continue

        _, was_created = ExternalEvent.objects.update_or_create(
            external_id=external_id,
            defaults={
                "title": item.get("title", ""),
                "category": item.get("category", ""),
                "sector": item.get("sector", "EXTERNAL"),
                "occurred_at": item.get("occurred_at"),
                "severity": item.get("severity", "WARNING"),
                "estimated_impact": item.get("estimated_impact", 4),
                "requires_shutdown": item.get("requires_shutdown", False),
                "specimen_id": item.get("specimen_id"),
                "agitation_index": item.get("agitation_index"),
                "containment_integrity": item.get("containment_integrity"),
                "status": item.get("status", ""),
                "source": item.get("source"),
            },
        )
        if was_created:
            created += 1
        else:
            updated += 1

    return Response({"ok": True, "created": created, "updated": updated}, status=status.HTTP_200_OK)
