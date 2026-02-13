import { Outlet, Link, useLocation } from "react-router-dom";
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  AppBar,
  Typography,
} from "@mui/material";

import DashboardIcon from "@mui/icons-material/Dashboard";
import ReportIcon from "@mui/icons-material/Report";
import PublicIcon from "@mui/icons-material/Public";
import ShieldIcon from "@mui/icons-material/Shield";

const drawerWidth = 260;

const navItems = [
  { label: "Refuge Status", to: "/app/status", icon: <DashboardIcon /> },
  { label: "Events", to: "/app/events", icon: <ReportIcon /> },
  { label: "External Feed", to: "/app/external", icon: <PublicIcon /> },
];

export default function DashboardLayout() {
  const location = useLocation();

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
        <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
          <Typography variant="h6" noWrap>
            CayiShelter — Underground Control System
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <ShieldIcon fontSize="small" />
            <Typography variant="body2" sx={{ opacity: 0.85 }}>
              Restricted Access
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
          },
        }}
      >
        <Toolbar />
        <List>
          {navItems.map((it) => (
            <ListItemButton
              key={it.to}
              component={Link}
              to={it.to}
              selected={location.pathname === it.to}
            >
              <ListItemIcon>{it.icon}</ListItemIcon>
              <ListItemText primary={it.label} />
            </ListItemButton>
          ))}
        </List>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}
