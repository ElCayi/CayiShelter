import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, CircularProgress, Paper, Typography } from "@mui/material";
import { api } from "../services/api";

type RefugeStatus = {
  oxygen: number;
  hygiene: number;
  radiation: number;
  radiation_absorption_rate: number;
  biomass_density: number;
  melanin_index: number;
  structural_infiltration_level: number;
  updated_at: string;
};

type IncidentEvent = {
  title: string;
  category: string;
  severity?: "INFO" | "WARNING" | "CRITICAL";
};

type SimulateResponse = {
  ok: boolean;
  event: IncidentEvent;
  status: RefugeStatus;
};

function stressLabel(level: number) {
  if (level >= 70) return "CRITICAL";
  if (level >= 45) return "ELEVATED";
  return "NOMINAL";
}

function severityColor(severity?: "INFO" | "WARNING" | "CRITICAL") {
  if (severity === "CRITICAL") return "error";
  if (severity === "WARNING") return "warning";
  return "info";
}

function BiosRow({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <Typography className="bios-row">
      <span className="bios-pipe">|</span>
      <span className="bios-label">{label}: </span>
      <span className={valueClass ?? "bios-value"}>{value}</span>
      <span className="bios-pipe">|</span>
    </Typography>
  );
}

function BiosSep() {
  return <Typography className="bios-sep">+------------------------------------------------------------+</Typography>;
}

export default function StatusPage() {
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [simulatingRadiotrophy, setSimulatingRadiotrophy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<RefugeStatus | null>(null);
  const [lastIncident, setLastIncident] = useState<IncidentEvent | null>(null);
  const [lastRadiotrophyEvent, setLastRadiotrophyEvent] = useState<IncidentEvent | null>(null);
  const [criticalSoundEnabled, setCriticalSoundEnabled] = useState(false);
  const [visibleBiosLines, setVisibleBiosLines] = useState(0);

  const loadStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<RefugeStatus>("/status/");
      setStatus(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Failed to load refuge status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStatus();
  }, []);

  const playCriticalTone = () => {
    if (!criticalSoundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = 840;
      gain.gain.value = 0.03;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.16);
    } catch {
      // no-op
    }
  };

  const simulateIncident = async () => {
    try {
      setSimulating(true);
      setError(null);
      const res = await api.post<SimulateResponse>("/incidents/simulate/");
      setStatus(res.data.status);
      setLastIncident(res.data.event);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Failed to simulate incident");
    } finally {
      setSimulating(false);
    }
  };

  const simulateRadiotrophicCycle = async () => {
    try {
      setSimulatingRadiotrophy(true);
      setError(null);
      const res = await api.post<SimulateResponse>("/radiotrophy/simulate/");
      setStatus(res.data.status);
      setLastRadiotrophyEvent(res.data.event);
      if (res.data.event?.severity === "CRITICAL") playCriticalTone();
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Failed to simulate radiotrophic cycle");
    } finally {
      setSimulatingRadiotrophy(false);
    }
  };

  const isRadiotrophyCritical = lastRadiotrophyEvent?.severity === "CRITICAL";
  const biosTypingDelay = isRadiotrophyCritical ? 18 : lastRadiotrophyEvent?.severity === "WARNING" ? 28 : 40;
  const biosRows = useMemo(
    () =>
      status
        ? [
            { kind: "sep" as const },
            { kind: "row" as const, label: "CAYISHELTER - BIO-RADIOLOGICAL COMMAND", value: "ONLINE", valueClass: "bios-value-ok" },
            { kind: "row" as const, label: "CLEARANCE LEVEL", value: "OMEGA", valueClass: "bios-value-critical" },
            { kind: "sep" as const },
            { kind: "row" as const, label: "RADIATION INDEX", value: `${(status.radiation / 100).toFixed(2)} Sv` },
            { kind: "row" as const, label: "ABSORPTION RATE", value: `${status.radiation_absorption_rate.toFixed(1)}%` },
            {
              kind: "row" as const,
              label: "STRUCTURAL STRESS",
              value: stressLabel(status.structural_infiltration_level),
              valueClass: isRadiotrophyCritical ? "bios-value-critical" : "bios-value",
            },
            { kind: "sep" as const },
            { kind: "row" as const, label: "BIOLOGICAL CONTAINMENT - SECTOR", value: "INTERNAL" },
            { kind: "row" as const, label: "CLASS", value: "H" },
            { kind: "row" as const, label: "SUBJECT", value: "02" },
            { kind: "row" as const, label: "MELANIN INDEX", value: `${status.melanin_index}%` },
            { kind: "row" as const, label: "CONTAINMENT INTEGRITY", value: `${Math.max(0, 100 - status.structural_infiltration_level)}%` },
            { kind: "sep" as const },
            { kind: "row" as const, label: "OXYGEN", value: `${status.oxygen}%` },
            { kind: "row" as const, label: "HYGIENE", value: `${status.hygiene}%` },
            { kind: "row" as const, label: "BIOMASS DENSITY", value: `${status.biomass_density.toFixed(1)} KG/M3` },
            { kind: "sep" as const },
          ]
        : [],
    [status, isRadiotrophyCritical]
  );

  useEffect(() => {
    if (!biosRows.length) return;
    setVisibleBiosLines(0);
    const timer = window.setInterval(() => {
      setVisibleBiosLines((prev) => {
        if (prev >= biosRows.length) {
          window.clearInterval(timer);
          return prev;
        }
        return prev + 1;
      });
    }, biosTypingDelay);

    return () => {
      window.clearInterval(timer);
    };
  }, [biosRows, biosTypingDelay]);

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Refuge Status
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading || !status ? (
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <CircularProgress size={22} />
          <Typography variant="body2">Loading shelter metrics...</Typography>
        </Box>
      ) : (
        <>
          <Paper sx={{ p: 2, mb: 2 }} className="bios-panel">
            {biosRows.slice(0, visibleBiosLines).map((entry, index) =>
              entry.kind === "sep" ? (
                <BiosSep key={`sep-${index}`} />
              ) : (
                <BiosRow key={`row-${index}`} label={entry.label} value={entry.value} valueClass={entry.valueClass} />
              )
            )}
            {visibleBiosLines < biosRows.length && (
              <Typography variant="caption" className="terminal-cursor" sx={{ display: "block", color: "text.secondary" }}>
                STREAMING TELEMETRY
              </Typography>
            )}
          </Paper>

          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
            <Button variant="contained" onClick={() => void simulateIncident()} disabled={simulating}>
              {simulating ? "Simulating..." : "Simulate Internal Incident"}
            </Button>
            <Button variant="outlined" onClick={() => void simulateRadiotrophicCycle()} disabled={simulatingRadiotrophy}>
              {simulatingRadiotrophy ? "Simulating PRC..." : "Simulate Radiotrophic Cycle"}
            </Button>
            <Button
              variant={criticalSoundEnabled ? "contained" : "text"}
              color={criticalSoundEnabled ? "warning" : "secondary"}
              onClick={() => setCriticalSoundEnabled((v) => !v)}
            >
              {criticalSoundEnabled ? "Critical Tone: On" : "Critical Tone: Off"}
            </Button>
          </Box>

          {(lastIncident || lastRadiotrophyEvent) && (
            <Paper sx={{ p: 2 }} className="bios-panel">
              <Typography variant="caption" sx={{ color: "text.secondary", mb: 1, display: "block" }}>
                Active Incidents
              </Typography>
              {lastIncident && (
                <Alert severity="warning" sx={{ mb: 1 }}>
                  [{lastIncident.category}] {lastIncident.title}
                </Alert>
              )}
              {lastRadiotrophyEvent && (
                <Alert
                  severity={severityColor(lastRadiotrophyEvent.severity)}
                  className={isRadiotrophyCritical ? "critical-pulse" : undefined}
                >
                  [{lastRadiotrophyEvent.severity ?? "INFO"}] [{lastRadiotrophyEvent.category}] {lastRadiotrophyEvent.title}
                </Alert>
              )}
            </Paper>
          )}
        </>
      )}
    </Box>
  );
}
