import { Alert, Box, Button, Link, Paper, TextField, Typography } from "@mui/material";
import { useEffect, useState } from "react";
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

export default function LoginPage() {
  const navigate = useNavigate();
  const [booting, setBooting] = useState(true);
  const [pssiChars, setPssiChars] = useState(0);
  const [introStep, setIntroStep] = useState(0);
  const [typedChars, setTypedChars] = useState(0);
  const [bootStep, setBootStep] = useState(0);
  const [telemetryStep, setTelemetryStep] = useState(0);
  const [asciiLogo, setAsciiLogo] = useState("");
  const [asciiCmdChars, setAsciiCmdChars] = useState(0);
  const [asciiStep, setAsciiStep] = useState(0);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const sessionCommand = "PS C:\\CAYISHELTER\\AUTH> ./grant-session --role operator --zone underground";
  const bootLines = [
    "CAYISHELTER BIOS LINK.............OK",
    "RADIOTROPHIC MODULE...............ONLINE",
    "CONTAINMENT BUS...................STABLE",
    "AUTHORIZATION GATE................READY",
  ];
  const telemetryLines = [
    "NODE: CAYI-07 | AUTH SERVER LATENCY: 14MS",
    "AIRLOCK PRESSURE................. 1.03 BAR",
    "GAMMA INDEX...................... 0.08 M/SV",
    "EXTERNAL FEED.................... DEGRADED",
    "UPS BANK......................... 98% CHARGE",
    "WATCHTOWER UPLINK............... VERIFIED",
  ];
  const introLines = [
    "Underlying Runtime: Windows PowerShell 7.5.0",
    "(C) 2026 Consorcio Pico Sacro. All rights reserved.",
    "CORE: Draconis Subsurface Engineering",
    "NODE: PS-01 | STATUS: OPERATIONAL | UPTIME: 14 DAYS, 6 HOURS, 23 MINUTES",
  ];
  const pssiLine = "PSSI Secure Operations Shell [Build 3.2.17-UG]";
  const asciiCommand = "PS C:\\CAYISHELTER\\AUTH> type .\\PSSI-banner.txt";
  const asciiLines = asciiLogo.replace(/\s+$/, "").split(/\r?\n/);
  const pssiDone = pssiChars >= pssiLine.length;
  const introDone = pssiDone && introStep >= introLines.length;
  const bannerDone = !asciiLogo || (asciiCmdChars >= asciiCommand.length && asciiStep >= asciiLines.length);
  const terminalInputSx = {
    minWidth: 220,
    flex: 1,
    "& .MuiInputBase-root": { bgcolor: "transparent !important" },
    "& .MuiInputBase-input": {
      color: "text.primary",
      bgcolor: "transparent !important",
      px: 0,
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

  useEffect(() => {
    if (!booting || !introDone || !bannerDone) return;
    const timer = window.setTimeout(() => {
      if (typedChars < sessionCommand.length) {
        setTypedChars((prev) => prev + 1);
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
    }, typedChars < sessionCommand.length ? 24 : bootStep < bootLines.length ? 260 : telemetryStep < telemetryLines.length ? 170 : 320);
    return () => window.clearTimeout(timer);
  }, [booting, introDone, bannerDone, typedChars, bootStep, telemetryStep, sessionCommand.length, bootLines.length, telemetryLines.length]);

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
    const token = localStorage.getItem("accessToken");
    if (isTokenUsable(token)) {
      navigate("/app", { replace: true });
    } else {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
    }
  }, [navigate]);

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
        className="terminal-line"
        sx={{
          width: 720,
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
            CAYISHELTER ACCESS TERMINAL
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.7 }}>
            SESSION: LUPA OPS ENVIRONMENT
          </Typography>
        </Box>

        <Box sx={{ p: 3 }}>
          <Typography
            variant="caption"
            sx={{ display: "block", mb: 1, opacity: 0.8 }}
            className={!pssiDone ? "terminal-cursor" : undefined}
          >
            {pssiLine.slice(0, pssiChars)}
          </Typography>
          {introLines.slice(0, introStep).map((line) => (
            <Typography key={line} variant="caption" sx={{ display: "block", mb: 1, opacity: 0.8 }}>
              {line}
            </Typography>
          ))}

          {introDone && asciiLogo && (
            <>
              <Typography
                variant="caption"
                sx={{ display: "block", mb: 0.5 }}
                className={asciiCmdChars < asciiCommand.length || asciiStep < asciiLines.length ? "terminal-cursor" : undefined}
              >
                {asciiCommand.slice(0, asciiCmdChars)}
              </Typography>
              <Box
                component="pre"
                sx={{
                  m: 3,
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

          {introDone && bannerDone && (
            <Typography variant="caption" sx={{ display: "block", mb: 1 }} className={booting && typedChars < sessionCommand.length ? "terminal-cursor" : undefined}>
              {sessionCommand.slice(0, typedChars)}
            </Typography>
          )}

          {bootLines.slice(0, Math.min(bootStep, bootLines.length)).map((line) => (
            <Typography key={line} variant="caption" sx={{ display: "block", color: "text.primary", mb: 0.5 }}>
              {line}
            </Typography>
          ))}

          {telemetryLines.slice(0, Math.min(telemetryStep, telemetryLines.length)).map((line) => (
            <Typography key={line} variant="caption" sx={{ display: "block", color: "text.secondary", mb: 0.5 }}>
              {line}
            </Typography>
          ))}

          {booting && (
            <Typography variant="caption" className="terminal-cursor" sx={{ display: "block", mt: 1, mb: 2, color: "text.secondary" }}>
              {typedChars < sessionCommand.length
                ? !introDone
                  ? "LOADING SHELL HEADER"
                  : bannerDone
                    ? "TYPING COMMAND BUFFER"
                    : "RENDERING COMPANY BANNER"
                : bootStep < bootLines.length
                  ? "INITIALIZING COMMAND INTERFACE"
                  : telemetryStep < telemetryLines.length
                    ? "POLLING CONTAINMENT TELEMETRY"
                    : "UNLOCKING INPUT STREAM"}
            </Typography>
          )}

          {!booting && (
            <>
              <Typography variant="caption" sx={{ display: "block", mb: 2 }}>
                ACCESS RESTRICTED. MULTI-FACTOR AUTHENTICATION REQUIRED.
              </Typography>

              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              <Box
                component="form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleLogin();
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 7, flexWrap: "wrap" }}>
                  <Typography variant="caption" sx={{ minWidth: 190 }}>
                    PS C:\CAYISHELTER\AUTH&gt; user
                  </Typography>
                  <TextField
                    placeholder="operator.id"
                    variant="standard"
                    fullWidth
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    sx={{
                      ...terminalInputSx,
                      "& .MuiInputBase-input": {
                        ...terminalInputSx["& .MuiInputBase-input"],
                        letterSpacing: "0.04em",
                      }
                    }}
                  />
                </Box>

                <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 3, flexWrap: "wrap" }}>
                  <Typography variant="caption" sx={{ minWidth: 190 }}>
                    PS C:\CAYISHELTER\AUTH&gt; pass
                  </Typography>
                  <TextField
                    placeholder="••••••••••••"
                    type="password"
                    variant="standard"
                    fullWidth
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    sx={{
                      ...terminalInputSx,
                      "& .MuiInputBase-input": {
                        ...terminalInputSx["& .MuiInputBase-input"],
                        letterSpacing: "0.1em",
                      }
                    }}
                  />
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
            </>
          )}
        </Box>
      </Paper>
    </Box>
  );
}
