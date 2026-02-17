import axios from "axios";

export const api = axios.create({
  baseURL: "http://127.0.0.1:8000/api",
});

function isPublicEndpoint(url: string) {
  const normalized = url.startsWith("/") ? url : `/${url}`;
  return (
    normalized.includes("/auth/login/") ||
    normalized.includes("/auth/token/") ||
    normalized.includes("/auth/2fa/verify/") ||
    normalized.includes("/auth/password/reset/") ||
    normalized.includes("/auth/password/reset/confirm/") ||
    normalized.includes("/password/reset/") ||
    normalized.includes("/password/reset/confirm/") ||
    normalized.includes("/health/") ||
    normalized === "/external-feed/"
  );
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  const url = config.url ?? "";

  if (token && !isPublicEndpoint(url)) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url ?? "";

    if (status === 401 && !isPublicEndpoint(url)) {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");

      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);
