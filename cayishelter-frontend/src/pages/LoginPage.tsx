import { Alert, Box, Button, Link, Paper, TextField, Typography } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { api } from "../services/api";

type LoginResponse = {
  requires_2fa?: boolean;
  challenge?: string;
  access?: string;
  refresh?: string;
};

function isTokenUsable(token: string | null) {
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split(".")[1] ?? ""));
    const exp = typeof payload.exp === "number" ? payload.exp : 0;
    return exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

function formatDotLine(label: string, value: string, totalWidth = 56) {
  const cleanLabel = label.trim();
  const cleanValue = value.trim();
  const dots = ".".repeat(Math.max(3, totalWidth - cleanLabel.length - cleanValue.length - 2));
  return `${cleanLabel} ${dots} ${cleanValue}`;
}

function formatDotTitle(title: string, totalWidth: number) {
  const cleanTitle = title.trim();
  const filler = Math.max(6, totalWidth - cleanTitle.length - 2);
  const left = Math.floor(filler / 2);
  const right = filler - left;
  return `${".".repeat(left)} ${cleanTitle} ${".".repeat(right)}`;
}

function formatUptime(totalSeconds: number) {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [days, hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

type TerminalToken = {
  text: string;
  className: "title" | "meta" | "prompt" | "cmd" | "k" | "good" | "warn" | "bad" | "num" | "ps01" | "plain";
};

function tokenizeLine(line: string): TerminalToken[] {
  const titleRegex = /^[.-]{5,}.*[.-]{5,}$/;
  const promptRegex = /^(PS [A-Z]:\\[^>]*>)\s*(.*)$/;
  const partialPromptRegex = /^(PS\b.*)$/;
  const metaRegex = /^(UNDERLYING RUNTIME:|\(C\)|PSSI SECURE OPERATIONS SHELL)/i;
  const keyRegex = /\b([A-Z][A-Z0-9\- ]+):/g;
  const ps01Regex = /\[?PS-01\]?/g;
  const unionRegex =
    /\b(OK|ONLINE|STABLE|READY|VERIFIED|OPERATIONAL)\b|\b(DEGRADED|WARN|WARNING)\b|\b(FAILED|DENIED|RESTRICTED|ERROR)\b|\b\d+(?:\.\d+)?\s?(?:MS|BAR|M\/SV|%|HOURS|DAYS|MINUTES)\b/g;

  if (!line) return [{ text: "", className: "plain" }];
  if (titleRegex.test(line)) return [{ text: line, className: "title" }];

  const promptMatch = line.match(promptRegex);
  if (promptMatch) {
    const prompt = promptMatch[1] ?? "";
    const cmd = promptMatch[2] ?? "";
    return cmd
      ? [
          { text: prompt, className: "prompt" },
          { text: " ", className: "plain" },
          { text: cmd, className: "cmd" },
        ]
      : [{ text: prompt, className: "prompt" }];
  }

  const partialPromptMatch = line.match(partialPromptRegex);
  if (partialPromptMatch) {
    return [{ text: partialPromptMatch[1] ?? line, className: "prompt" }];
  }

  if (metaRegex.test(line)) return [{ text: line, className: "meta" }];

  const tokens: TerminalToken[] = [];
  const marks: Array<{ start: number; end: number; className: TerminalToken["className"] }> = [];
  let match: RegExpExecArray | null;

  while ((match = keyRegex.exec(line)) !== null) {
    marks.push({ start: match.index, end: match.index + match[0].length, className: "k" });
  }
  while ((match = ps01Regex.exec(line)) !== null) {
    marks.push({ start: match.index, end: match.index + match[0].length, className: "ps01" });
  }
  while ((match = unionRegex.exec(line)) !== null) {
    const value = match[0];
    let className: TerminalToken["className"] = "num";
    if (/^\d+(?:\.\d+)?\s?MS$/i.test(value)) className = "good";
    if (/^(OK|ONLINE|STABLE|READY|VERIFIED|OPERATIONAL)$/i.test(value)) className = "good";
    else if (/^(DEGRADED|WARN|WARNING)$/i.test(value)) className = "warn";
    else if (/^(FAILED|DENIED|RESTRICTED|ERROR)$/i.test(value)) className = "bad";
    marks.push({ start: match.index, end: match.index + value.length, className });
  }

  marks.sort((a, b) => a.start - b.start || b.end - a.end);
  const filtered: typeof marks = [];
  for (const item of marks) {
    if (!filtered.some((x) => item.start < x.end && item.end > x.start)) filtered.push(item);
  }

  let cursor = 0;
  for (const item of filtered) {
    if (cursor < item.start) tokens.push({ text: line.slice(cursor, item.start), className: "plain" });
    tokens.push({ text: line.slice(item.start, item.end), className: item.className });
    cursor = item.end;
  }
  if (cursor < line.length) tokens.push({ text: line.slice(cursor), className: "plain" });
  return tokens.length ? tokens : [{ text: line, className: "plain" }];
}

export default function LoginPage() {
  const navigate = useNavigate();
  const choiceInputRef = useRef<HTMLInputElement | null>(null);
  const usernameInputRef = useRef<HTMLInputElement | null>(null);
  const passwordInputRef = useRef<HTMLInputElement | null>(null);
  const [booting, setBooting] = useState(true);
  const [pssiChars, setPssiChars] = useState(0);
  const [introStep, setIntroStep] = useState(0);
  const [typedChars, setTypedChars] = useState(0);
  const [statusCmdChars, setStatusCmdChars] = useState(0);
  const [bootStep, setBootStep] = useState(0);
  const [telemetryStep, setTelemetryStep] = useState(0);
  const [secureCmdChars, setSecureCmdChars] = useState(0);
  const [secureLineStep, setSecureLineStep] = useState(0);
  const [secureIntroDone, setSecureIntroDone] = useState(false);
  const [asciiLogo, setAsciiLogo] = useState("");
  const [asciiCmdChars, setAsciiCmdChars] = useState(0);
  const [asciiStep, setAsciiStep] = useState(0);
  const [gateCmdChars, setGateCmdChars] = useState(0);
  const [selectedRole, setSelectedRole] = useState("operator");
  const [selectedZone, setSelectedZone] = useState("underground");
  const [choiceStep, setChoiceStep] = useState<"role" | "zone">("role");
  const [roleMenuStep, setRoleMenuStep] = useState(0);
  const [zoneMenuStep, setZoneMenuStep] = useState(0);
  const [choiceInput, setChoiceInput] = useState("");
  const [sessionConfigError, setSessionConfigError] = useState<string | null>(null);
  const [sessionConfigured, setSessionConfigured] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [userCaretPos, setUserCaretPos] = useState(0);
  const [passCaretPos, setPassCaretPos] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uptimeSeconds, setUptimeSeconds] = useState(14 * 24 * 3600 + 6 * 3600 + 23 * 60);

  const roleChoices = [
    { key: "O", label: "Observer", description: "Read-only access", value: "observer" },
    { key: "P", label: "Operator", description: "Operational access", value: "operator" },
    { key: "T", label: "Technician", description: "Maintenance access", value: "technician" },
    { key: "A", label: "Administrator", description: "Full access", value: "administrator" },
    { key: "D", label: "Director", description: "Strategic command access", value: "director" },
  ];
  const zoneChoices = [
    { key: "U", label: "Underground", description: "Primary bunker node", value: "underground" },
    { key: "S", label: "Surface", description: "Surface relay node", value: "surface" },
    { key: "C", label: "Containment", description: "Containment control node", value: "containment" },
    { key: "R", label: "Reactor", description: "Reactor operations node", value: "reactor" },
    { key: "K", label: "PS-Core", description: "Pico Sacro core node", value: "ps-core" },
  ];
  const statusNodeLine = "CLIENT NODE: DRACONIS-07 | FACILITY: PS-01 | AUTH LATENCY: 14MS";
  const blockWidth = statusNodeLine.length;
  const sessionCommand = `PS C:\\DRACONIS\\AUTH> ./grant-session --role ${selectedRole} --zone ${selectedZone}`;
  const statusCommand = "PS C:\\DRACONIS\\AUTH> ./draconis-status";
  const statusBlockTitle = formatDotTitle("DRACONIS STATUS [PS-01]", blockWidth);
  const telemetryBlockTitle = formatDotTitle("LIVE TELEMETRY [PS-01]", blockWidth);
  const bootLines = [
    formatDotLine("DRACONIS CORE LINK [PS-01]", "OK", blockWidth),
    formatDotLine("IGNIS RADIOTHERMAL MODULE [PS-01]", "ONLINE", blockWidth),
    formatDotLine("CASTRO CONTAINMENT BUS [PS-01]", "STABLE", blockWidth),
    formatDotLine("QUEEN AUTHORIZATION GATE [PS-01]", "READY", blockWidth),
  ];
  const telemetryLines = [
    formatDotLine("PS-01 PRIMARY AIRLOCK PRESSURE", "1.03 BAR", blockWidth),
    formatDotLine("PS-01 GAMMA RADIATION INDEX", "0.08 M/SV", blockWidth),
    formatDotLine("PS-01 SURFACE SENSOR FEED", "DEGRADED", blockWidth),
    formatDotLine("PS-01 RELIQUARY UPS BANK", "98% CHARGE", blockWidth),
    formatDotLine("PS-01 WATCHTOWER UPLINK", "VERIFIED", blockWidth),
  ];
  const introLines = [
    "Underlying Runtime: Windows PowerShell 7.5.0",
    "(C) 2026 Consorcio Pico Sacro. All rights reserved.",
    "CORE: Draconis Subsurface Engineering",
    `FACILITY: PS-01 | STATUS: OPERATIONAL | UPTIME: ${formatUptime(uptimeSeconds)}`,
  ];
  const pssiLine = "PSSI Secure Operations Shell [Build 3.2.17-UG]";
  const asciiCommand = "PS C:\\DRACONIS\\AUTH> type .\\PSSI-banner.txt";
  const gateCommand = "PS C:\\DRACONIS\\AUTH> open-access-gate --interactive";
  const secureChannelCommand = "PS C:\\DRACONIS\\AUTH> open-secure-channel";
  const secureChannelLines = [
    "SECURE AUTH CHANNEL INITIALIZED",
    "Echo suppression active.",
    "Audit logging enabled.",
  ];
  const asciiLines = asciiLogo.replace(/\s+$/, "").split(/\r?\n/);
  const roleMenuLines = [
    "SELECT REQUESTED ROLE:",
    ...roleChoices.map((choice) => `--- [${choice.key}] ${choice.label} - ${choice.description}`),
    "CHOICE [O,P,T,A,D] (DEFAULT IS \"P\"):",
  ];
  const zoneMenuLines = [
    `ROLE SELECTED: ${selectedRole.toUpperCase()}`,
    "SELECT TARGET ZONE:",
    ...zoneChoices.map((choice) => `--- [${choice.key}] ${choice.label} - ${choice.description}`),
    "CHOICE [U,S,C,R,K] (DEFAULT IS \"U\"):",
  ];
  const pssiDone = pssiChars >= pssiLine.length;
  const introDone = pssiDone && introStep >= introLines.length;
  const bannerDone = !asciiLogo || (asciiCmdChars >= asciiCommand.length && asciiStep >= asciiLines.length);
  const terminalInputSx = {
    minWidth: 220,
    flex: 1,
    "& .MuiInputBase-root": {
      bgcolor: "transparent !important",
      fontFamily: 'ui-monospace, "IBM Plex Mono", Consolas, monospace',
      fontSize: "0.75rem",
      lineHeight: 1.35,
    },
    "& .MuiInputBase-input": {
      color: "text.primary",
      bgcolor: "transparent !important",
      px: 0,
      fontFamily: 'ui-monospace, "IBM Plex Mono", Consolas, monospace',
      fontSize: "0.75rem",
      lineHeight: 1.35,
      caretColor: "#42FF8C",
    },
    "& .MuiInputBase-input:-webkit-autofill": {
      WebkitTextFillColor: "#42FF8C",
      WebkitBoxShadow: "0 0 0 100px transparent inset",
      boxShadow: "0 0 0 100px transparent inset",
      transition: "background-color 9999s ease-out 0s",
      borderRadius: 0,
    },
    "& .MuiInputBase-input:-webkit-autofill:hover, & .MuiInputBase-input:-webkit-autofill:focus, & .MuiInputBase-input:-webkit-autofill:active":
      {
        WebkitTextFillColor: "#42FF8C",
        WebkitBoxShadow: "0 0 0 100px transparent inset",
        boxShadow: "0 0 0 100px transparent inset",
      },
    "& .MuiInput-underline:before": { borderBottomColor: "rgba(66, 255, 140, 0.35)" },
    "& .MuiInput-underline:hover:not(.Mui-disabled):before": {
      borderBottomColor: "rgba(66, 255, 140, 0.6)",
    },
    "& .MuiInput-underline:after": { borderBottomColor: "rgba(66, 255, 140, 0.9)" },
  };

  const renderTokenizedLine = (line: string, key?: string, forceClass?: TerminalToken["className"]) => (
    <Box component="span" key={key ?? line}>
      {(forceClass ? [{ text: line, className: forceClass }] : tokenizeLine(line)).map((token, idx) => (
        <Box component="span" key={`${key ?? line}-${idx}`} className={token.className}>
          {token.text}
        </Box>
      ))}
    </Box>
  );

  useEffect(() => {
    if (!booting || !introDone || !bannerDone || !sessionConfigured) return;
    const timer = window.setTimeout(() => {
      if (typedChars < sessionCommand.length) {
        setTypedChars((prev) => prev + 1);
        return;
      }

      if (statusCmdChars < statusCommand.length) {
        setStatusCmdChars((prev) => prev + 1);
        return;
      }

      if (bootStep < bootLines.length) {
        setBootStep((prev) => prev + 1);
        return;
      }

      if (telemetryStep < telemetryLines.length) {
        setTelemetryStep((prev) => prev + 1);
        return;
      }

      setBooting(false);
    }, typedChars < sessionCommand.length ? 24 : statusCmdChars < statusCommand.length ? 22 : bootStep < bootLines.length ? 220 : telemetryStep < telemetryLines.length ? 160 : 320);
    return () => window.clearTimeout(timer);
  }, [booting, introDone, bannerDone, sessionConfigured, typedChars, statusCmdChars, bootStep, telemetryStep, sessionCommand.length, statusCommand.length, bootLines.length, telemetryLines.length]);

  useEffect(() => {
    if (pssiDone) return;
    const timer = window.setTimeout(() => {
      setPssiChars((prev) => prev + 1);
    }, 14);
    return () => window.clearTimeout(timer);
  }, [pssiDone, pssiChars, pssiLine.length]);

  useEffect(() => {
    if (!pssiDone || introStep >= introLines.length) return;
    const timer = window.setTimeout(() => {
      setIntroStep((prev) => prev + 1);
    }, 120);
    return () => window.clearTimeout(timer);
  }, [pssiDone, introStep, introLines.length]);

  useEffect(() => {
    let active = true;
    void fetch("/ascii-art.txt")
      .then((res) => (res.ok ? res.text() : ""))
      .then((text) => {
        if (active) {
          setAsciiLogo(text);
          setAsciiCmdChars(0);
          setAsciiStep(0);
        }
      })
      .catch(() => {
        if (active) setAsciiLogo("");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!introDone || !asciiLogo) return;
    if (asciiCmdChars < asciiCommand.length) {
      const cmdTimer = window.setTimeout(() => {
        setAsciiCmdChars((prev) => prev + 1);
      }, 16);
      return () => window.clearTimeout(cmdTimer);
    }
    if (asciiStep >= asciiLines.length) return;
    const timer = window.setTimeout(() => {
      setAsciiStep((prev) => prev + 1);
    }, 18);
    return () => window.clearTimeout(timer);
  }, [introDone, asciiLogo, asciiCmdChars, asciiCommand.length, asciiStep, asciiLines.length]);

  useEffect(() => {
    if (!introDone || !bannerDone || sessionConfigured) return;
    if (gateCmdChars >= gateCommand.length) return;
    const timer = window.setTimeout(() => {
      setGateCmdChars((prev) => prev + 1);
    }, 14);
    return () => window.clearTimeout(timer);
  }, [introDone, bannerDone, sessionConfigured, gateCmdChars, gateCommand.length]);

  useEffect(() => {
    if (gateCmdChars < gateCommand.length || sessionConfigured) return;
    if (choiceStep === "role") {
      if (roleMenuStep >= roleMenuLines.length) return;
      const timer = window.setTimeout(() => setRoleMenuStep((prev) => prev + 1), 80);
      return () => window.clearTimeout(timer);
    }
    if (zoneMenuStep >= zoneMenuLines.length) return;
    const timer = window.setTimeout(() => setZoneMenuStep((prev) => prev + 1), 80);
    return () => window.clearTimeout(timer);
  }, [gateCmdChars, gateCommand.length, sessionConfigured, choiceStep, roleMenuStep, roleMenuLines.length, zoneMenuStep, zoneMenuLines.length]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setUptimeSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (isTokenUsable(token)) {
      navigate("/app", { replace: true });
    } else {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
    }
  }, [navigate]);

  useEffect(() => {
    if (introDone && bannerDone && !sessionConfigured && gateCmdChars >= gateCommand.length) {
      choiceInputRef.current?.focus();
    }
  }, [introDone, bannerDone, sessionConfigured, gateCmdChars, gateCommand.length, choiceStep, roleMenuStep, zoneMenuStep]);

  useEffect(() => {
    if (!booting) {
      if (!secureIntroDone) return;
      usernameInputRef.current?.focus();
      setUserCaretPos(username.length);
    }
  }, [booting, secureIntroDone, username.length]);

  useEffect(() => {
    if (booting || secureIntroDone) return;
    if (secureCmdChars < secureChannelCommand.length) {
      const timer = window.setTimeout(() => setSecureCmdChars((prev) => prev + 1), 16);
      return () => window.clearTimeout(timer);
    }
    if (secureLineStep < secureChannelLines.length) {
      const timer = window.setTimeout(() => setSecureLineStep((prev) => prev + 1), 160);
      return () => window.clearTimeout(timer);
    }
    const doneTimer = window.setTimeout(() => setSecureIntroDone(true), 700);
    return () => window.clearTimeout(doneTimer);
  }, [booting, secureIntroDone, secureCmdChars, secureChannelCommand.length, secureLineStep, secureChannelLines.length]);

  const handleLogin = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await api.post<LoginResponse>("/auth/login/", { username, password });

      if (res.data.requires_2fa && res.data.challenge) {
        sessionStorage.setItem("twoFactorChallenge", res.data.challenge);
        navigate("/login/2fa", { replace: true });
        return;
      }

      if (!res.data.access || !res.data.refresh) {
        setError("Login response is incomplete");
        return;
      }

      localStorage.setItem("accessToken", res.data.access);
      localStorage.setItem("refreshToken", res.data.refresh);
      navigate("/app", { replace: true });
    } catch {
      setError("Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", p: 2 }}>
      <Paper
        className="terminal terminal-line"
        sx={{
          width: 610,
          maxWidth: "100%",
          p: 0,
          overflow: "hidden",
          borderRadius: 1,
        }}
      >
        <Box
          sx={{
            px: 1.5,
            py: 0.75,
            borderBottom: "1px solid",
            borderColor: "divider",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            bgcolor: "rgba(255,255,255,0.03)",
          }}
        >
          <Typography variant="caption" sx={{ letterSpacing: "0.08em" }}>
            Draconis Facility ACCESS TERMINAL
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            SESSION: LUPA OPS ENVIRONMENT
          </Typography>
        </Box>

        <Box sx={{ p: 3 }} className="terminal__pre">
          <Typography
            variant="caption"
            sx={{ display: "block", mb: 1, opacity: 0.8 }}
            className={!pssiDone ? "terminal-cursor" : undefined}
          >
            {renderTokenizedLine(pssiLine.slice(0, pssiChars), "pssi", "meta")}
          </Typography>
          {introLines.slice(0, introStep).map((line, idx) => (
            <Typography key={`intro-${idx}`} variant="caption" sx={{ display: "block", mb: 1, opacity: 0.8 }}>
              {renderTokenizedLine(line, `intro-${idx}`, "meta")}
            </Typography>
          ))}

          {introDone && asciiLogo && (
            <>
              <Typography
                variant="caption"
                sx={{ display: "block", mb: 0.5 }}
                className={asciiCmdChars < asciiCommand.length || asciiStep < asciiLines.length ? "terminal-cursor" : undefined}
              >
                {renderTokenizedLine(asciiCommand.slice(0, asciiCmdChars), "ascii-cmd")}
              </Typography>
              <Box
                component="pre"
                sx={{
                  m: 3,
                  ml: 0.5,
                  mb: 4,
                  color: "text.secondary",
                  fontFamily: '"IBM Plex Mono", "Share Tech Mono", monospace',
                  fontSize: 5,
                  lineHeight: 1,
                  letterSpacing: 1,
                  textTransform: "none",
                  whiteSpace: "pre",
                  overflow: "hidden",
                }}
              >
                {asciiLines.slice(0, asciiStep).join("\n")}
              </Box>
            </>
          )}

          {introDone && bannerDone && !sessionConfigured && (
            <Box
              component="form"
              onSubmit={(e) => {
                e.preventDefault();
                if (gateCmdChars < gateCommand.length) return;
                const key = choiceInput.trim().toUpperCase();
                if (choiceStep === "role") {
                  const selected = roleChoices.find((choice) => choice.key === (key || "P"));
                  if (!selected) {
                    setSessionConfigError(`INVALID ROLE CHOICE: ${key || "<empty>"}`);
                    return;
                  }
                  setSelectedRole(selected.value);
                  setChoiceStep("zone");
                  setZoneMenuStep(0);
                  setChoiceInput("");
                  setSessionConfigError(null);
                  return;
                }

                const selected = zoneChoices.find((choice) => choice.key === (key || "U"));
                if (!selected) {
                  setSessionConfigError(`INVALID ZONE CHOICE: ${key || "<empty>"}`);
                  return;
                }
                setSelectedZone(selected.value);
                setSessionConfigError(null);
                setTypedChars(0);
                setStatusCmdChars(0);
                setBootStep(0);
                setTelemetryStep(0);
                setSessionConfigured(true);
              }}
              sx={{ mb: 2 }}
            >
              <Typography
                variant="caption"
                sx={{ display: "block", mb: 0.5 }}
                className={gateCmdChars < gateCommand.length ? "terminal-cursor" : undefined}
              >
                {renderTokenizedLine(gateCommand.slice(0, gateCmdChars), "gate-cmd")}
              </Typography>
              {gateCmdChars >= gateCommand.length && choiceStep === "role" && (
                <>
                  {roleMenuLines.slice(0, roleMenuStep).map((line) => (
                    <Typography key={line} variant="caption" sx={{ display: "block", mb: 0.7, opacity: 0.8, lineHeight: 1.35 }}>
                      {renderTokenizedLine(line, `role-${line}`)}
                    </Typography>
                  ))}
                  {roleMenuStep >= roleMenuLines.length && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mt: 1, mb: 2, flexWrap: "wrap" }}>
                      <Typography variant="caption">
                        INPUT:
                      </Typography>
                      <Box sx={{ position: "relative", width: `${Math.max(choiceInput.length, 1) + 1}ch`, minWidth: "2ch", maxWidth: "12ch", flex: "0 0 auto" }}>
                        <TextField
                          variant="standard"
                          value={choiceInput}
                          onChange={(e) => setChoiceInput(e.target.value)}
                          inputRef={choiceInputRef}
                          InputProps={{ disableUnderline: true }}
                          sx={{
                            ...terminalInputSx,
                            width: "100%",
                            "& .MuiInput-underline:before, & .MuiInput-underline:after": {
                              display: "none",
                            },
                            "& .MuiInputBase-input": {
                              ...terminalInputSx["& .MuiInputBase-input"],
                              letterSpacing: "0.04em",
                              paddingBottom: 0,
                              caretColor: "transparent",
                            },
                          }}
                        />
                        <Box
                          component="span"
                          className="terminal-block-cursor"
                          sx={{ position: "absolute", left: `${choiceInput.length}ch`, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
                        />
                      </Box>
                    </Box>
                  )}
                </>
              )}

              {gateCmdChars >= gateCommand.length && choiceStep === "zone" && (
                <>
                  {zoneMenuLines.slice(0, zoneMenuStep).map((line) => (
                    <Typography key={line} variant="caption" sx={{ display: "block", mb: 0.35, opacity: 0.8 }}>
                      {renderTokenizedLine(line, `zone-${line}`)}
                    </Typography>
                  ))}
                  {zoneMenuStep >= zoneMenuLines.length && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mt: 0.5, mb: 1.5, flexWrap: "wrap" }}>
                      <Typography variant="caption">
                        INPUT:
                      </Typography>
                      <Box sx={{ position: "relative", width: `${Math.max(choiceInput.length, 1) + 1}ch`, minWidth: "2ch", maxWidth: "12ch", flex: "0 0 auto" }}>
                        <TextField
                          variant="standard"
                          value={choiceInput}
                          onChange={(e) => setChoiceInput(e.target.value)}
                          inputRef={choiceInputRef}
                          InputProps={{ disableUnderline: true }}
                          sx={{
                            ...terminalInputSx,
                            width: "100%",
                            "& .MuiInput-underline:before, & .MuiInput-underline:after": {
                              display: "none",
                            },
                            "& .MuiInputBase-input": {
                              ...terminalInputSx["& .MuiInputBase-input"],
                              letterSpacing: "0.04em",
                              paddingBottom: 0,
                              caretColor: "transparent",
                            },
                          }}
                        />
                        <Box
                          component="span"
                          className="terminal-block-cursor"
                          sx={{ position: "absolute", left: `${choiceInput.length}ch`, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
                        />
                      </Box>
                    </Box>
                  )}
                </>
              )}

              {sessionConfigError && (
                <Typography variant="caption" sx={{ display: "block", mb: 1.5, color: "error.main" }}>
                  {renderTokenizedLine(sessionConfigError, "session-error")}
                </Typography>
              )}

              {gateCmdChars >= gateCommand.length && (
                <Typography variant="caption" sx={{ display: "block", opacity: 0.8 }}>
                  {renderTokenizedLine(
                    `PRESS ENTER TO ${choiceStep === "role" ? "CONFIRM ROLE (DEFAULT: P)" : "CONFIRM ZONE (DEFAULT: U)"}.`,
                    "enter-help"
                  )}
                </Typography>
              )}
            </Box>
          )}

          {introDone && bannerDone && sessionConfigured && (
            <Typography variant="caption" sx={{ display: "block", mb: 0.75 }} className={booting && typedChars < sessionCommand.length ? "terminal-cursor" : undefined}>
              {renderTokenizedLine(sessionCommand.slice(0, typedChars), "session-cmd")}
            </Typography>
          )}

          {introDone && bannerDone && sessionConfigured && typedChars >= sessionCommand.length && (
            <Typography variant="caption" sx={{ display: "block", mb: 1 }} className={booting && statusCmdChars < statusCommand.length ? "terminal-cursor" : undefined}>
              {renderTokenizedLine(statusCommand.slice(0, statusCmdChars), "status-cmd")}
            </Typography>
          )}

          {statusCmdChars >= statusCommand.length && (
            <Typography variant="caption" sx={{ display: "block", mb: 1, color: "text.primary", opacity: 0.9, pl: 1.5 }}>
              {renderTokenizedLine(statusBlockTitle, "status-title")}
            </Typography>
          )}

          {bootLines.slice(0, Math.min(bootStep, bootLines.length)).map((line) => (
            <Typography key={line} variant="caption" sx={{ display: "block", color: "text.primary", mb: 0.5, pl: 1.5 }}>
              {renderTokenizedLine(line, `boot-${line}`)}
            </Typography>
          ))}

          {statusCmdChars >= statusCommand.length && bootStep >= bootLines.length && (
            <Box
              sx={{
                mt: 2.25,
                mb: 2.25,
                pl: 1.5,
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  display: "inline-block",
                  color: "text.primary",
                  px: 1,
                  py: 0.35,
                  border: "1px solid",
                  borderColor: "divider",
                  bgcolor: "rgba(255,255,255,0.02)",
                }}
              >
                {renderTokenizedLine(statusNodeLine, "status-node")}
              </Typography>
            </Box>
          )}

          {statusCmdChars >= statusCommand.length && (
            <Typography variant="caption" sx={{ display: "block", mt: 2, mb: 1.25, color: "text.primary", opacity: 0.9, pl: 1.5 }}>
              {renderTokenizedLine(telemetryBlockTitle, "telemetry-title")}
            </Typography>
          )}

          <Box sx={{ mt: 0.5, pl: 1.5 }}>
            {telemetryLines.slice(0, Math.min(telemetryStep, telemetryLines.length)).map((line) => (
              <Typography key={line} variant="caption" sx={{ display: "block", color: "text.primary", mb: 0.5 }}>
                {renderTokenizedLine(line, `telemetry-${line}`)}
              </Typography>
            ))}
          </Box>

          {booting && (
            <Typography variant="caption" className="terminal-cursor" sx={{ display: "block", mt: 1, mb: 2, color: "text.secondary" }}>
              {typedChars < sessionCommand.length
                ? !introDone
                  ? "LOADING SHELL HEADER"
                  : !bannerDone
                    ? "RENDERING COMPANY BANNER"
                    : !sessionConfigured
                      ? "AWAITING SESSION PARAMETERS"
                      : statusCmdChars < statusCommand.length && typedChars >= sessionCommand.length
                        ? "RUNNING DRACONIS STATUS"
                        : "TYPING COMMAND BUFFER"
                : bootStep < bootLines.length
                  ? "INITIALIZING COMMAND INTERFACE"
                  : telemetryStep < telemetryLines.length
                    ? "POLLING CONTAINMENT TELEMETRY"
                    : "UNLOCKING INPUT STREAM"}
            </Typography>
          )}

          {!booting && (
            <>
              {!secureIntroDone && (
                <Box sx={{ mt: 3, mb: 2 }}>
                  <Typography variant="caption" sx={{ display: "block", mb: 0.75 }} className={secureCmdChars < secureChannelCommand.length ? "terminal-cursor" : undefined}>
                    {renderTokenizedLine(secureChannelCommand.slice(0, secureCmdChars), "secure-channel-cmd")}
                  </Typography>
                  {secureChannelLines.slice(0, secureLineStep).map((line, idx) => (
                    <Typography key={`secure-line-${idx}`} variant="caption" sx={{ display: "block", mb: 0.5 }}>
                      {renderTokenizedLine(line, `secure-line-${idx}`)}
                    </Typography>
                  ))}
                </Box>
              )}

              {secureIntroDone && (
                <>
                  {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      {renderTokenizedLine(error, "login-error")}
                    </Alert>
                  )}

                  <Box
                    sx={{
                      mt: 3,
                      border: "1px solid",
                      borderColor: "divider",
                      bgcolor: "rgba(255,255,255,0.02)",
                      p: 1,
                      mb: 1.75,
                    }}
                  >
                    <Box
                      component="form"
                      onSubmit={(e) => {
                        e.preventDefault();
                        void handleLogin();
                      }}
                    >
                      <Box
                        sx={{
                          display: "grid",
                          gridTemplateColumns: { xs: "1fr", sm: "210px minmax(0, 1fr)" },
                          alignItems: "center",
                          columnGap: 0.85,
                          rowGap: 0.35,
                          mb: 0.30,
                        }}
                      >
                        <Typography variant="caption">
                          {renderTokenizedLine("PS C:\\DRACONIS\\AUTH> user", "user-prompt")}
                        </Typography>
                        <Box sx={{ position: "relative", minWidth: 0, width: "100%" }}>
                          <TextField
                            placeholder="operator.id"
                            variant="standard"
                            fullWidth
                            inputRef={usernameInputRef}
                            value={username}
                            onChange={(e) => {
                              setUsername(e.target.value);
                              setUserCaretPos(e.target.selectionStart ?? e.target.value.length);
                            }}
                            onClick={(e) => setUserCaretPos((e.target as HTMLInputElement).selectionStart ?? username.length)}
                            onKeyUp={(e) => setUserCaretPos((e.target as HTMLInputElement).selectionStart ?? username.length)}
                            onSelect={(e) => setUserCaretPos((e.target as HTMLInputElement).selectionStart ?? username.length)}
                            autoComplete="username"
                            InputProps={{ disableUnderline: true }}
                            sx={{
                              ...terminalInputSx,
                              "& .MuiInput-underline:before, & .MuiInput-underline:after": {
                                display: "none",
                              },
                              "& .MuiInputBase-input": {
                                ...terminalInputSx["& .MuiInputBase-input"],
                                letterSpacing: 0,
                                caretColor: "transparent",
                              }
                            }}
                          />
                          <Box
                            component="span"
                            className="terminal-block-cursor"
                            sx={{ position: "absolute", left: `${userCaretPos}ch`, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
                          />
                        </Box>
                      </Box>

                      <Box
                        sx={{
                          display: "grid",
                          gridTemplateColumns: { xs: "1fr", sm: "210px minmax(0, 1fr)" },
                          alignItems: "center",
                          columnGap: 0.85,
                          rowGap: 0.35,
                          mb: 0.30,
                        }}
                      >
                        <Typography variant="caption">
                          {renderTokenizedLine("PS C:\\DRACONIS\\AUTH> pass", "pass-prompt")}
                        </Typography>
                        <Box sx={{ position: "relative", minWidth: 0, width: "100%" }}>
                          <TextField
                            placeholder="••••••••••••"
                            type="password"
                            variant="standard"
                            fullWidth
                            inputRef={passwordInputRef}
                            value={password}
                            onChange={(e) => {
                              setPassword(e.target.value);
                              setPassCaretPos(e.target.selectionStart ?? e.target.value.length);
                            }}
                            onClick={(e) => setPassCaretPos((e.target as HTMLInputElement).selectionStart ?? password.length)}
                            onKeyUp={(e) => setPassCaretPos((e.target as HTMLInputElement).selectionStart ?? password.length)}
                            onSelect={(e) => setPassCaretPos((e.target as HTMLInputElement).selectionStart ?? password.length)}
                            autoComplete="current-password"
                            InputProps={{ disableUnderline: true }}
                            sx={{
                              ...terminalInputSx,
                              "& .MuiInput-underline:before, & .MuiInput-underline:after": {
                                display: "none",
                              },
                              "& .MuiInputBase-input": {
                                ...terminalInputSx["& .MuiInputBase-input"],
                                letterSpacing: 0,
                                caretColor: "transparent",
                              }
                            }}
                          />
                          <Box
                            component="span"
                            className="terminal-block-cursor"
                            sx={{ position: "absolute", left: `${passCaretPos}ch`, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
                          />
                        </Box>
                      </Box>

                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
                        <Button
                          type="submit"
                          variant="outlined"
                          disabled={loading || !username.trim() || !password.trim()}
                          sx={{ minWidth: 170 }}
                        >
                          {loading ? "AUTHENTICATING..." : "EXECUTE LOGIN"}
                        </Button>

                        <Link component={RouterLink} to="/forgot-password" underline="hover" sx={{ fontSize: 12 }}>
                          RUN RECOVERY SCRIPT
                        </Link>
                      </Box>
                    </Box>
                  </Box>
                </>
              )}

              {!secureIntroDone && (
                <Typography variant="caption" className="terminal-cursor" sx={{ display: "block", mt: 1, mb: 2, color: "text.secondary" }}>
                  INITIALIZING SECURE AUTH CHANNEL
                </Typography>
              )}
            </>
          )}
        </Box>
      </Paper>
    </Box>
  );
}
