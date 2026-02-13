import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .models import ExternalEvent
from .serializers import ExternalEventSerializer

from .models import ExternalEvent
from .serializers import ExternalEventSerializer

@api_view(["GET"])
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
def external_feed(request):
    url = "https://eonet.gsfc.nasa.gov/api/v3/events"

    headers = {
        "User-Agent": "Mozilla/5.0 (CayiShelter/1.0)",
        "Accept": "application/json",
    }

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

            events.append({
                "external_id": event.get("id"),
                "title": event.get("title"),
                "category": category,
                "occurred_at": occurred_at,
                "status": state,
                "source": "OMN",
            })

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
        return Response(
            {"warning": "External feed degraded, serving fallback data", "details": str(e), "items": fallback},
            status=200,
        )
        
@api_view(["GET"])
def list_events(request):
    qs = ExternalEvent.objects.order_by("-occurred_at", "-created_at")
    serializer = ExternalEventSerializer(qs, many=True)
    return Response(serializer.data)

@api_view(["DELETE"])
def delete_event(request, pk):
    try:
        event = Event.objects.get(pk=pk)
        event.delete()
        return Response({"ok": True})
    except Event.DoesNotExist:
        return Response(status=404)

@api_view(["POST"])
def save_external_events(request):
    """
    Recibe una lista de eventos (tal cual los devuelve /external-feed/)
    y los guarda en DB. Si ya existen (external_id único), los ignora/actualiza.
    """
    if not isinstance(request.data, list):
        return Response(
            {"error": "Expected a list of events"},
            status=status.HTTP_400_BAD_REQUEST
        )

    created = 0
    updated = 0

    for item in request.data:
        external_id = item.get("external_id")
        if not external_id:
            continue

        obj, was_created = ExternalEvent.objects.update_or_create(
            external_id=external_id,
            defaults={
                "title": item.get("title", ""),
                "category": item.get("category", ""),
                "occurred_at": item.get("occurred_at"),
                "status": item.get("status", ""),
                "source": item.get("source"),
            }
        )

        if was_created:
            created += 1
        else:
            updated += 1

    return Response(
        {"ok": True, "created": created, "updated": updated},
        status=status.HTTP_200_OK
    )
