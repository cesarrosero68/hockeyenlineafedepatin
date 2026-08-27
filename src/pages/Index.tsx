import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Calendar, Star, TrendingUp, AlertTriangle, Radio } from "lucide-react";
import { Link } from "react-router-dom";
import { useTournament } from "@/contexts/TournamentContext";
import Seo from "@/components/Seo";
import { useMatchClock, periodShort, isClockRunning, usePenaltyClock } from "@/lib/matchClock";

export default function Index() {
  const { viewedTournament } = useTournament();
  const viewedTournamentId = viewedTournament?.id ?? null;
  const {
    data: divisions = [],
    isLoading: isLoadingDivisions,
    isError: isErrorDivisions,
  } = useQuery({
    queryKey: ["divisions", viewedTournamentId],
    queryFn: async () => {
      let q: any = supabase.from("divisions").select("id, name, logo_url").order("name");
      if (viewedTournamentId) q = q.eq("tournament_id", viewedTournamentId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
    retry: 3,
    retryDelay: 1000,
  });

  const { data: categories = [], isError: isErrorCategories } = useQuery({
    queryKey: ["categories", viewedTournamentId],
    queryFn: async () => {
      let q: any = supabase.from("categories").select("id, name, division_id").order("sort_order");
      if (viewedTournamentId) q = q.eq("tournament_id", viewedTournamentId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: liveMatches = [] } = useQuery({
    queryKey: ["home-live-matches", viewedTournamentId],
    enabled: !!viewedTournamentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select(`
          id, status, current_period, period_minutes,
          clock_enabled, clock_started_at, clock_offset_ms,
          categories(name),
          match_teams(side, score_regular, teams!inner(id, name, logo_url)),
          penalties(id, team_id, penalty_code, penalty_time, penalty_minutes, period, ended_early, created_at, player_id)
        `)
        .eq("tournament_id", viewedTournamentId as string)
        .eq("status", "in_progress")
        .order("match_date", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((m: any) => {
        const home = m.match_teams?.find((mt: any) => mt.side === "home");
        const away = m.match_teams?.find((mt: any) => mt.side === "away");
        return {
          id: m.id,
          status: m.status,
          current_period: m.current_period,
          clock_enabled: m.clock_enabled,
          clock_started_at: m.clock_started_at,
          clock_offset_ms: m.clock_offset_ms,
          period_minutes: m.period_minutes,
          category_name: m.categories?.name ?? "",
          home_team: home?.teams?.name ?? "Local",
          away_team: away?.teams?.name ?? "Visitante",
          home_logo: home?.teams?.logo_url ?? null,
          away_logo: away?.teams?.logo_url ?? null,
          home_score: home?.score_regular ?? 0,
          away_score: away?.score_regular ?? 0,
          home_team_id: home?.teams?.id ?? null,
          away_team_id: away?.teams?.id ?? null,
          penalties: (m.penalties ?? []) as {
            id: string;
            team_id: string;
            penalty_code: string | null;
            penalty_time: string | null;
            penalty_minutes: number;
            period: number;
            ended_early?: boolean | null;
            player_id?: string | null;
          }[],
        };
      });
    },
    staleTime: 10_000,
    refetchInterval: 3_000,
  });

  // Rosters of teams currently playing live, used to resolve the edition-correct
  // jersey number for penalty boxes (never from the global players catalog).
  const liveTeamIds = Array.from(
    new Set(liveMatches.flatMap((m: any) => [m.home_team_id, m.away_team_id]).filter(Boolean)),
  ) as string[];
  const { data: liveRosters = [] } = useQuery({
    queryKey: ["home-live-rosters", liveTeamIds.join(",")],
    enabled: liveTeamIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rosters")
        .select("player_id, team_id, jersey_number")
        .in("team_id", liveTeamIds);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 10_000,
  });
  const jerseyByPlayerTeam = (playerId: string | null | undefined, teamId: string | null | undefined) => {
    if (!playerId) return null;
    const r = liveRosters.find((r: any) => r.player_id === playerId && (!teamId || r.team_id === teamId));
    return r?.jersey_number ?? null;
  };

  return (
    <div className="container py-8 space-y-10">
      <Seo
        title="Fedepatin | Torneo de Hockey en Línea en Colombia"
        description="Sigue el torneo de hockey en línea de Fedepatin: programación, resultados, posiciones y estadísticas actualizadas por división y categoría."
        path="/"
      />
      <section className="text-center space-y-4 py-8">
        <h1 className="text-4xl md:text-5xl font-display font-bold uppercase tracking-tight">{viewedTournament?.home_title || "Fedepatin - Hockey en Línea"}</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          {viewedTournament?.home_subtitle || "Programación, resultados, posiciones y estadísticas en tiempo real"}
        </p>
      </section>

      {liveMatches.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-2xl font-display font-bold uppercase flex items-center gap-2">
            <Radio className="h-6 w-6 text-primary animate-pulse" />
            En Vivo
          </h2>
          <div
            className={
              liveMatches.length === 1
                ? "grid grid-cols-1 max-w-xl mx-auto"
                : "grid sm:grid-cols-2 gap-3"
            }
          >
            {liveMatches.map((m) => (
              <LiveMatchCard key={m.id} match={m} rosters={liveRosters} />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-6">
        <h2 className="text-2xl font-display font-bold uppercase flex items-center gap-2">
          <Trophy className="h-6 w-6 text-secondary" />
          Divisiones
        </h2>

        {isLoadingDivisions ? (
          <Card>
            <CardContent className="py-12 flex justify-center">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </CardContent>
          </Card>
        ) : isErrorDivisions || isErrorCategories ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <AlertTriangle className="h-10 w-10 mx-auto mb-3 text-destructive" />
              <p>No se pudieron cargar las divisiones.</p>
              <p className="text-sm mt-1">Recarga la página. Si persiste, revisa la conexión del backend.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {divisions.length === 0 ? (
              <Card className="col-span-2">
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Trophy className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>No hay divisiones configuradas aún.</p>
                  <p className="text-sm mt-1">Configúralas desde el panel administrativo.</p>
                </CardContent>
              </Card>
            ) : (
              divisions.map((div: any) => (
                <Link key={div.id} to={`/teams?division=${encodeURIComponent(div.id)}`} className="block group">
                  <Card className="overflow-hidden h-full hover:shadow-lg hover:border-primary/40 transition-all">
                    <CardContent className="flex items-center gap-5 p-4 md:p-5">
                      {div.logo_url && (
                        <img
                          src={div.logo_url}
                          alt={div.name}
                          className="h-32 w-32 md:h-44 md:w-44 object-contain shrink-0 group-hover:scale-105 transition-transform"
                          loading="lazy"
                        />
                      )}
                      <div>
                        <p className="font-display font-bold uppercase text-lg md:text-xl">{div.name}</p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {categories
                            .filter((c: any) => c.division_id === div.id)
                            .map((cat: any) => (
                              <Badge key={cat.id} variant="secondary" className="text-xs">
                                {cat.name}
                              </Badge>
                            ))}
                        </div>
                        <p className="text-xs text-primary mt-3 font-medium">Ver equipos →</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))
            )}
          </div>
        )}
      </section>

      <section className="grid sm:grid-cols-3 gap-4">
        <Link to="/schedule">
          <Card className="hover:shadow-md transition-shadow cursor-pointer group">
            <CardContent className="flex items-center gap-4 py-6">
              <Calendar className="h-10 w-10 text-primary group-hover:scale-110 transition-transform" />
              <div>
                <p className="font-display font-bold uppercase">{viewedTournament?.home_card_schedule_label || "Programación"}</p>
                <p className="text-sm text-muted-foreground">Calendario de partidos</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link to="/standings">
          <Card className="hover:shadow-md transition-shadow cursor-pointer group">
            <CardContent className="flex items-center gap-4 py-6">
              <TrendingUp className="h-10 w-10 text-accent group-hover:scale-110 transition-transform" />
              <div>
                <p className="font-display font-bold uppercase">{viewedTournament?.home_card_standings_label || "Posiciones"}</p>
                <p className="text-sm text-muted-foreground">Tabla general</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link to="/stats">
          <Card className="hover:shadow-md transition-shadow cursor-pointer group">
            <CardContent className="flex items-center gap-4 py-6">
              <Star className="h-10 w-10 text-secondary group-hover:scale-110 transition-transform" />
              <div>
                <p className="font-display font-bold uppercase">{viewedTournament?.home_card_stats_label || "Estadísticas"}</p>
                <p className="text-sm text-muted-foreground">Líderes del torneo</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </section>
    </div>
  );
}

function LiveMatchCard({ match, rosters }: { match: any; rosters: any[] }) {
  const liveClock = useMatchClock(match as any);
  const clockRunning = isClockRunning(match as any);

  const homePenalties = (match.penalties ?? []).filter((p: any) => p.team_id === match.home_team_id);
  const awayPenalties = (match.penalties ?? []).filter((p: any) => p.team_id === match.away_team_id);

  return (
    <Link to={`/match/${match.id}`}>
      <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer border-primary/40">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <Badge variant="secondary" className="text-sm px-2.5 py-1">{match.category_name}</Badge>
            <Badge
              className={
                "text-sm px-2.5 py-1 gap-1.5 border-transparent text-white " +
                (match.clock_enabled && clockRunning
                  ? "bg-green-600 hover:bg-green-600"
                  : "bg-orange-500 hover:bg-orange-500")
              }
            >
              <span className="h-2 w-2 rounded-full bg-current animate-pulse" />
              {match.clock_enabled && liveClock
                ? `EN VIVO · ${periodShort(match.current_period)} · ${liveClock}`
                : "EN VIVO"}
            </Badge>
          </div>
          <div className="mt-4 flex items-center justify-center gap-4 text-center">
            <span className="flex-1 flex items-center justify-end gap-2 font-semibold text-lg truncate">
              {match.home_team}
              {match.home_logo && <img src={match.home_logo} alt="" className="h-9 w-9 rounded-full object-cover" />}
            </span>
            <div className="font-display font-bold text-3xl min-w-[70px] text-center">
              {match.home_score} - {match.away_score}
            </div>
            <span className="flex-1 flex items-center justify-start gap-2 font-semibold text-lg truncate">
              {match.away_logo && <img src={match.away_logo} alt="" className="h-9 w-9 rounded-full object-cover" />}
              {match.away_team}
            </span>
          </div>
          {(homePenalties.length > 0 || awayPenalties.length > 0) && (
            <div className="mt-3 flex items-start justify-center gap-4">
              <div className="flex-1 flex flex-col items-end gap-1">
                {homePenalties.map((p: any) => (
                  <PenaltyTimer key={p.id} match={match} penalty={p} rosters={rosters} />
                ))}
              </div>
              <div className="min-w-[70px]" />
              <div className="flex-1 flex flex-col items-start gap-1">
                {awayPenalties.map((p: any) => (
                  <PenaltyTimer key={p.id} match={match} penalty={p} rosters={rosters} />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

/** Chip de sanción activa con su cuenta regresiva, atada al reloj del partido. Desaparece sola al cumplirse. */
function PenaltyTimer({ match, penalty, rosters }: { match: any; penalty: any; rosters: any[] }) {
  const remaining = usePenaltyClock(match, penalty);
  if (!remaining) return null;
  const rosterMatch = (rosters ?? []).find(
    (r: any) => r.player_id === penalty.player_id && r.team_id === penalty.team_id,
  );
  const jersey = rosterMatch?.jersey_number ? `#${rosterMatch.jersey_number}` : "";
  const code = penalty.penalty_code ? ` - ${penalty.penalty_code}` : "";
  return (
    <span className="inline-flex items-center gap-1 text-sm font-semibold text-red-600 dark:text-red-500 tabular-nums">
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      Pen {jersey}{code}: {remaining}
    </span>
  );
}
