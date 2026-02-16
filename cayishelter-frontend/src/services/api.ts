import axios from "axios";

export const api = axios.create({
  baseURL: "http://127.0.0.1:8000/api",
});

function isPublicEndpoint(url: string) {
  return (
    url.includes("/auth/token/") ||
    url.includes("/auth/password/reset/") ||
    url.includes("/auth/password/reset/confirm/") ||
    url.includes("/password/reset/") ||
    url.includes("/password/reset/confirm/") ||
    url.includes("/health/") ||
    url.includes("/external-feed/")
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
