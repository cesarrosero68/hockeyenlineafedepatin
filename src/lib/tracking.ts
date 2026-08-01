import { supabase } from "@/integrations/supabase/client";

export function getDeviceType(): "mobile" | "desktop" {
  if (typeof navigator === "undefined") return "desktop";
  return /Android|iPhone|iPad/i.test(navigator.userAgent) ? "mobile" : "desktop";
}

const PAGE_NAMES: Record<string, string> = {
  "/": "Inicio",
  "/teams": "Equipos",
  "/schedule": "Programación",
  "/standings": "Posiciones",
  "/stats": "Estadísticas",
  "/fair-play": "Fair Play",
  "/podium": "Podio",
  "/editions": "Ediciones",
};

export function pageNameFor(pathname: string): string | null {
  if (PAGE_NAMES[pathname]) return PAGE_NAMES[pathname];
  if (pathname.startsWith("/match/")) return "Detalle de partido";
  return null;
}

export async function trackPageView(page: string, tournamentId: string | null) {
  try {
    await supabase.from("page_views" as any).insert({
      page,
      tournament_id: tournamentId,
      device_type: getDeviceType(),
    });
  } catch {
    /* tracking nunca debe romper la UI */
  }
}

export async function trackSponsorClick(sponsorId: string) {
  try {
    await supabase.from("sponsor_clicks" as any).insert({
      sponsor_id: sponsorId,
      device_type: getDeviceType(),
    });
  } catch {
    /* noop */
  }
}
