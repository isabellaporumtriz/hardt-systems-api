"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { getCurrentUser } from "@/lib/api/auth";
import {
  getAccessToken,
  removeAccessToken,
} from "@/lib/auth";

import type { CurrentUser } from "@/lib/types/api";


type AuthContextValue = {
  user: CurrentUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  refreshUser: () => Promise<CurrentUser>;
  logout: () => void;
};


const AuthContext = createContext<AuthContextValue | null>(
  null
);


export function AuthProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();

  const [user, setUser] =
    useState<CurrentUser | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);


  const refreshUser =
    useCallback(async (): Promise<CurrentUser> => {
      const currentUser = await getCurrentUser();

      setUser(currentUser);

      return currentUser;
    }, []);


  const logout = useCallback(() => {
    removeAccessToken();
    setUser(null);
    router.replace("/login");
  }, [router]);


  useEffect(() => {
    async function initializeAuth() {
      const token = getAccessToken();

      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        await refreshUser();
      } catch {
        removeAccessToken();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    initializeAuth();
  }, [refreshUser]);


  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: Boolean(user),
      refreshUser,
      logout,
    }),
    [
      user,
      isLoading,
      refreshUser,
      logout,
    ]
  );


  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}


export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth precisa ser usado dentro do AuthProvider."
    );
  }

  return context;
}
