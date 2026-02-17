import { Outlet, Link, useLocation } from "react-router-dom";
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Toolbar,
  AppBar,
  Typography,
  Chip,
} from "@mui/material";

const drawerWidth = 260;

function PixelGlyph({ glyph }: { glyph: string }) {
  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        width: 18,
        justifyContent: "center",
        fontFamily: '"IBM Plex Mono", "Share Tech Mono", monospace',
        fontSize: 13,
        lineHeight: 1,
        color: "text.primary",
      }}
    >
      {glyph}
    </Box>
  );
}

const navGroups = [
  {
    title: "CORE SYSTEMS",
    items: [
      { label: "LIFE SUPPORT", to: "/app/status", glyph: "[#]", code: "SYS-01" },
      { label: "INCIDENT LOG", to: "/app/events", glyph: "[!]", code: "SYS-02" },
      { label: "ORBITAL SENSORS", to: "/app/external", glyph: "[~]", code: "SYS-03" },
    ],
  },
  {
    title: "CONTROL",
    items: [
      { label: "LABORATORY", to: null, glyph: "[+]", code: "CTL-01", offline: true },
      { label: "PERSONNEL", to: null, glyph: "[*]", code: "CTL-02", offline: true },
      { label: "SECURITY GRID", to: "/app/security", glyph: "[X]", code: "CTL-03" },
    ],
  },
];

export default function DashboardLayout() {
  const location = useLocation();

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
        <Toolbar sx={{ display: "flex", justifyContent: "space-between", minHeight: "72px !important" }}>
          <Box>
            <Typography variant="h6" noWrap>
              Cayishelter - Bio-Radiological Command
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", letterSpacing: "0.08em" }}>
              Clearance Level: Omega
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, border: "1px solid", borderColor: "divider", px: 1, py: 0.5 }}>
            <PixelGlyph glyph="[X]" />
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Military Scientific Command Interface
            </Typography>
          </Box>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: drawerWidth,
            boxSizing: "border-box",
            borderRight: "1px solid",
            borderColor: "divider",
          },
        }}
      >
        <Toolbar />
        <List sx={{ pt: 0 }}>
          {navGroups.map((group) => (
            <Box key={group.title} sx={{ mb: 1 }}>
              <Typography
                variant="caption"
                sx={{ px: 2, py: 1, color: "text.secondary", display: "block", borderTop: "1px solid", borderColor: "divider" }}
              >
                - {group.title} -
              </Typography>

              {group.items.map((it) => {
                const selected = it.to ? location.pathname === it.to : false;
                const isOffline = Boolean(it.offline);

                return (
                  <ListItemButton
                    key={`${group.title}-${it.code}`}
                    component={it.to ? Link : "button"}
                    to={it.to ?? undefined}
                    selected={selected}
                    disabled={isOffline}
                    sx={{
                      borderTop: "1px solid",
                      borderColor: "divider",
                      alignItems: "center",
                      gap: 1,
                      py: 1.25,
                    }}
                  >
                    <PixelGlyph glyph={it.glyph} />
                    <ListItemText
                      primary={it.label}
                      secondary={it.code}
                      slotProps={{
                        primary: { sx: { fontSize: 13, letterSpacing: "0.06em" } },
                        secondary: { sx: { fontSize: 10, color: "text.secondary" } },
                      }}
                    />
                    {isOffline && <Chip label="OFFLINE" size="small" color="warning" />}
                  </ListItemButton>
                );
              })}
            </Box>
          ))}
        </List>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3, backgroundColor: "background.default" }}>
        <Toolbar />
        <Box className="terminal-line terminal-cursor" sx={{ mb: 2 }}>
          CAYISHELTER://OMEGA/SYSTEM_MONITOR/READY
        </Box>
        <Outlet />
      </Box>
    </Box>
  );
}
