import axios from "axios";

const rawBackendUrl = process.env.REACT_APP_BACKEND_URL || "";
const BACKEND_URL = rawBackendUrl.replace(/\/+$/, "");

export const api = axios.create({
  baseURL: BACKEND_URL ? `${BACKEND_URL}/api` : "/api",
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem("studymate_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (_) {}
  return config;
});

export function formatApiError(err, fallback = "Something went wrong. Please try again.") {
  if (err?.response?.status === 405) {
    return "Backend connection error (405). Please verify your backend server is deployed and REACT_APP_BACKEND_URL is set.";
  }
  const detail = err?.response?.data?.detail;
  if (detail == null) return err?.message || fallback;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail
      .map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e)))
      .filter(Boolean)
      .join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}
