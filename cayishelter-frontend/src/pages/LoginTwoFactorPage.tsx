import { Alert, Box, Button, Link, Paper, TextField, Typography } from "@mui/material";
import { useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { api } from "../services/api";

type VerifyResponse = {
  access: string;
  refresh: string;
};

export default function LoginTwoFactorPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const challenge = sessionStorage.getItem("twoFactorChallenge");

  const handleVerify = async () => {
    if (!challenge) {
      navigate("/login", { replace: true });
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await api.post<VerifyResponse>("/auth/2fa/verify/", { challenge, code });
      localStorage.setItem("accessToken", res.data.access);
      localStorage.setItem("refreshToken", res.data.refresh);
      sessionStorage.removeItem("twoFactorChallenge");
      navigate("/app", { replace: true });
    } catch (e: any) {
      const detail = e?.response?.data?.detail ?? "Invalid verification code";
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", p: 2 }}>
      <Paper sx={{ p: 4, width: 380, maxWidth: "100%" }}>
        <Typography variant="h6" sx={{ mb: 0.5 }}>
          Two-factor verification
        </Typography>
        <Typography variant="body2" sx={{ mb: 2, opacity: 0.8 }}>
          Enter the 6-digit code from your Authenticator app.
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
            void handleVerify();
          }}
        >
          <TextField
            label="Verification code"
            fullWidth
            sx={{ mb: 2 }}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputProps={{ inputMode: "numeric", pattern: "[0-9]*", maxLength: 6 }}
            autoComplete="one-time-code"
          />

          <Button type="submit" variant="contained" fullWidth disabled={loading || code.length !== 6}>
            {loading ? "Verifying..." : "Verify"}
          </Button>
        </Box>

        <Link component={RouterLink} to="/login" underline="hover" sx={{ display: "inline-block", mt: 1.5 }}>
          Back to login
        </Link>
      </Paper>
    </Box>
  );
}
