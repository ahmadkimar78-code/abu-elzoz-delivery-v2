import { createContext, useContext, useState, ReactNode } from "react";
import { api } from "../api/client";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthContextValue {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });

  async function login(email: string, password: string) {
    const data = await api.post("/auth/login", { email, password });
    localStorage.setItem("accessToken", data.accessToken);
    localStorage.setItem("refreshToken", data.refreshToken);
    localStorage.setItem("user", JSON.stringify(data.user));
    setUser(data.user);
  }

  async function logout() {
    const refreshToken = localStorage.getItem("refreshToken");
    // بنبطل الـ refresh token فعليًا على السيرفر — قبل كده كان بيتمسح من المتصفح بس
    // ويفضل صالح لو حد قدر ياخده
    if (refreshToken) {
      await api.post("/auth/logout", { refreshToken }).catch(() => {
        // فشل إبطال التوكن على السيرفر مايمنعش تسجيل الخروج محليًا
      });
    }
    localStorage.clear();
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
