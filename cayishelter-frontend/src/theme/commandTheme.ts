import { createTheme } from "@mui/material/styles";

const phosphor = "#42FF8C";
const carbon = "#0C0F0E";
const panel = "#161A18";
const warning = "#FFB000";
const critical = "#FF3030";
const steel = "#6F7F74";

export const commandTheme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: phosphor },
    secondary: { main: steel },
    warning: { main: warning },
    error: { main: critical },
    success: { main: phosphor },
    background: {
      default: carbon,
      paper: panel,
    },
    text: {
      primary: phosphor,
      secondary: steel,
    },
    divider: steel,
  },
  shape: {
    borderRadius: 0,
  },
  typography: {
    fontFamily: '"IBM Plex Mono", "Share Tech Mono", monospace',
    button: {
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      fontWeight: 700,
    },
    h5: {
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      fontWeight: 700,
    },
    h6: {
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      fontWeight: 700,
    },
    body2: {
      letterSpacing: "0.04em",
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: carbon,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          border: `1px solid ${steel}`,
          boxShadow: "none",
          backgroundImage: "none",
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          backgroundColor: panel,
          borderBottom: `1px solid ${steel}`,
          boxShadow: "none",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: steel,
          boxShadow: "none",
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: steel,
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: phosphor,
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: phosphor,
            borderWidth: 1,
          },
        },
        input: {
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: steel,
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        select: {
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          "&.Mui-selected": {
            backgroundColor: "rgba(66,255,140,0.12)",
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          border: `1px solid ${steel}`,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: `1px solid ${steel}`,
        },
        head: {
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          fontWeight: 700,
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          "&:hover": {
            backgroundColor: "rgba(66,255,140,0.06)",
          },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          border: `1px solid ${steel}`,
        },
      },
    },
  },
});
