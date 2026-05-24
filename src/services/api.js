import axios from "axios";

export const API_BASE_URL = (import.meta.env.VITE_API_URL || "https://onlyflans.a2020115468.workers.dev/api").replace(/\/$/, "");

export const TOKEN_KEYS = {
  access: "onlyflans_access_token",
  refresh: "onlyflans_refresh_token",
};

function getAccessToken() {
  try {
    return localStorage.getItem(TOKEN_KEYS.access);
  } catch {
    return null;
  }
}

function formatValidationErrors(errors) {
  if (!errors) return "";

  if (Array.isArray(errors)) {
    return errors
      .map((item) => item?.message || item?.field || String(item))
      .filter(Boolean)
      .join(" ");
  }

  if (errors.fieldErrors && typeof errors.fieldErrors === "object") {
    return Object.entries(errors.fieldErrors)
      .flatMap(([field, messages]) => (Array.isArray(messages) ? messages.map((message) => `${field}: ${message}`) : []))
      .join(" ");
  }

  if (typeof errors === "object") {
    return Object.entries(errors)
      .map(([field, value]) => `${field}: ${Array.isArray(value) ? value.join(", ") : String(value)}`)
      .join(" ");
  }

  return String(errors);
}

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  config.headers["X-Request-Id"] = `of-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const body = error.response?.data;
    const validationDetails = formatValidationErrors(body?.errors);
    const message = [
      body?.message,
      body?.error,
      validationDetails,
    ].filter(Boolean).join(" ") || "No se pudo comunicar con el backend.";

    const normalizedError = new Error(message);
    normalizedError.status = error.response?.status;
    normalizedError.payload = body;
    throw normalizedError;
  }
);

export default api;
