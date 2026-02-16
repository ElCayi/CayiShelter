import { Alert, Box, Button, Link, Paper, TextField, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { api } from "../services/api";

type LoginResponse = {
  access: string;
  refresh: string;
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
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

      const res = await api.post<LoginResponse>("/auth/token/", { username, password });
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
      <Paper sx={{ p: 4, width: 380 }}>
        <Typography variant="h6" sx={{ mb: 0.5 }}>
          Access restricted
        </Typography>

        <Typography variant="body2" sx={{ mb: 2, opacity: 0.8 }}>
          Multi-factor authentication required.
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
          <TextField
            label="Username"
            fullWidth
            sx={{ mb: 2 }}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
          />

          <TextField
            label="Password"
            type="password"
            fullWidth
            sx={{ mb: 2 }}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />

          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={loading || !username.trim() || !password.trim()}
          >
            {loading ? "Signing in..." : "Enter"}
          </Button>

          <Link
            component={RouterLink}
            to="/forgot-password"
            underline="hover"
            sx={{ display: "inline-block", mt: 1.5 }}
          >
            Forgot password?
          </Link>
        </Box>
      </Paper>
    </Box>
  );
}
