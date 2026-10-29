import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, AlertTriangle, Radio, CheckCircle2, Users, CalendarDays, CircleDot } from "lucide-react";
import { Link } from "react-router-dom";
import { useTournament } from "@/contexts/TournamentContext";
import Seo from "@/components/Seo";
import { useMatchClock, periodShort, isClockRunning, usePenaltyClock } from "@/lib/matchClock";
import { useMemo, useRef, useState } from "react";
import { toBogotaDate } from "@/lib/timezone";
import HomeTabs, { useHomeMatches } from "@/components/home/HomeTabs";
import TeamShield from "@/components/home/TeamShield";

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
    // Sondeo adaptativo (antes: 3s fijos, siempre, hubiera o no partidos).
    // Realtime ya invalida "home-live-matches" cuando cambia un partido, un
    // marcador o una sanción, y el reloj se calcula en el navegador a partir de
    // clock_started_at. Por eso el sondeo solo es una red de seguridad:
    //   - con partidos en vivo -> cada 20 s
    //   - sin partidos en vivo -> cada 5 min (lo normal entre semana)
    refetchInterval: (query) =>
      ((query.state.data as unknown[] | undefined)?.length ?? 0) > 0 ? 20_000 : 300_000,
    refetchIntervalInBackground: false,
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

  const { data: homeMatches = [] } = useHomeMatches(viewedTournamentId);
  const { data: tournamentTeams = [] } = useQuery({
    queryKey: ["home-teams", viewedTournamentId],
    enabled: !!viewedTournamentId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("teams")
        .select("id, category_id, group_name")
        .eq("tournament_id", viewedTournamentId as string);
      return (data ?? []) as any[];
    },
  });
  const groupedCategoryIds = useMemo(
    () => new Set<string>(tournamentTeams.filter((t) => t.group_name).map((t) => t.category_id)),
    [tournamentTeams],
  );
  const [cat, setCat] = useState("all");
  const tabsRef = useRef<HTMLDivElement>(null);
  const pickCategory = (id: string) => {
    setCat(id);
    tabsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const summary = useMemo(() => {
    const done = homeMatches.filter((m) => m.status === "closed" || m.status === "locked");
    const goals = done.reduce((a, m) => a + (m.home_score ?? 0) + (m.away_score ?? 0), 0);
    const todayKey = (() => {
      const d = toBogotaDate(new Date().toISOString());
      return d ? `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` : "";
    })();
    const today = homeMatches.filter((m) => {
      const d = toBogotaDate(m.match_date);
      return d && `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` === todayKey;
    }).length;
    return { played: done.length, total: homeMatches.length, goals, teams: tournamentTeams.length, today };
  }, [homeMatches, tournamentTeams]);

  const statTiles = [
    { icon: CheckCircle2, color: "bg-primary", value: summary.played, suffix: `/${summary.total}`, label: "Partidos jugados" },
    { icon: CircleDot, color: "bg-red-600", value: summary.goals, label: "Goles" },
    { icon: Users, color: "bg-accent", value: summary.teams, label: "Equipos" },
    { icon: CalendarDays, color: "bg-amber-500", value: summary.today, label: "Partidos hoy" },
  ];

  return (
    <div className="space-y-8 pb-10">
      <Seo
        title="Fedepatin | Torneo de Hockey en Línea en Colombia"
        description="Sigue el torneo de hockey en línea de Fedepatin: programación, resultados, posiciones y estadísticas actualizadas por división y categoría."
        path="/"
      />

      {/* Encabezado */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/70 text-primary-foreground">
        <svg className="absolute inset-0 h-full w-full opacity-[0.12]" viewBox="0 0 800 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <g fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="400" cy="150" r="70" />
            <line x1="400" y1="0" x2="400" y2="300" />
            <circle cx="130" cy="150" r="48" />
            <circle cx="670" cy="150" r="48" />
            <line x1="110" y1="0" x2="110" y2="300" />
            <line x1="690" y1="0" x2="690" y2="300" />
          </g>
        </svg>
        <div className="container relative py-10 md:py-14 pb-20 text-center space-y-3">
          <h1 className="text-3xl md:text-5xl font-display font-bold uppercase tracking-tight">
            {viewedTournament?.home_title || "Fedepatin - Hockey en Línea"}
          </h1>
          <p className="text-base md:text-lg opacity-90 max-w-2xl mx-auto">
            {viewedTournament?.home_subtitle || "Programación, resultados, posiciones y estadísticas en tiempo real"}
          </p>
          {viewedTournament?.name && (
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 border border-white/25 px-3 py-1 text-sm">
              <Trophy className="h-4 w-4 text-secondary" />
              <span className="font-display uppercase tracking-wide">{viewedTournament.name}</span>
            </span>
          )}
        </div>
      </section>

      <div className="container space-y-8 -mt-16 relative">
        {liveMatches.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-display font-bold uppercase flex items-center gap-2 text-white drop-shadow">
              <Radio className="h-5 w-5 animate-pulse" />
              En Vivo
            </h2>
            <div className={liveMatches.length === 1 ? "grid grid-cols-1 max-w-xl mx-auto" : "grid sm:grid-cols-2 gap-3"}>
              {liveMatches.map((m) => (
                <LiveMatchCard key={m.id} match={m} rosters={liveRosters} />
              ))}
            </div>
          </section>
        )}

        {/* Cifras */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {statTiles.map((t) => (
            <div key={t.label} className="rounded-2xl border bg-card p-3 text-center shadow-sm">
              <span className={`mx-auto mb-2 grid h-9 w-9 place-items-center rounded-full text-white ${t.color}`}>
                <t.icon className="h-4 w-4" />
              </span>
              <p className="font-display text-2xl font-bold leading-none">
                {t.value}
                {t.suffix && <span className="text-sm text-muted-foreground font-normal">{t.suffix}</span>}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{t.label}</p>
            </div>
          ))}
        </section>

        {/* Divisiones */}
        <section className="space-y-4">
          <h2 className="text-xl font-display font-bold uppercase flex items-center gap-2">
            <span className="h-5 w-1.5 rounded bg-secondary" />
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
          ) : divisions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Trophy className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>No hay divisiones configuradas aún.</p>
                <p className="text-sm mt-1">Configúralas desde el panel administrativo.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid lg:grid-cols-2 gap-4">
              {divisions.map((div: any, idx: number) => (
                <div
                  key={div.id}
                  className={
                    "relative overflow-hidden rounded-2xl p-5 text-white shadow-md bg-gradient-to-br " +
                    (idx % 2 === 0 ? "from-primary to-primary/70" : "from-accent to-accent/70")
                  }
                >
                  <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" aria-hidden="true" />
                  <Link to={`/teams?division=${encodeURIComponent(div.id)}`} className="relative flex items-center gap-4 group">
                    <span className="grid h-32 w-32 lg:h-44 lg:w-44 shrink-0 place-items-center rounded-2xl bg-white shadow-lg">
                      {div.logo_url ? (
                        <img src={div.logo_url} alt={div.name} className="h-28 w-28 lg:h-40 lg:w-40 object-contain object-center group-hover:scale-105 transition-transform" loading="lazy" />
                      ) : (
                        <Trophy className="h-10 w-10 text-primary" />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block break-words font-display text-xl md:text-2xl lg:text-3xl font-bold uppercase leading-tight">{div.name}</span>
                      <span className="text-sm opacity-90">Ver equipos →</span>
                    </span>
                  </Link>
                  <div className="relative mt-4 flex flex-wrap gap-2">
                    {categories
                      .filter((c: any) => c.division_id === div.id)
                      .map((c: any) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => pickCategory(c.id)}
                          className="rounded-full border border-white/40 bg-white/15 px-3 py-1 text-sm font-semibold transition hover:bg-white hover:text-primary hover:-translate-y-0.5"
                        >
                          {c.name}
                        </button>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Pestañas */}
        <section ref={tabsRef} className="scroll-mt-20">
          {viewedTournamentId && (
            <HomeTabs
              categories={categories as any}
              tournamentId={viewedTournamentId}
              matches={homeMatches}
              groupedCategoryIds={groupedCategoryIds}
              cat={cat}
              setCat={setCat}
            />
          )}
        </section>
      </div>
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
              <TeamShield name={match.home_team} logo={match.home_logo} size="md" />
            </span>
            <div className="font-display font-bold text-3xl min-w-[70px] text-center">
              {match.home_score} - {match.away_score}
            </div>
            <span className="flex-1 flex items-center justify-start gap-2 font-semibold text-lg truncate">
              <TeamShield name={match.away_team} logo={match.away_logo} size="md" />
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
