import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from rest_framework.decorators import api_view
from rest_framework.response import Response

@api_view(["GET"])
def health(request):
    return Response({"status": "CayiShelter backend online"})


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
            status = "ACTIVE" if not event.get("closed") else "CLOSED"

            events.append({
                "external_id": event.get("id"),
                "title": event.get("title"),
                "category": category,
                "occurred_at": occurred_at,
                "status": status,
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