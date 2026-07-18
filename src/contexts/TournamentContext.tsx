import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Tournament {
  id: string;
  name: string;
  year: number | null;
  semester: string | null;
  season: string | null;
  status: string;
  primary_color: string | null;
  header_color: string | null;
  footer_color: string | null;
  bg_color: string | null;
  title_color: string | null;
  text_color: string | null;
  font_family: string | null;
  font_size: string | null;
}

interface Ctx {
  tournaments: Tournament[];
  currentId: string | null;
  current: Tournament | null;
  setCurrentId: (id: string) => void;
  loading: boolean;
}

const TournamentContext = createContext<Ctx | null>(null);
const STORAGE_KEY = "fedepatin:tournament_id";

export function TournamentProvider({ children }: { children: ReactNode }) {
  const [currentId, setCurrentIdState] = useState<string | null>(() => {
    try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
  });

  const { data: tournaments = [], isLoading } = useQuery({
    queryKey: ["tournaments"],
    queryFn: async () => {
      const { data } = await supabase
        .from("tournaments" as any)
        .select("*")
        .order("year", { ascending: false });
      return (data ?? []) as any as Tournament[];
    },
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    if (!currentId && tournaments.length > 0) {
      const active = tournaments.find(t => t.status === "active") ?? tournaments[0];
      setCurrentIdState(active.id);
    }
  }, [tournaments, currentId]);

  const setCurrentId = (id: string) => {
    setCurrentIdState(id);
    try { localStorage.setItem(STORAGE_KEY, id); } catch {}
  };

  const current = tournaments.find(t => t.id === currentId) ?? null;

  // Apply theme CSS vars
  useEffect(() => {
    if (!current) return;
    const root = document.documentElement;
    const hexToHsl = (hex: string): string | null => {
      const m = /^#?([a-f\d]{6})$/i.exec(hex.trim());
      if (!m) return null;
      const num = parseInt(m[1], 16);
      let r = (num >> 16) / 255, g = ((num >> 8) & 0xff) / 255, b = (num & 0xff) / 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      let h = 0, s = 0; const l = (max + min) / 2;
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
      }
      return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
    };
    if (current.primary_color) {
      const hsl = hexToHsl(current.primary_color);
      if (hsl) root.style.setProperty("--primary", hsl);
    }
    if (current.font_family) {
      root.style.setProperty("--tournament-font", current.font_family);
      document.body.style.fontFamily = current.font_family;
    }
  }, [current]);

  return (
    <TournamentContext.Provider value={{ tournaments, currentId, current, setCurrentId, loading: isLoading }}>
      {children}
    </TournamentContext.Provider>
  );
}

export function useTournament() {
  const ctx = useContext(TournamentContext);
  if (!ctx) throw new Error("useTournament must be used inside TournamentProvider");
  return ctx;
}
