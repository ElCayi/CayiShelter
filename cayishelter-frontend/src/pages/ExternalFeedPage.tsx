import { useEffect, useState } from "react";
import { api } from "../services/api";
import { useNavigate } from "react-router-dom";

import {
  Alert,
  Box,
  CircularProgress,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
} from "@mui/material";

type ExternalEvent = {
  external_id: string;
  title: string;
  category: string;
  occurred_at: string | null;
  status: string;
  source?: string;
};

export default function ExternalFeedPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [events, setEvents] = useState<ExternalEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await api.get<ExternalEvent[] | { items?: ExternalEvent[]; warning?: string }>("/external-feed/");

        if (!mounted) return;
        const data = Array.isArray(res.data) ? res.data : (res.data.items ?? []);
        setEvents(data);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message ?? "Failed to load external feed");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const saveToDb = async () => {
    try {
      setSaving(true);
      setError(null);
      const token = localStorage.getItem("accessToken");
      if (!token) {
        setError("Session expired. Please login again.");
        navigate("/login", { replace: true });
        return;
      }
      if (events.length === 0) {
        setError("No external events available to save");
        return;
      }
      const res = await api.post("/external-feed/save/", events, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert(`Created: ${res.data.created}, Updated: ${res.data.updated}`);
    } catch (e: any) {
      const detail = e?.response?.data?.detail ?? e?.response?.data?.error ?? "Error saving events";
      setError(detail);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Orbital Surface Activity Monitor
      </Typography>

      <Box sx={{ mb: 2 }}>
        <Button variant="contained" onClick={saveToDb} disabled={saving || loading || events.length === 0}>
          {saving ? "Saving..." : "Save to Bunker DB"}
        </Button>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      {loading ? (
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <CircularProgress size={22} />
          <Typography variant="body2">
            Loading external feed…
          </Typography>
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ mt: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>External ID</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Occurred At</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Source</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {events.map((ev) => (
                <TableRow key={ev.external_id}>
                  <TableCell>{ev.external_id}</TableCell>
                  <TableCell>{ev.title}</TableCell>
                  <TableCell>{ev.category}</TableCell>
                  <TableCell>
                    {ev.occurred_at
                      ? new Date(ev.occurred_at).toLocaleString()
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={ev.status}
                      color={ev.status === "ACTIVE" ? "error" : "success"}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{ev.source ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
