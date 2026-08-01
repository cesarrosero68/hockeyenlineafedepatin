import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTournament } from "@/contexts/TournamentContext";
import { trackSponsorClick } from "@/lib/tracking";

export interface Sponsor {
  id: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
  active: boolean | null;
  display_order: number | null;
  speed: string | null;
  click_count: number | null;
  created_at: string | null;
}

const DURATION: Record<string, string> = { slow: "60s", medium: "40s", fast: "20s" };

export default function SponsorsMarquee() {
  const { viewedTournamentId, viewedTournament } = useTournament();

  const { data: sponsors = [] } = useQuery({
    queryKey: ["sponsors", viewedTournamentId],
    enabled: !!viewedTournamentId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("sponsors" as any)
        .select("*")
        .eq("tournament_id", viewedTournamentId!)
        .eq("active", true)
        .order("display_order", { ascending: true });
      return (data ?? []) as any as Sponsor[];
    },
  });

  const enabled = (viewedTournament as any)?.sponsors_enabled !== false;
  if (!enabled || sponsors.length === 0) return null;

  const duration = DURATION[sponsors[0]?.speed ?? "medium"] ?? "40s";
  const loop = [...sponsors, ...sponsors];

  const handleClick = async (s: Sponsor) => {
    try {
      await trackSponsorClick(s.id);
      await supabase
        .from("sponsors" as any)
        .update({ click_count: (s.click_count ?? 0) + 1 })
        .eq("id", s.id);
    } catch {
      /* no bloquear la navegación */
    }
  };

  return (
    <div className="border-b bg-card/70 backdrop-blur">
      <div className="container flex items-center gap-3 py-2">
        <span className="shrink-0 text-[11px] font-display font-bold uppercase tracking-wider text-muted-foreground">
          Patrocinadores
        </span>
        <div className="marquee relative flex-1 overflow-hidden">
          <div className="marquee-track" style={{ animationDuration: duration }}>
            {loop.map((s, i) => {
              const content = (
                <span className="flex items-center gap-2 px-5">
                  {s.logo_url && (
                    <img
                      src={s.logo_url}
                      alt={`Logo de ${s.name}`}
                      loading="lazy"
                      className="h-8 w-auto max-w-[110px] object-contain"
                    />
                  )}
                  <span className="text-xs font-medium whitespace-nowrap">{s.name}</span>
                </span>
              );
              return s.website_url ? (
                <a
                  key={`${s.id}-${i}`}
                  href={s.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => handleClick(s)}
                  className="opacity-80 hover:opacity-100 transition-opacity"
                >
                  {content}
                </a>
              ) : (
                <span key={`${s.id}-${i}`} className="opacity-80">
                  {content}
                </span>
              );
            })}
          </div>
          <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-card to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-card to-transparent" />
        </div>
      </div>
    </div>
  );
}