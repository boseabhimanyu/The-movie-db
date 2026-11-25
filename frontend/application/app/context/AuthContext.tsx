"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import api from "@/lib/api";
import type { User } from "@/lib/types";

type AuthResponse = {
  user?: User | null;
  data?: {
    user?: User | null;
  };
};

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  authLoading: boolean;
  refreshAuth: () => Promise<User | null>;
  clearAuth: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const AUTH_PUBLIC_ROUTES = new Set(["/login", "/register", "/verify-email"]);

let inFlightMePromise: Promise<User | null> | null = null;
let cachedUser: User | null | undefined = undefined;

async function fetchCurrentUserClient(force = false): Promise<User | null> {
  if (!force && cachedUser !== undefined) {
    return cachedUser;
  }

  if (!force && inFlightMePromise) {
    return inFlightMePromise;
  }

  const request = (async () => {
    try {
      const response = await api.get<AuthResponse>("/auth/me");
      const resolvedUser =
        response.data.user ?? response.data.data?.user ?? null;
      cachedUser = resolvedUser && resolvedUser.id ? resolvedUser : null;
      return cachedUser;
    } catch {
      cachedUser = null;
      return null;
    } finally {
      inFlightMePromise = null;
    }
  })();

  inFlightMePromise = request;
  return request;
}

export function AuthProvider({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser?: User | null;
}) {
  const pathname = usePathname();
  const isAuthPage = AUTH_PUBLIC_ROUTES.has(pathname);

  if (initialUser !== undefined && cachedUser === undefined) {
    cachedUser = initialUser;
  }

  const [user, setUser] = useState<User | null>(
    cachedUser !== undefined ? cachedUser : null
  );
  const [authLoading, setAuthLoading] = useState<boolean>(
    cachedUser === undefined && !isAuthPage
  );

  const refreshAuth = useCallback(async () => {
    const freshUser = await fetchCurrentUserClient(true);
    setUser(freshUser);
    setAuthLoading(false);
    return freshUser;
  }, []);

  const clearAuth = useCallback(() => {
    cachedUser = null;
    inFlightMePromise = null;
    setUser(null);
    setAuthLoading(false);
  }, []);

  useEffect(() => {
    if (cachedUser !== undefined) {
      setUser(cachedUser);
      setAuthLoading(false);
      return;
    }

    if (isAuthPage) {
      setAuthLoading(false);
      return;
    }

    let active = true;
    fetchCurrentUserClient(false).then((resolved) => {
      if (!active) return;
      setUser(resolved);
      setAuthLoading(false);
    });

    return () => {
      active = false;
    };
  }, [isAuthPage]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        authLoading,
        refreshAuth,
        clearAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}