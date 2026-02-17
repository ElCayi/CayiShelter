import { Alert, Box, Button, Chip, Paper, TextField, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { api } from "../services/api";

type TwoFactorStatus = {
  is_enabled: boolean;
};

type SetupResponse = {
  secret: string;
  otpauth_url: string;
};

export default function TwoFactorPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const [pendingSecret, setPendingSecret] = useState<string | null>(null);
  const [pendingOtpUrl, setPendingOtpUrl] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [code, setCode] = useState("");

  const loadStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<TwoFactorStatus>("/auth/2fa/status/");
      setIsEnabled(res.data.is_enabled);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Failed to load 2FA status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStatus();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const generateQr = async () => {
      if (!pendingOtpUrl) {
        setQrDataUrl(null);
        return;
      }
      try {
        const dataUrl = await QRCode.toDataURL(pendingOtpUrl, { width: 220, margin: 1 });
        if (!cancelled) setQrDataUrl(dataUrl);
      } catch {
        if (!cancelled) setQrDataUrl(null);
      }
    };

    void generateQr();
    return () => {
      cancelled = true;
    };
  }, [pendingOtpUrl]);

  const startSetup = async () => {
    try {
      setError(null);
      const res = await api.post<SetupResponse>("/auth/2fa/setup/");
      setPendingSecret(res.data.secret);
      setPendingOtpUrl(res.data.otpauth_url);
      setCode("");
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Failed to start 2FA setup");
    }
  };

  const confirmSetup = async () => {
    try {
      setError(null);
      await api.post("/auth/2fa/confirm/", { code });
      setPendingSecret(null);
      setPendingOtpUrl(null);
      setQrDataUrl(null);
      setCode("");
      await loadStatus();
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Invalid verification code");
    }
  };

  const disable2fa = async () => {
    try {
      setError(null);
      await api.post("/auth/2fa/disable/", { code });
      setCode("");
      await loadStatus();
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Could not disable 2FA");
    }
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Security
      </Typography>

      <Paper sx={{ p: 3, maxWidth: 720 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Two-Factor Authentication (TOTP)
        </Typography>

        <Chip
          label={isEnabled ? "2FA Enabled" : "2FA Disabled"}
          color={isEnabled ? "success" : "default"}
          sx={{ mb: 2 }}
        />

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {loading ? (
          <Typography variant="body2">Loading security status...</Typography>
        ) : isEnabled ? (
          <Box>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Enter a valid authenticator code to disable 2FA.
            </Typography>
            <TextField
              label="Authenticator code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputProps={{ inputMode: "numeric", pattern: "[0-9]*", maxLength: 6 }}
              sx={{ mb: 2 }}
            />
            <Box>
              <Button color="error" variant="outlined" onClick={() => void disable2fa()} disabled={code.length !== 6}>
                Disable 2FA
              </Button>
            </Box>
          </Box>
        ) : (
          <Box>
            {!pendingSecret ? (
              <Button variant="contained" onClick={() => void startSetup()}>
                Enable 2FA
              </Button>
            ) : (
              <>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Scan this QR with Google/Microsoft Authenticator, then enter the 6-digit code.
                </Alert>
                {qrDataUrl && (
                  <Box sx={{ mb: 2 }}>
                    <Box
                      component="img"
                      src={qrDataUrl}
                      alt="2FA QR code"
                      sx={{ width: 220, height: 220, border: "1px solid #ddd", borderRadius: 1 }}
                    />
                  </Box>
                )}
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Secret (backup): <strong>{pendingSecret}</strong>
                </Typography>
                {pendingOtpUrl && (
                  <Typography variant="caption" sx={{ display: "block", mb: 2, opacity: 0.8 }}>
                    URI: {pendingOtpUrl}
                  </Typography>
                )}

                <TextField
                  label="Authenticator code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputProps={{ inputMode: "numeric", pattern: "[0-9]*", maxLength: 6 }}
                  sx={{ mb: 2 }}
                />
                <Box>
                  <Button variant="contained" onClick={() => void confirmSetup()} disabled={code.length !== 6}>
                    Confirm and enable
                  </Button>
                </Box>
              </>
            )}
          </Box>
        )}
      </Paper>
    </Box>
  );
}
