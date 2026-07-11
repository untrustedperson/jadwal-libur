import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { gapi } from "gapi-script";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "492769852023-k4q40pi273ioncit65l16ptclot4i9sq.apps.googleusercontent.com";
const API_KEY   = import.meta.env.VITE_GOOGLE_API_KEY || "AIzaSyBnPPmk3MIt2M0m861ZLLVCzVba3sR_-Wc";

// tambahkan openid email profile untuk dapatkan email user
const SCOPES = "openid email profile https://www.googleapis.com/auth/calendar";

declare global {
  interface Window { google: any; }
}

type Role = "admin" | "viewer" | null;

type UserInfo = {
  email: string;
  name?: string;
  picture?: string;
} | null;

type AuthContextType = {
  isReady: boolean;
  hasToken: boolean;
  user: UserInfo;
  role: Role;
  login: () => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType>({
  isReady: false,
  hasToken: false,
  user: null,
  role: null,
  login: async () => {},
  logout: () => {},
});

// <<< GANTI sesuai kebutuhanmu >>>
const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || "padmasastra@gmail.com")
  .split(",")
  .map((s: string) => s.trim().toLowerCase());

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isReady, setIsReady] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const [user, setUser] = useState<UserInfo>(null);
  const [role, setRole] = useState<Role>(null);
  const tokenClientRef = useRef<any>(null);

  // init gapi (discovery) + GIS
  useEffect(() => {
    gapi.load("client", async () => {
      try {
        await gapi.client.init({ apiKey: API_KEY });
        await gapi.client.load("https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest");
        setIsReady(true);
      } catch (e) {
        console.error("gapi init/discovery error:", e);
      }
    });

    const ensureGIS = () => {
      if (!window.google?.accounts?.oauth2) {
        console.warn("Tambahkan <script src=\"https://accounts.google.com/gsi/client\" async defer></script> di index.html");
        return;
      }
      tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: async (resp: any) => {
          if (resp?.access_token) {
            gapi.client.setToken({ access_token: resp.access_token });
            setHasToken(true);
            // Ambil userinfo via OIDC
            try {
              const ui = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
                headers: { Authorization: `Bearer ${resp.access_token}` },
              }).then(r => r.json());
              const info: UserInfo = {
                email: (ui.email || "").toLowerCase(),
                name: ui.name,
                picture: ui.picture,
              };
              setUser(info);
              setRole(ADMIN_EMAILS.includes(info.email) ? "admin" : "viewer");
            } catch (e) {
              console.error("userinfo error:", e);
            }
          }
        },
      });
    };

    if (document.readyState === "complete") {
      ensureGIS();
    } else {
      window.addEventListener("load", ensureGIS);
      return () => window.removeEventListener("load", ensureGIS);
    }
  }, []);

  const login = async () => {
    if (!isReady || !tokenClientRef.current) {
      console.warn("Auth belum siap");
      return;
    }
    tokenClientRef.current.requestAccessToken({ prompt: "consent" });
  };

  const logout = () => {
    // Frontend-only: hapus token & state
    gapi.client.setToken(null as any);
    setHasToken(false);
    setUser(null);
    setRole(null);
  };

  const value = useMemo(() => ({ isReady, hasToken, user, role, login, logout }), [isReady, hasToken, user, role]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
