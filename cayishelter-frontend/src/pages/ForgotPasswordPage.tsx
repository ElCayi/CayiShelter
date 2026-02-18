import { Alert, Box, Button, Link, Paper, TextField, Typography } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { api } from "../services/api";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const emailInputRef = useRef<HTMLInputElement | null>(null);
  const [email, setEmail] = useState("");
  const [emailCaretPos, setEmailCaretPos] = useState(0);
  const [emailFocused, setEmailFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  useEffect(() => {
    emailInputRef.current?.focus();
    setEmailCaretPos(email.length);
  }, []);

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
          <Typography variant="caption" sx={{ display: "block", mb: 0.55, opacity: 0.8 }}>
            Email
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
              type="email"
              variant="standard"
              inputRef={emailInputRef}
              InputProps={{ disableUnderline: true }}
              fullWidth
              sx={terminalInputSx}
              value={email}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailCaretPos(e.target.selectionStart ?? e.target.value.length);
              }}
              onClick={(e) => setEmailCaretPos((e.target as HTMLInputElement).selectionStart ?? email.length)}
              onKeyUp={(e) => setEmailCaretPos((e.target as HTMLInputElement).selectionStart ?? email.length)}
              onSelect={(e) => setEmailCaretPos((e.target as HTMLInputElement).selectionStart ?? email.length)}
              autoComplete="email"
            />
            {emailFocused && (
              <Box
                component="span"
                className="terminal-block-cursor"
                sx={{ position: "absolute", left: `calc(8px + ${emailCaretPos}ch)`, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
              />
            )}
          </Box>

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
