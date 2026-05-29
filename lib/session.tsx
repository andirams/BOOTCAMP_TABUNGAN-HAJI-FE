"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { getMe, getToken, UnauthorizedError, type Me } from "@/lib/api";

type Ctx = {
  me: Me | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const SessionContext = createContext<Ctx | null>(null);

export function useSession(): Ctx {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession harus dipakai di dalam SessionProvider");
  return ctx;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const profil = await getMe();
      setMe(profil);
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        router.replace("/login");
        return;
      }
      setError(err instanceof Error ? err.message : "Gagal memuat sesi.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    refresh();
  }, [router, refresh]);

  return (
    <SessionContext.Provider value={{ me, loading, error, refresh }}>
      {children}
    </SessionContext.Provider>
  );
}
