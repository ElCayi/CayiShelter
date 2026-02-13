import { Box, Button, Paper, TextField, Typography } from "@mui/material";

export default function LoginPage() {
  return (
    <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", p: 2 }}>
      <Paper sx={{ p: 4, width: 380 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Access restricted
        </Typography>
        <Typography variant="body2" sx={{ mb: 3, opacity: 0.8 }}>
          Multi-factor authentication required.
        </Typography>

        <TextField label="Email" fullWidth sx={{ mb: 2 }} />
        <TextField label="Password" type="password" fullWidth sx={{ mb: 2 }} />

        <Button variant="contained" fullWidth>
          Enter
        </Button>

        <Button variant="text" fullWidth sx={{ mt: 1 }}>
          Forgot password?
        </Button>
      </Paper>
    </Box>
  );
}
