import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, formatApiError } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null = checking, false = anon, obj = logged in

  useEffect(() => {
    api
      .get("/auth/me")
      .then((res) => {
        if (res.data && typeof res.data === "object" && res.data.id) {
          setUser(res.data);
        } else {
          setUser(false);
        }
      })
      .catch(() => setUser(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    if (res.data?.token) {
      localStorage.setItem("studymate_token", res.data.token);
    }
    setUser(res.data);
  }, []);

  const register = useCallback(async (name, email, password) => {
    const res = await api.post("/auth/register", { name, email, password });
    if (res.data?.token) {
      localStorage.setItem("studymate_token", res.data.token);
    }
    setUser(res.data);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch (_) {}
    try {
      localStorage.removeItem("studymate_token");
    } catch (_) {}
    setUser(false);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export { formatApiError };
