import { useEffect, useState } from "react";
import { api } from "../services/api";
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

type SavedEvent = {
  id: number;
  origin: "EXTERNAL" | "INTERNAL";
  external_id: string;
  title: string;
  category: string;
  occurred_at: string | null;
  status: string;
  source?: string;
  created_at: string;
};

export default function EventsPage() {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<SavedEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | "EXTERNAL" | "INTERNAL">("ALL");
  const filteredEvents =
  filter === "ALL"
    ? events
    : events.filter((e) => (e.origin ?? "EXTERNAL") === filter);



  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await api.get<SavedEvent[]>("/events/");

        if (!mounted) return;
        setEvents(res.data);
        console.log("FIRST EVENT:", res.data[0]);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message ?? "Failed to load events");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

const total = events.length;
const externalCount = events.filter(e => e.origin === "EXTERNAL").length;
const internalCount = events.filter(e => e.origin === "INTERNAL").length;
const deleteEvent = async (id: number) => {
  await api.delete(`/events/${id}/`);
  setEvents(prev => prev.filter(e => e.id !== id));
};

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Internal Events Registry
      </Typography>

      <Box sx={{ display: "flex", gap: 3, mb: 2 }}>
      <Chip label={`Total: ${total}`} />
      <Chip label={`External: ${externalCount}`} color="warning" />
      <Chip label={`Internal: ${internalCount}`} color="primary" />
    </Box>

    <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
      <Button variant={filter==="ALL"?"contained":"outlined"} onClick={()=>setFilter("ALL")}>All</Button>
      <Button variant={filter==="EXTERNAL"?"contained":"outlined"} onClick={()=>setFilter("EXTERNAL")}>External</Button>
      <Button variant={filter==="INTERNAL"?"contained":"outlined"} onClick={()=>setFilter("INTERNAL")}>Internal</Button>
    </Box>


      {error && <Alert severity="error">{error}</Alert>}

      {loading ? (
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <CircularProgress size={22} />
          <Typography variant="body2">
            Loading bunker events…
          </Typography>
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ mt: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Origin</TableCell>
                <TableCell>External ID</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Occurred At</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {filteredEvents.map((ev) => (
                <TableRow key={ev.external_id}>
                  <TableCell>
                    <Chip label="EXTERNAL" color="warning" size="small" />
                  </TableCell>
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
                  <TableCell>
                    <Button
                      color="error"
                      size="small"
                      onClick={() => deleteEvent(ev.id)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
