import { useEffect, useMemo, useState } from "react";
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
  FormControl,
  InputLabel,
  MenuItem,
  Select,
} from "@mui/material";

type SavedEvent = {
  id: number;
  origin: "EXTERNAL" | "INTERNAL";
  external_id: string;
  title: string;
  category: string;
  sector: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  estimated_impact: number;
  requires_shutdown: boolean;
  specimen_id?: number | null;
  occurred_at: string | null;
  status: string;
  source?: string;
  created_at: string;
};

type SeverityFilter = "ALL" | "INFO" | "WARNING" | "CRITICAL";
type SortBy = "DATE" | "SEVERITY" | "IMPACT";
type SortOrder = "DESC" | "ASC";

const STORAGE_KEY = "cayishelter_events_filters_v1";

function severityRank(value: string | undefined) {
  if (value === "CRITICAL") return 3;
  if (value === "WARNING") return 2;
  return 1;
}

export default function EventsPage() {
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [events, setEvents] = useState<SavedEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | "EXTERNAL" | "INTERNAL">(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return "ALL";
    try {
      const parsed = JSON.parse(raw);
      return parsed.filter ?? "ALL";
    } catch {
      return "ALL";
    }
  });
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return "ALL";
    try {
      const parsed = JSON.parse(raw);
      return parsed.severityFilter ?? "ALL";
    } catch {
      return "ALL";
    }
  });
  const [sectorFilter, setSectorFilter] = useState<string>(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return "ALL";
    try {
      const parsed = JSON.parse(raw);
      return parsed.sectorFilter ?? "ALL";
    } catch {
      return "ALL";
    }
  });
  const [sortBy, setSortBy] = useState<SortBy>(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return "DATE";
    try {
      const parsed = JSON.parse(raw);
      return parsed.sortBy ?? "DATE";
    } catch {
      return "DATE";
    }
  });
  const [sortOrder, setSortOrder] = useState<SortOrder>(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return "DESC";
    try {
      const parsed = JSON.parse(raw);
      return parsed.sortOrder ?? "DESC";
    } catch {
      return "DESC";
    }
  });

  const filteredEvents = events.filter((e) => {
    const originMatches = filter === "ALL" ? true : (e.origin ?? "EXTERNAL") === filter;
    const severityMatches = severityFilter === "ALL" ? true : (e.severity ?? "INFO") === severityFilter;
    const sectorMatches = sectorFilter === "ALL" ? true : (e.sector ?? "EXTERNAL") === sectorFilter;
    return originMatches && severityMatches && sectorMatches;
  });
  const visibleEvents = useMemo(() => {
    const sorted = [...filteredEvents];
    const dir = sortOrder === "ASC" ? 1 : -1;

    sorted.sort((a, b) => {
      if (sortBy === "SEVERITY") {
        return (severityRank(a.severity) - severityRank(b.severity)) * dir;
      }
      if (sortBy === "IMPACT") {
        return ((a.estimated_impact ?? 0) - (b.estimated_impact ?? 0)) * dir;
      }

      const aDate = new Date(a.occurred_at ?? a.created_at).getTime();
      const bDate = new Date(b.occurred_at ?? b.created_at).getTime();
      return (aDate - bDate) * dir;
    });

    return sorted;
  }, [filteredEvents, sortBy, sortOrder]);



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

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ filter, severityFilter, sectorFilter, sortBy, sortOrder })
    );
  }, [filter, severityFilter, sectorFilter, sortBy, sortOrder]);

const total = events.length;
const externalCount = events.filter(e => e.origin === "EXTERNAL").length;
const internalCount = events.filter(e => e.origin === "INTERNAL").length;
const sectors = Array.from(new Set(events.map((e) => e.sector).filter(Boolean))).sort();
const resetFilters = () => {
  setFilter("ALL");
  setSeverityFilter("ALL");
  setSectorFilter("ALL");
  setSortBy("DATE");
  setSortOrder("DESC");
  localStorage.removeItem(STORAGE_KEY);
};
const deleteEvent = async (id: number) => {
  try {
    await api.delete(`/events/${id}/`);
    setEvents((prev) => prev.filter((e) => e.id !== id));
  } catch (e: any) {
    setError(e?.message ?? "Failed to delete event");
  }
};

const exportEvents = async () => {
  try {
    setExporting(true);
    setError(null);

    const res = await api.get("/events/export/", { responseType: "blob" });
    const blob = new Blob([res.data], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");

    const disposition = res.headers?.["content-disposition"] as string | undefined;
    const matched = disposition?.match(/filename="?([^"]+)"?/);
    const filename = matched?.[1] ?? "cayishelter_events_backup.csv";

    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (e: any) {
    setError(e?.response?.data?.detail ?? "Failed to export events");
  } finally {
    setExporting(false);
  }
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
      <Button variant="outlined" onClick={() => exportEvents()} disabled={exporting || events.length === 0}>
        {exporting ? "Exporting..." : "Download Emergency Backup"}
      </Button>
    </Box>

    <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
      <FormControl size="small" sx={{ minWidth: 180 }}>
        <InputLabel id="severity-filter-label">Severity</InputLabel>
        <Select
          labelId="severity-filter-label"
          value={severityFilter}
          label="Severity"
          onChange={(e) => setSeverityFilter(e.target.value as "ALL" | "INFO" | "WARNING" | "CRITICAL")}
        >
          <MenuItem value="ALL">All severities</MenuItem>
          <MenuItem value="INFO">INFO</MenuItem>
          <MenuItem value="WARNING">WARNING</MenuItem>
          <MenuItem value="CRITICAL">CRITICAL</MenuItem>
        </Select>
      </FormControl>

      <FormControl size="small" sx={{ minWidth: 220 }}>
        <InputLabel id="sector-filter-label">Sector</InputLabel>
        <Select
          labelId="sector-filter-label"
          value={sectorFilter}
          label="Sector"
          onChange={(e) => setSectorFilter(e.target.value)}
        >
          <MenuItem value="ALL">All sectors</MenuItem>
          {sectors.map((sector) => (
            <MenuItem key={sector} value={sector}>
              {sector}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl size="small" sx={{ minWidth: 170 }}>
        <InputLabel id="sort-by-label">Sort by</InputLabel>
        <Select labelId="sort-by-label" value={sortBy} label="Sort by" onChange={(e) => setSortBy(e.target.value as SortBy)}>
          <MenuItem value="DATE">Date</MenuItem>
          <MenuItem value="SEVERITY">Severity</MenuItem>
          <MenuItem value="IMPACT">Impact</MenuItem>
        </Select>
      </FormControl>

      <FormControl size="small" sx={{ minWidth: 150 }}>
        <InputLabel id="sort-order-label">Order</InputLabel>
        <Select
          labelId="sort-order-label"
          value={sortOrder}
          label="Order"
          onChange={(e) => setSortOrder(e.target.value as SortOrder)}
        >
          <MenuItem value="DESC">Desc</MenuItem>
          <MenuItem value="ASC">Asc</MenuItem>
        </Select>
      </FormControl>

      <Button variant="text" onClick={resetFilters}>
        Reset filters
      </Button>
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
        <>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="caption" sx={{ display: "block", color: "text.secondary", mb: 1 }}>
              Active Incident Log
            </Typography>
            <Box sx={{ maxHeight: 180, overflow: "auto", border: "1px solid", borderColor: "divider", p: 1 }}>
              {visibleEvents.slice(0, 30).map((ev) => (
                <Typography key={`log-${ev.id}`} variant="caption" sx={{ display: "block", fontFamily: "inherit" }}>
                  [{ev.severity}] [{ev.origin}] {ev.external_id} :: {ev.title}
                </Typography>
              ))}
              {visibleEvents.length === 0 && (
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  NO EVENTS MATCH CURRENT FILTERS
                </Typography>
              )}
            </Box>
          </Paper>

          <TableContainer component={Paper} sx={{ mt: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Origin</TableCell>
                <TableCell>External ID</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Sector</TableCell>
                <TableCell>Severity</TableCell>
                <TableCell>Impact</TableCell>
                <TableCell>Occurred At</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {visibleEvents.map((ev) => (
                <TableRow key={ev.id}>
                  <TableCell>
                    <Chip
                      label={ev.origin}
                      color={ev.origin === "EXTERNAL" ? "warning" : "primary"}
                      size="small"
                    />

                  </TableCell>
                  <TableCell>{ev.external_id}</TableCell>
                  <TableCell>{ev.title}</TableCell>
                  <TableCell>{ev.category}</TableCell>
                  <TableCell>{ev.sector ?? "—"}</TableCell>
                  <TableCell>
                    <Chip
                      label={ev.severity ?? "INFO"}
                      className={ev.severity === "CRITICAL" ? "critical-pulse" : undefined}
                      color={
                        ev.severity === "CRITICAL"
                          ? "error"
                          : ev.severity === "WARNING"
                            ? "warning"
                            : "default"
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {ev.estimated_impact ?? 0}
                    {ev.requires_shutdown ? " (shutdown)" : ""}
                  </TableCell>
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
        </>
      )}
    </Box>
  );
}
