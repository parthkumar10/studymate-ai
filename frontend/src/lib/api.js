import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export const api = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  withCredentials: true,
});

export function formatApiError(err, fallback = "Something went wrong. Please try again.") {
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
