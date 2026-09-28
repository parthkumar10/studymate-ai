import axios from "axios";
import { generateWithGemini, generateOffline, getStoredAiKey } from "./localAi";

const rawBackendUrl = process.env.REACT_APP_BACKEND_URL || "";
const BACKEND_URL = rawBackendUrl.replace(/\/+$/, "");

// Standard axios instance (if a backend URL is explicitly configured)
const axiosInstance = axios.create({
  baseURL: BACKEND_URL ? `${BACKEND_URL}/api` : "/api",
  withCredentials: true,
});

axiosInstance.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem("studymate_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (_) {}
  return config;
});

// ----------------- Client-Side / Cloudflare-Only Store -----------------
const STORAGE_KEYS = {
  CURRENT_USER: "studymate_user",
  GENERATIONS: "studymate_generations",
  USERS: "studymate_users",
};

function getLocalUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && parsed.id ? parsed : null;
  } catch (_) {
    return null;
  }
}

function setLocalUser(user) {
  try {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  } catch (_) {}
}

function getLocalGenerations() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.GENERATIONS);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}

function saveLocalGenerations(items) {
  try {
    localStorage.setItem(STORAGE_KEYS.GENERATIONS, JSON.stringify(items));
  } catch (_) {}
}

function makeTitle(type, text) {
  const label = { summary: "Summary", flashcards: "Flashcards", quiz: "Quiz" }[type] || "Study";
  const snippet = (text || "").trim().split(/\s+/).slice(0, 7).join(" ");
  return snippet ? `${label}: ${snippet}` : label;
}

// ----------------- Local Mock Router -----------------
async function handleLocalRequest(method, url, data) {
  const cleanUrl = url.replace(/^\/api/, "");

  // 1. Auth routes
  if (cleanUrl === "/auth/me") {
    let user = getLocalUser();
    if (!user) {
      // Auto-create a local default guest profile for frictionless use
      user = {
        id: "usr_guest",
        email: "student@studymate.ai",
        name: "Student",
        created_at: new Date().toISOString(),
      };
      setLocalUser(user);
    }
    return { data: user };
  }

  if (cleanUrl === "/auth/login") {
    const email = (data?.email || "student@studymate.ai").toLowerCase().trim();
    const name = email.split("@")[0] || "Student";
    const user = {
      id: "usr_" + Math.random().toString(36).substring(2, 9),
      email,
      name: name.charAt(0).toUpperCase() + name.slice(1),
      created_at: new Date().toISOString(),
      token: "local_token_" + Date.now(),
    };
    setLocalUser(user);
    return { data: user };
  }

  if (cleanUrl === "/auth/register") {
    const email = (data?.email || "student@studymate.ai").toLowerCase().trim();
    const name = (data?.name || "Student").trim();
    const user = {
      id: "usr_" + Math.random().toString(36).substring(2, 9),
      email,
      name,
      created_at: new Date().toISOString(),
      token: "local_token_" + Date.now(),
    };
    setLocalUser(user);
    return { data: user };
  }

  if (cleanUrl === "/auth/logout") {
    setLocalUser(null);
    return { data: { ok: true } };
  }

  // 2. Generate route
  if (cleanUrl === "/generate") {
    const genType = data?.type || "summary";
    const inputText = (data?.input_text || "").trim();
    if (!inputText) {
      const err = new Error("Please paste some notes before generating.");
      err.response = { status: 400, data: { detail: "Please paste some notes before generating." } };
      throw err;
    }

    const apiKey = getStoredAiKey();
    let result;
    if (apiKey) {
      try {
        result = await generateWithGemini(genType, inputText, apiKey);
      } catch (geminiErr) {
        console.warn("Gemini generation failed, using intelligent offline fallback:", geminiErr);
        result = generateOffline(genType, inputText);
      }
    } else {
      // Offline / Client generator
      result = generateOffline(genType, inputText);
    }

    const user = getLocalUser();
    const newDoc = {
      id: "gen_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
      user_id: user?.id || "usr_guest",
      type: genType,
      title: makeTitle(genType, inputText),
      input_text: inputText,
      result,
      created_at: new Date().toISOString(),
    };

    const currentList = getLocalGenerations();
    saveLocalGenerations([newDoc, ...currentList]);

    return { data: newDoc };
  }

  // 3. Generations list
  if (cleanUrl === "/generations" && method === "get") {
    const list = getLocalGenerations().map((doc) => ({
      id: doc.id,
      type: doc.type,
      title: doc.title,
      result: doc.result,
      preview: (doc.input_text || "").slice(0, 140),
      created_at: doc.created_at,
    }));
    return { data: list };
  }

  // 4. Generation single detail
  if (cleanUrl.startsWith("/generations/") && method === "get") {
    const genId = cleanUrl.replace("/generations/", "").trim();
    const found = getLocalGenerations().find((g) => g.id === genId);
    if (!found) {
      const err = new Error("Generation not found.");
      err.response = { status: 404, data: { detail: "Generation not found." } };
      throw err;
    }
    return { data: found };
  }

  // 5. Delete generation
  if (cleanUrl.startsWith("/generations/") && method === "delete") {
    const genId = cleanUrl.replace("/generations/", "").trim();
    const currentList = getLocalGenerations();
    const filtered = currentList.filter((g) => g.id !== genId);
    saveLocalGenerations(filtered);
    return { data: { ok: true } };
  }

  // Fallback
  return { data: {} };
}

// Unified API client that automatically uses local storage / Gemini on Cloudflare Pages
export const api = {
  async get(url, config) {
    if (BACKEND_URL) {
      try {
        return await axiosInstance.get(url, config);
      } catch (err) {
        if (err?.response?.status === 405 || !err.response) {
          return await handleLocalRequest("get", url);
        }
        throw err;
      }
    }
    return await handleLocalRequest("get", url);
  },

  async post(url, data, config) {
    if (BACKEND_URL) {
      try {
        return await axiosInstance.post(url, data, config);
      } catch (err) {
        if (err?.response?.status === 405 || !err.response) {
          return await handleLocalRequest("post", url, data);
        }
        throw err;
      }
    }
    return await handleLocalRequest("post", url, data);
  },

  async delete(url, config) {
    if (BACKEND_URL) {
      try {
        return await axiosInstance.delete(url, config);
      } catch (err) {
        if (err?.response?.status === 405 || !err.response) {
          return await handleLocalRequest("delete", url);
        }
        throw err;
      }
    }
    return await handleLocalRequest("delete", url);
  },
};

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
