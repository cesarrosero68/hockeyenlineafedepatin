import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getBackgroundPreset } from "@/lib/backgrounds";

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
  background_url: string | null;
  background_style: string | null;
  home_title?: string | null;
  home_subtitle?: string | null;
  home_card_schedule_label?: string | null;
  home_card_standings_label?: string | null;
  home_card_stats_label?: string | null;
  footer_text?: string | null;
}

interface Ctx {
  tournaments: Tournament[];
  activeTournament: Tournament | null;
  activeTournamentId: string | null;
  viewedTournament: Tournament | null;
  viewedTournamentId: string | null;
  isReadOnly: boolean;
  setEdition: (id: string) => void;
  clearEdition: () => void;
  // Backward compat aliases
  currentId: string | null;
  current: Tournament | null;
  setCurrentId: (id: string) => void;
  loading: boolean;
}

const TournamentContext = createContext<Ctx | null>(null);
const VIEW_KEY = "fedepatin:viewed_tournament_id";

export function TournamentProvider({ children }: { children: ReactNode }) {
  const [viewedId, setViewedIdState] = useState<string | null>(() => {
    try { return localStorage.getItem(VIEW_KEY); } catch { return null; }
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

  const activeTournament = tournaments.find(t => t.status === "active") ?? tournaments[0] ?? null;
  const activeTournamentId = activeTournament?.id ?? null;
  const viewedTournamentId = viewedId ?? activeTournamentId;
  const viewedTournament = tournaments.find(t => t.id === viewedTournamentId) ?? activeTournament;
  const isReadOnly = !!viewedId && !!activeTournamentId && viewedId !== activeTournamentId;

  const setEdition = (id: string) => {
    setViewedIdState(id);
    try { localStorage.setItem(VIEW_KEY, id); } catch {}
  };
  const clearEdition = () => {
    setViewedIdState(null);
    try { localStorage.removeItem(VIEW_KEY); } catch {}
  };

  // Apply theme CSS vars
  useEffect(() => {
    const current = viewedTournament;
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

    // Decorative page background
    const preset = getBackgroundPreset(current.background_style);
    if (preset.key === "default") {
      root.style.removeProperty("--page-bg-image");
      root.style.removeProperty("--page-bg-size");
    } else {
      root.style.setProperty("--page-bg-image", preset.image ?? "none");
      root.style.setProperty("--page-bg-size", preset.size ?? "auto");
    }
    if (current.background_url) {
      root.style.setProperty("--page-bg-photo", `url("${current.background_url}")`);
    } else {
      root.style.removeProperty("--page-bg-photo");
    }
  }, [viewedTournament]);

  return (
    <TournamentContext.Provider value={{
      tournaments,
      activeTournament,
      activeTournamentId,
      viewedTournament,
      viewedTournamentId,
      isReadOnly,
      setEdition,
      clearEdition,
      currentId: viewedTournamentId,
      current: viewedTournament,
      setCurrentId: setEdition,
      loading: isLoading,
    }}>
      {children}
    </TournamentContext.Provider>
  );
}

export function useTournament() {
  const ctx = useContext(TournamentContext);
  if (!ctx) throw new Error("useTournament must be used inside TournamentProvider");
  return ctx;
}
