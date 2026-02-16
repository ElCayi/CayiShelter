import { Box, Button, Paper, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

export default function ForgotPasswordSentPage() {
  return (
    <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", p: 2 }}>
      <Paper sx={{ p: 4, width: 420, maxWidth: "100%" }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Check your email
        </Typography>
        <Typography variant="body2" sx={{ mb: 3, opacity: 0.8 }}>
          If the account exists, reset instructions were sent. In development mode, check the backend terminal output.
        </Typography>

        <Button component={RouterLink} to="/login" variant="contained" fullWidth>
          Back to login
        </Button>
      </Paper>
    </Box>
  );
}
