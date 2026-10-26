import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, MapPin, Target, ShieldAlert, Users, ChevronLeft, ListOrdered } from "lucide-react";
import { formatBogota } from "@/lib/timezone";
import Seo from "@/components/Seo";
import { useMatchClock, periodLabel } from "@/lib/matchClock";
import { sortChronological } from "@/lib/matchEvents";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function penaltyMinutesToDisplay(mins: number): string {
  const totalSeconds = Math.round(mins * 60);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const statusLabels: Record<string, string> = {
  scheduled: "Programado",
  in_progress: "En juego",
  closed: "Finalizado",
  locked: "Finalizado",
  postponed: "Aplazado",
  to_be_defined: "Por definir",
};
const statusBadgeClasses: Record<string, string> = {
  scheduled: "border-transparent bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
  in_progress: "border-transparent bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
  closed: "border-transparent bg-blue-100 text-blue-800 hover:bg-blue-100",
  locked: "border-transparent bg-blue-100 text-blue-800 hover:bg-blue-100",
  postponed: "border-transparent bg-orange-100 text-orange-800 hover:bg-orange-100",
  to_be_defined: "border-transparent bg-red-100 text-black hover:bg-red-100",
};

export default function MatchDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: match, isLoading } = useQuery({
    queryKey: ["match-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select(`
          id, match_date, status, phase, round_number, venue, notes, extra_time,
          clock_enabled, clock_started_at, clock_offset_ms, current_period, period_minutes,
          categories!inner(name, divisions!inner(name)),
          match_teams(side, score_regular, score_extra, is_winner, is_forfeit, team_id, teams!inner(id, name, logo_url, clubs(logo_url)))
        `)
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
    staleTime: 30_000,
  });

  const homeTeam = (match as any)?.match_teams?.find((mt: any) => mt.side === "home");
  const awayTeam = (match as any)?.match_teams?.find((mt: any) => mt.side === "away");

  const { data: goals } = useQuery({
    queryKey: ["match-goals", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("goal_events")
        .select(`
          id, created_at, period, game_time, is_overtime, is_shootout, team_id, scorer_player_id, assist_player_id,
          scorer:players_public!goal_events_scorer_player_id_fkey(first_name, last_name),
          assist:players_public!goal_events_assist_player_id_fkey(first_name, last_name)
        `)
        .eq("match_id", id!);
      return sortChronological(data ?? [], "game_time");
    },
    enabled: !!id,
    staleTime: 30_000,
  });

  const { data: penaltiesList } = useQuery({
    queryKey: ["match-penalties", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("penalties")
        .select(`
          id, created_at, period, game_time, penalty_code, penalty_description, penalty_minutes, penalty_time, team_id, player_id,
          player:players_public!penalties_player_id_fkey(first_name, last_name)
        `)
        .eq("match_id", id!);
      return sortChronological(data ?? [], "penalty_time");
    },
    enabled: !!id,
    staleTime: 30_000,
  });

  const { data: rosters } = useQuery({
    queryKey: ["match-rosters", id, homeTeam?.team_id, awayTeam?.team_id],
    queryFn: async () => {
      const teamIds = [homeTeam?.team_id, awayTeam?.team_id].filter(Boolean);
      if (teamIds.length === 0) return [];
      const { data } = await supabase
        .from("rosters")
        .select(`
          id, jersey_number, position, team_id, player_id,
          player:players_public!rosters_player_id_fkey(first_name, last_name)
        `)
        .in("team_id", teamIds)
        .order("jersey_number");
      return data ?? [];
    },
    enabled: !!homeTeam || !!awayTeam,
    staleTime: 30_000,
  });

  // Edition-correct jersey number: look it up in this match's rosters (team-specific),
  // never from the global players catalog which can be stale across editions.
  const jerseyByPlayerTeam = (playerId: string | null | undefined, teamId: string | null | undefined) => {
    if (!playerId || !rosters) return null;
    const r = rosters.find((r: any) => r.player_id === playerId && (!teamId || r.team_id === teamId));
    return r?.jersey_number ?? null;
  };


  const liveClock = useMatchClock(match as any);

  if (isLoading) {
    return (
      <div className="container py-8 flex justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="container py-8 text-center text-muted-foreground">
        Partido no encontrado.
      </div>
    );
  }

  const m = match as any;

  const homeName = homeTeam?.teams?.name ?? "Por definir";
  const awayName = awayTeam?.teams?.name ?? "Por definir";
  const matchTitle = `${homeName} vs ${awayName}`;
  const matchDesc = `${matchTitle} — ${m.categories?.name ?? ""} ${m.categories?.divisions?.name ?? ""}${
    m.match_date ? `, ${formatBogota(m.match_date, "d 'de' MMMM yyyy 'a las' h:mm a")}` : ""
  }${m.venue ? ` en ${m.venue}` : ""}. Marcador y eventos del partido.`;

  const getTeamName = (teamId: string) => {
    if (homeTeam?.teams?.id === teamId) return homeTeam.teams.name;
    if (awayTeam?.teams?.id === teamId) return awayTeam.teams.name;
    return "—";
  };

  const teamInfo = (teamId: string) => {
    const mt = homeTeam?.team_id === teamId ? homeTeam : awayTeam?.team_id === teamId ? awayTeam : null;
    return {
      name: mt?.teams?.name ?? "—",
      logo: mt?.teams?.logo_url || mt?.teams?.clubs?.logo_url || null,
      isHome: mt === homeTeam,
    };
  };
  const personName = (p: any) => `${p?.first_name ?? ""} ${p?.last_name ?? ""}`.trim() || "—";
  const jerseyTag = (playerId: string | null | undefined, teamId: string) => {
    const j = jerseyByPlayerTeam(playerId, teamId);
    return j ? `#${j} ` : "";
  };

  // Marcador por período (se calcula con los goles registrados)
  const goalList = (goals ?? []) as any[];
  const periodKey = (g: any): "1" | "2" | "OT" | "SO" =>
    g.is_shootout ? "SO" : g.is_overtime || Number(g.period) >= 3 ? "OT" : String(g.period) === "2" ? "2" : "1";
  const hasOT = goalList.some((g) => periodKey(g) === "OT");
  const hasSO = goalList.some((g) => periodKey(g) === "SO");
  const periodCols: { key: "1" | "2" | "OT" | "SO"; label: string }[] = [
    { key: "1", label: "1T" },
    { key: "2", label: "2T" },
    ...(hasOT ? [{ key: "OT" as const, label: "OT" }] : []),
    ...(hasSO ? [{ key: "SO" as const, label: "SO" }] : []),
  ];
  const countGoals = (teamId: string | undefined, key?: string) =>
    goalList.filter((g) => g.team_id === teamId && (!key || periodKey(g) === key)).length;

  // Marcador acumulado después de cada gol (local - visitante)
  let runHome = 0;
  let runAway = 0;
  const goalRows = goalList.map((g) => {
    if (g.team_id === homeTeam?.team_id) runHome++;
    else if (g.team_id === awayTeam?.team_id) runAway++;
    return { g, score: `${runHome} - ${runAway}` };
  });
  const periodShort = (p: any, g?: any) => (g?.is_shootout ? "SO" : g?.is_overtime || Number(p) >= 3 ? "OT" : `${p}T`);

  const TeamCellInline = ({ teamId }: { teamId: string }) => {
    const t = teamInfo(teamId);
    return (
      <div className="flex items-center gap-2 min-w-0">
        {t.logo && <img src={t.logo} alt="" className="h-6 w-6 rounded-full object-cover border shrink-0" />}
        <span className="truncate">{t.name}</span>
      </div>
    );
  };

  return (
    <div className="container py-8 space-y-6">
      <Seo
        title={`${matchTitle} | Fedepatin`}
        description={matchDesc.slice(0, 158)}
        path={`/match/${m.id}`}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "SportsEvent",
          name: matchTitle,
          ...(m.match_date ? { startDate: m.match_date } : {}),
          ...(m.venue ? { location: { "@type": "Place", name: m.venue } } : {}),
          competitor: [
            { "@type": "SportsTeam", name: homeName },
            { "@type": "SportsTeam", name: awayName },
          ],
          url: `https://hockeyenlineafedepatin.site/match/${m.id}`,
        }}
      />
      <button
  onClick={() => navigate(-1)}
  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
>
  <ChevronLeft className="h-4 w-4" /> Volver
</button>

      
      
      
      <h1 className="sr-only">{matchTitle}</h1>

      {/* Cabecera del partido: usa el color primario de la edición (Admin → Apariencia) */}
      <div
        className="relative overflow-hidden rounded-2xl text-white shadow-lg"
        style={{
          background:
            "linear-gradient(135deg, color-mix(in srgb, hsl(var(--primary)) 72%, #000) 0%, hsl(var(--primary)) 62%, color-mix(in srgb, hsl(var(--primary)) 78%, #38bdf8) 135%)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(520px 170px at 50% 0%, hsl(var(--secondary) / 0.22), transparent 70%)" }}
        />

        {/* Categoría · división · fase · estado */}
        <div className="relative flex flex-wrap items-center justify-center gap-2 px-4 pt-4 text-sm">
          <span className="rounded-full bg-secondary px-3 py-0.5 text-xs font-bold text-black">{m.categories?.name}</span>
          <span className="text-white/85">{m.categories?.divisions?.name}</span>
          {m.phase && m.phase !== "regular" && (
            <Badge variant="outline" className="border-white/40 bg-white/10 text-white">
              {m.phase === "semifinal" ? "Semifinal" : m.phase === "playoff" ? "Playoff" : m.phase === "final" ? "Final" : m.phase === "third_place" ? "Tercer Puesto" : m.phase}
            </Badge>
          )}
          <Badge variant="outline" className={statusBadgeClasses[m.status] ?? ""}>
            {statusLabels[m.status] ?? m.status}
          </Badge>
        </div>

        {/* Equipos y marcador */}
        <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 py-5 sm:gap-6 sm:px-8 sm:py-7">
          {[
            { mt: homeTeam, label: "Local", home: true },
            null,
            { mt: awayTeam, label: "Visitante", home: false },
          ].map((side, idx) => {
            if (!side) {
              const showScore = m.status === "closed" || m.status === "in_progress" || m.status === "locked";
              return (
                <div key="score" className="flex flex-col items-center">
                  {showScore ? (
                    <div className="flex items-center gap-2 sm:gap-4 font-display font-bold text-5xl sm:text-7xl leading-none tabular-nums">
                      <span>{homeTeam?.score_regular ?? 0}</span>
                      <span className="text-white/50 text-3xl sm:text-5xl">-</span>
                      <span>{awayTeam?.score_regular ?? 0}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center leading-none">
                      <span className="font-display text-3xl sm:text-5xl font-bold text-white/70">VS</span>
                      {m.match_date && (
                        <span className="mt-2 font-display text-lg sm:text-2xl font-bold tabular-nums">
                          {formatBogota(m.match_date, "h:mm a")}
                        </span>
                      )}
                    </div>
                  )}
                  {showScore && hasOT && m.status !== "in_progress" && (
                    <span className="mt-2 text-xs font-semibold tracking-wider text-red-200">TIEMPO EXTRA</span>
                  )}
                  {m.status === "in_progress" && (
                    <div className="mt-3 flex items-center gap-2 rounded-full bg-black/25 px-3 py-1">
                      <span className="text-xs sm:text-sm font-medium">{periodLabel(m.current_period)}</span>
                      {m.clock_enabled !== false && liveClock && (
                        <span className="font-display text-base sm:text-xl font-bold tabular-nums">{liveClock}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            }
            const t = side.mt?.teams;
            const logo = t?.logo_url || t?.clubs?.logo_url;
            const name = t?.name ?? "Por definir";
            const initials = name.split(/\s+/).map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
            return (
              <div
                key={idx}
                className={`flex min-w-0 flex-col items-center gap-2 sm:flex-row sm:gap-5 ${side.home ? "sm:justify-end" : "sm:justify-start"}`}
              >
                <div
                  className={`order-1 ${side.home ? "sm:order-2" : ""} flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-white shadow-xl ring-4 ring-secondary/60 sm:h-24 sm:w-24`}
                >
                  {logo ? (
                    <img src={logo} alt={name} className="h-full w-full object-contain p-1" />
                  ) : (
                    <span className="font-display text-xl sm:text-3xl font-bold text-primary">{initials}</span>
                  )}
                </div>
                <div className={`order-2 ${side.home ? "sm:order-1 sm:text-right" : "sm:text-left"} min-w-0 text-center`}>
                  <p className="font-display text-base sm:text-3xl font-bold uppercase leading-tight break-words">{name}</p>
                  <p className="mt-1 text-[10px] sm:text-xs uppercase tracking-[0.14em] text-white/65">{side.label}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Fecha · hora · lugar */}
        {m.match_date && (
          <div className="relative flex flex-wrap items-center justify-center gap-x-6 gap-y-1 border-t border-white/15 bg-black/10 px-4 py-3 text-xs sm:text-sm text-white/90">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {formatBogota(m.match_date, "EEEE d 'de' MMMM yyyy")}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {formatBogota(m.match_date, "h:mm a")}
            </span>
            {m.venue && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {m.venue}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="summary">
        <TabsList>
          <TabsTrigger value="summary" className="flex items-center gap-1">
            <ListOrdered className="h-4 w-4" /> Resumen
          </TabsTrigger>
          <TabsTrigger value="rosters" className="flex items-center gap-1">
            <Users className="h-4 w-4" /> Plantillas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-6">
          {/* Marcador por período */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-display uppercase flex items-center gap-2">
                <Target className="h-4 w-4" /> Marcador por período
              </CardTitle>
            </CardHeader>
            <CardContent>
              {goalList.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No hay goles registrados.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="px-2 sm:px-4">Equipo</TableHead>
                      {periodCols.map((c) => (
                        <TableHead key={c.key} className="text-center w-10 sm:w-14 px-1 sm:px-4">{c.label}</TableHead>
                      ))}
                      <TableHead className="text-center w-12 sm:w-16 font-bold px-1 sm:px-4">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[homeTeam, awayTeam].filter(Boolean).map((mt: any) => (
                      <TableRow key={mt.team_id}>
                        <TableCell className="font-medium px-2 sm:px-4 max-w-[120px] sm:max-w-none"><TeamCellInline teamId={mt.team_id} /></TableCell>
                        {periodCols.map((c) => (
                          <TableCell key={c.key} className="text-center tabular-nums px-1 sm:px-4">{countGoals(mt.team_id, c.key)}</TableCell>
                        ))}
                        <TableCell className="text-center font-bold tabular-nums px-1 sm:px-4">{countGoals(mt.team_id)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Resumen de goles */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-display uppercase flex items-center gap-2">
                <Target className="h-4 w-4" /> Resumen de goles
              </CardTitle>
            </CardHeader>
            <CardContent>
              {goalRows.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No hay goles registrados.</p>
              ) : (
                <>
                  <div className="hidden sm:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-14">Per.</TableHead>
                          <TableHead className="w-16">Tiempo</TableHead>
                          <TableHead>Equipo</TableHead>
                          <TableHead>Gol (asistencia)</TableHead>
                          <TableHead className="text-center w-20">Marcador</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {goalRows.map(({ g, score }) => (
                          <TableRow key={g.id}>
                            <TableCell className="text-muted-foreground">{periodShort(g.period, g)}</TableCell>
                            <TableCell className="tabular-nums">{g.game_time ?? "—"}</TableCell>
                            <TableCell><TeamCellInline teamId={g.team_id} /></TableCell>
                            <TableCell>
                              <span className="font-semibold">
                                {jerseyTag(g.scorer_player_id, g.team_id)}{personName(g.scorer)}
                              </span>
                              {g.assist && (
                                <span className="text-xs text-muted-foreground">
                                  {" "}({jerseyTag(g.assist_player_id, g.team_id)}{personName(g.assist)})
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-center font-bold tabular-nums">{score}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="sm:hidden space-y-2">
                    {goalRows.map(({ g, score }) => (
                      <div key={g.id} className="rounded-md border p-3 space-y-1">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{periodShort(g.period, g)} · <span className="tabular-nums">{g.game_time ?? "—"}</span></span>
                          <span className="text-base font-bold text-foreground tabular-nums">{score}</span>
                        </div>
                        <TeamCellInline teamId={g.team_id} />
                        <p className="text-sm">
                          <span className="font-semibold">{jerseyTag(g.scorer_player_id, g.team_id)}{personName(g.scorer)}</span>
                          {g.assist && (
                            <span className="text-xs text-muted-foreground"> ({jerseyTag(g.assist_player_id, g.team_id)}{personName(g.assist)})</span>
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Resumen de sanciones */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-display uppercase flex items-center gap-2">
                <ShieldAlert className="h-4 w-4" /> Resumen de sanciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(!penaltiesList || penaltiesList.length === 0) ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No hay sanciones registradas.</p>
              ) : (
                <>
                  <div className="hidden sm:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-14">Per.</TableHead>
                          <TableHead className="w-16">Tiempo</TableHead>
                          <TableHead>Jugador</TableHead>
                          <TableHead>Equipo</TableHead>
                          <TableHead>Infracción</TableHead>
                          <TableHead className="text-center w-20">Duración</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {penaltiesList.map((p: any) => (
                          <TableRow key={p.id}>
                            <TableCell className="text-muted-foreground">{periodShort(p.period)}</TableCell>
                            <TableCell className="tabular-nums">{p.penalty_time ?? "—"}</TableCell>
                            <TableCell className="font-semibold">
                              {jerseyTag(p.player_id, p.team_id)}{personName(p.player)}
                            </TableCell>
                            <TableCell><TeamCellInline teamId={p.team_id} /></TableCell>
                            <TableCell>
                              {p.penalty_description}
                              <span className="text-xs text-muted-foreground"> ({p.penalty_code})</span>
                            </TableCell>
                            <TableCell className="text-center tabular-nums">{penaltyMinutesToDisplay(p.penalty_minutes)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="sm:hidden space-y-2">
                    {penaltiesList.map((p: any) => (
                      <div key={p.id} className="rounded-md border p-3 space-y-1">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{periodShort(p.period)} · <span className="tabular-nums">{p.penalty_time ?? "—"}</span></span>
                          <span className="text-sm font-bold text-foreground tabular-nums">{penaltyMinutesToDisplay(p.penalty_minutes)} min</span>
                        </div>
                        <p className="text-sm font-semibold">{jerseyTag(p.player_id, p.team_id)}{personName(p.player)}</p>
                        <TeamCellInline teamId={p.team_id} />
                        <p className="text-xs text-muted-foreground">{p.penalty_description} ({p.penalty_code})</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rosters" className="space-y-4">
          {[{ label: "Local", teamId: homeTeam?.team_id, teamName: homeTeam?.teams?.name },
            { label: "Visitante", teamId: awayTeam?.team_id, teamName: awayTeam?.teams?.name }]
            .map(({ label, teamId, teamName }) => {
              const teamRoster = (rosters?.filter((r: any) => r.team_id === teamId) ?? [])
                .sort((a: any, b: any) => {
                  const aGk = (a.position ?? "") === "ARQUERO" ? 0 : 1;
                  const bGk = (b.position ?? "") === "ARQUERO" ? 0 : 1;
                  if (aGk !== bGk) return aGk - bGk;
                  return (a.jersey_number ?? 999) - (b.jersey_number ?? 999);
                });
              return (
                <Card key={label}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-display uppercase">{teamName ?? label}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {teamRoster.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No hay roster registrado.</p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                        {teamRoster.map((r: any) => (
                          <div key={r.id} className="text-sm flex items-center gap-1">
                            <span className="font-mono text-xs text-muted-foreground w-6 text-right">
                              {r.jersey_number ?? "—"}
                            </span>
                            <span>{r.player?.first_name} {r.player?.last_name}</span>
                            {r.position && <Badge variant="outline" className="text-[10px] ml-1">{r.position}</Badge>}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
        </TabsContent>
      </Tabs>
    </div>
  );
}
