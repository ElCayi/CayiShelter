import { Routes, Route, Navigate } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import LoginPage from "../pages/LoginPage";
import StatusPage from "../pages/StatusPage";
import EventsPage from "../pages/EventsPage";
import ExternalFeedPage from "../pages/ExternalFeedPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route path="/app" element={<DashboardLayout />}>
        <Route index element={<Navigate to="status" replace />} />
        <Route path="status" element={<StatusPage />} />
        <Route path="events" element={<EventsPage />} />
        <Route path="external" element={<ExternalFeedPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  );
}
