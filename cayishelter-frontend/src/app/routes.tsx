import { Routes, Route, Navigate } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import LoginPage from "../pages/LoginPage";
import LoginTwoFactorPage from "../pages/LoginTwoFactorPage";
import ForgotPasswordPage from "../pages/ForgotPasswordPage";
import ForgotPasswordSentPage from "../pages/ForgotPasswordSentPage";
import ResetPasswordPage from "../pages/ResetPasswordPage";
import StatusPage from "../pages/StatusPage";
import EventsPage from "../pages/EventsPage";
import ExternalFeedPage from "../pages/ExternalFeedPage";
import TwoFactorPage from "../pages/TwoFactorPage";
import ProtectedRoute from "./ProtectedRoute";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/login/2fa" element={<LoginTwoFactorPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/forgot-password/sent" element={<ForgotPasswordSentPage />} />
      <Route path="/reset-password/:uid/:token" element={<ResetPasswordPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/app" element={<DashboardLayout />}>
          <Route index element={<Navigate to="status" replace />} />
          <Route path="status" element={<StatusPage />} />
          <Route path="events" element={<EventsPage />} />
          <Route path="external" element={<ExternalFeedPage />} />
          <Route path="security" element={<TwoFactorPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  );
}
