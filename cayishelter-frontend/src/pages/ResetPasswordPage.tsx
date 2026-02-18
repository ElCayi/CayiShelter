import { Alert, Box, Button, Link, Paper, TextField, Typography } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import { api } from "../services/api";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const { uid, token } = useParams<{ uid: string; token: string }>();
  const pass1InputRef = useRef<HTMLInputElement | null>(null);
  const [password1, setPassword1] = useState("");
  const [password2, setPassword2] = useState("");
  const [pass1CaretPos, setPass1CaretPos] = useState(0);
  const [pass2CaretPos, setPass2CaretPos] = useState(0);
  const [pass1Focused, setPass1Focused] = useState(false);
  const [pass2Focused, setPass2Focused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const terminalInputSx = {
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
      textTransform: "none",
      letterSpacing: "0.03em",
      caretColor: "transparent",
    },
    "& .MuiInput-underline:before, & .MuiInput-underline:after": {
      display: "none",
    },
  };

  const handleSubmit = async () => {
    if (!uid || !token) {
      setError("Invalid reset link");
      return;
    }
    if (password1 !== password2) {
      setError("Passwords do not match");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await api.post("/auth/password/reset/confirm/", {
        uid,
        token,
        new_password1: password1,
        new_password2: password2,
      });
      setDone(true);
      window.setTimeout(() => navigate("/login", { replace: true }), 1200);
    } catch (e: any) {
      const detail =
        e?.response?.data?.detail ??
        e?.response?.data?.new_password1?.[0] ??
        e?.response?.data?.token?.[0] ??
        "Could not reset password";
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    pass1InputRef.current?.focus();
    setPass1CaretPos(password1.length);
  }, []);

  return (
    <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", p: 2 }}>
      <Paper sx={{ p: 4, width: 420, maxWidth: "100%" }}>
        <Typography variant="h6" sx={{ mb: 0.5 }}>
          Set new password
        </Typography>
        <Typography variant="body2" sx={{ mb: 2, opacity: 0.8 }}>
          Enter your new password to complete recovery.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {done && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Password updated. Redirecting to login...
          </Alert>
        )}

        <Box
          component="form"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit();
          }}
        >
          <Typography variant="caption" sx={{ display: "block", mb: 0.55, opacity: 0.8 }}>
            New password
          </Typography>
          <Box
            sx={{
              mb: 2,
              px: 1,
              py: 0.3,
              border: "1px solid",
              borderColor: "divider",
              bgcolor: "rgba(255,255,255,0.02)",
              position: "relative",
            }}
          >
            <TextField
              type="password"
              variant="standard"
              inputRef={pass1InputRef}
              InputProps={{ disableUnderline: true }}
              fullWidth
              sx={terminalInputSx}
              value={password1}
              onFocus={() => setPass1Focused(true)}
              onBlur={() => setPass1Focused(false)}
              onChange={(e) => {
                setPassword1(e.target.value);
                setPass1CaretPos(e.target.selectionStart ?? e.target.value.length);
              }}
              onClick={(e) => setPass1CaretPos((e.target as HTMLInputElement).selectionStart ?? password1.length)}
              onKeyUp={(e) => setPass1CaretPos((e.target as HTMLInputElement).selectionStart ?? password1.length)}
              onSelect={(e) => setPass1CaretPos((e.target as HTMLInputElement).selectionStart ?? password1.length)}
              autoComplete="new-password"
            />
            {pass1Focused && (
              <Box
                component="span"
                className="terminal-block-cursor"
                sx={{ position: "absolute", left: `calc(8px + ${pass1CaretPos}ch)`, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
              />
            )}
          </Box>

          <Typography variant="caption" sx={{ display: "block", mb: 0.55, opacity: 0.8 }}>
            Repeat new password
          </Typography>
          <Box
            sx={{
              mb: 2,
              px: 1,
              py: 0.3,
              border: "1px solid",
              borderColor: "divider",
              bgcolor: "rgba(255,255,255,0.02)",
              position: "relative",
            }}
          >
            <TextField
              type="password"
              variant="standard"
              InputProps={{ disableUnderline: true }}
              fullWidth
              sx={terminalInputSx}
              value={password2}
              onFocus={() => setPass2Focused(true)}
              onBlur={() => setPass2Focused(false)}
              onChange={(e) => {
                setPassword2(e.target.value);
                setPass2CaretPos(e.target.selectionStart ?? e.target.value.length);
              }}
              onClick={(e) => setPass2CaretPos((e.target as HTMLInputElement).selectionStart ?? password2.length)}
              onKeyUp={(e) => setPass2CaretPos((e.target as HTMLInputElement).selectionStart ?? password2.length)}
              onSelect={(e) => setPass2CaretPos((e.target as HTMLInputElement).selectionStart ?? password2.length)}
              autoComplete="new-password"
            />
            {pass2Focused && (
              <Box
                component="span"
                className="terminal-block-cursor"
                sx={{ position: "absolute", left: `calc(8px + ${pass2CaretPos}ch)`, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
              />
            )}
          </Box>

          <Button type="submit" variant="contained" fullWidth disabled={loading || !password1 || !password2 || done}>
            {loading ? "Updating..." : "Update password"}
          </Button>
        </Box>

        <Link component={RouterLink} to="/login" underline="hover" sx={{ display: "inline-block", mt: 1.5 }}>
          Back to login
        </Link>
      </Paper>
    </Box>
  );
}
