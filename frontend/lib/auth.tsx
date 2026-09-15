"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getCurrentEmployer, loginEmployer, logoutEmployer, registerEmployer } from "./api";
import { logger } from "./logger";
import type { Employer, LoginInput, NewEmployerInput } from "./types";

const STORAGE_KEY = "noticeboard_employer_token";

/** "Remember me" -> localStorage (survives closing the browser); otherwise sessionStorage (cleared with the tab). */
function readStoredToken(): string | null {
  return localStorage.getItem(STORAGE_KEY) ?? sessionStorage.getItem(STORAGE_KEY);
}

function storeToken(token: string, rememberMe: boolean) {
  if (rememberMe) {
    localStorage.setItem(STORAGE_KEY, token);
    sessionStorage.removeItem(STORAGE_KEY);
  } else {
    sessionStorage.setItem(STORAGE_KEY, token);
    localStorage.removeItem(STORAGE_KEY);
  }
}

function clearStoredToken() {
  localStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(STORAGE_KEY);
}

interface AuthState {
  employer: Employer | null;
  token: string | null;
  /** True until the stored session (if any) has been checked against the backend. */
  loading: boolean;
  login: (input: LoginInput, rememberMe: boolean) => Promise<void>;
  register: (input: NewEmployerInput) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [employer, setEmployer] = useState<Employer | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = readStoredToken();
    if (!stored) {
      setLoading(false);
      return;
    }
    getCurrentEmployer(stored)
      .then((profile) => {
        setToken(stored);
        setEmployer(profile);
      })
      .catch((error) => {
        logger.warn("Stored employer session is no longer valid", error);
        clearStoredToken();
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(input: LoginInput, rememberMe: boolean) {
    const result = await loginEmployer(input);
    storeToken(result.token, rememberMe);
    setToken(result.token);
    setEmployer(result.employer);
  }

  async function register(input: NewEmployerInput) {
    const result = await registerEmployer(input);
    // Freshly created, on the device they registered from — remember them by default.
    storeToken(result.token, true);
    setToken(result.token);
    setEmployer(result.employer);
  }

  async function logout() {
    if (token) {
      try {
        await logoutEmployer(token);
      } catch (error) {
        logger.warn("Logout request failed; clearing the local session anyway", error);
      }
    }
    clearStoredToken();
    setToken(null);
    setEmployer(null);
  }

  return (
    <AuthContext.Provider value={{ employer, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
