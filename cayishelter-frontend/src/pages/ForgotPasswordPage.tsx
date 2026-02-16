import { Alert, Box, Button, Link, Paper, TextField, Typography } from "@mui/material";
import { useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { api } from "../services/api";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      await api.post("/auth/password/reset/", { email });
      navigate("/forgot-password/sent", { replace: true });
    } catch (e: any) {
      const detail =
        e?.response?.data?.detail ??
        e?.response?.data?.email?.[0] ??
        "Could not send reset email";
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", p: 2 }}>
      <Paper sx={{ p: 4, width: 420, maxWidth: "100%" }}>
        <Typography variant="h6" sx={{ mb: 0.5 }}>
          Reset password
        </Typography>
        <Typography variant="body2" sx={{ mb: 2, opacity: 0.8 }}>
          Enter your account email and we will send reset instructions.
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
            void handleSubmit();
          }}
        >
          <TextField
            label="Email"
            type="email"
            fullWidth
            sx={{ mb: 2 }}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />

          <Button type="submit" variant="contained" fullWidth disabled={loading || !email.trim()}>
            {loading ? "Sending..." : "Send reset link"}
          </Button>
        </Box>

        <Link component={RouterLink} to="/login" underline="hover" sx={{ display: "inline-block", mt: 1.5 }}>
          Back to login
        </Link>
      </Paper>
    </Box>
  );
}
