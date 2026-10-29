import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { CalendarDays, CheckCircle2, BarChart3, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { formatBogota, toBogotaDate } from "@/lib/timezone";
import TeamShield from "./TeamShield";

type Cat = { id: string; name: string; division_id: string };

// Cruces de fase final sin equipo todavía: el texto viene en "notes"
// ("Local: SEED 1 | Visitante: WIN SUB10-25").
function prettyPlaceholder(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim().replace(/\s+/g, " ").toUpperCase();
  if (!s) return null;
  let m = s.match(/^SEED\s*(\d+)\s*(?:GR\s*([A-Z]))?/);
  if (m) return m[2] ? `${m[1]}° Grupo ${m[2]}` : `${m[1]}° de la tabla`;
  m = s.match(/^(WINNER|WIN|LOSER)\b.*?(\d+)\s*$/);
  if (m) return `${m[1] === "LOSER" ? "Perdedor" : "Ganador"} partido ${m[2]}`;
  return raw.trim();
}
function placeholderFromNotes(notes: string | null | undefined, side: "home" | "away") {
  if (!notes) return null;
  const re = side === "home" ? /Local:\s*([^|]+?)(?:\s*\||\s*$)/ : /Visitante:\s*(.+?)\s*$/;
  return prettyPlaceholder(notes.match(re)?.[1]);
}

const PHASE_ES: Record<string, string> = {
  playoff: "Clasificación",
  semifinal: "Semifinal",
  final: "Final",
  third_place: "Tercer puesto",
  ranking: "Puestos",
};

// Un color estable por categoría (solo para la etiqueta lateral).
function catColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 17 + name.charCodeAt(i)) % 360;
  return `hsl(${h} 60% 42%)`;
}

export type HomeMatch = {
  id: string;
  match_date: string | null;
  status: string;
  phase: string;
  category_id: string;
  category_name: string;
  home_team: string | null;
  away_team: string | null;
  home_logo: string | null;
  away_logo: string | null;
  home_score: number | null;
  away_score: number | null;
  home_ph: string | null;
  away_ph: string | null;
};

/** Carga todos los partidos de la edición una sola vez; Index usa el mismo resultado para las cifras. */
export function useHomeMatches(tournamentId: string | null) {
  return useQuery({
    queryKey: ["home-matches", tournamentId],
    enabled: !!tournamentId,
    staleTime: 60_000,
    queryFn: async (): Promise<HomeMatch[]> => {
      const { data, error } = await supabase
        .from("matches")
        .select(
          `id, match_date, status, phase, category_id, notes,
           categories(name),
           match_teams(side, score_regular, teams(id, name, logo_url, clubs(logo_url)))`,
        )
        .eq("tournament_id", tournamentId as string)
        .order("match_date", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((m: any) => {
        const home = m.match_teams?.find((mt: any) => mt.side === "home");
        const away = m.match_teams?.find((mt: any) => mt.side === "away");
        return {
          id: m.id,
          match_date: m.match_date,
          status: m.status,
          phase: m.phase,
          category_id: m.category_id,
          category_name: m.categories?.name ?? "",
          home_team: home?.teams?.name ?? null,
          away_team: away?.teams?.name ?? null,
          home_logo: home?.teams?.logo_url ?? home?.teams?.clubs?.logo_url ?? null,
          away_logo: away?.teams?.logo_url ?? away?.teams?.clubs?.logo_url ?? null,
          home_score: home?.score_regular ?? null,
          away_score: away?.score_regular ?? null,
          home_ph: home?.teams?.name ? null : placeholderFromNotes(m.notes, "home"),
          away_ph: away?.teams?.name ? null : placeholderFromNotes(m.notes, "away"),
        };
      });
    },
  });
}

function MatchRow({ m, showScore }: { m: HomeMatch; showScore: boolean }) {
  const color = catColor(m.category_name);
  const time = m.match_date ? formatBogota(m.match_date, "h:mm a") : "";
  const day = m.match_date ? formatBogota(m.match_date, "EEE d MMM") : "";
  const phase = m.phase !== "regular" ? PHASE_ES[m.phase] : null;
  const homeWins = showScore && (m.home_score ?? 0) > (m.away_score ?? 0);
  const awayWins = showScore && (m.away_score ?? 0) > (m.home_score ?? 0);
  return (
    <Link
      to={`/match/${m.id}`}
      className="grid grid-cols-[1fr_auto_1fr] sm:grid-cols-[96px_1fr_auto_1fr] items-center gap-x-3 gap-y-1 px-3 sm:px-4 py-3 border-t first:border-t-0 hover:bg-muted/50 transition-colors"
      style={{ borderLeft: `4px solid ${color}` }}
    >
      <div className="col-span-3 sm:col-span-1 flex sm:block items-center gap-2 text-xs leading-tight">
        <span className="font-semibold text-foreground sm:block">{showScore ? day : time}</span>
        {!showScore && <span className="text-muted-foreground sm:hidden">·</span>}
        <span className="font-bold uppercase tracking-wide sm:block" style={{ color }}>
          {m.category_name}
          {phase ? ` · ${phase}` : ""}
        </span>
      </div>
      <div className="flex items-center justify-end gap-2 min-w-0 text-right">
        <span className={cn("text-sm font-semibold break-words", homeWins && "text-green-600 dark:text-green-500")}>
          {m.home_team ?? m.home_ph ?? "Por definir"}
        </span>
        <TeamShield name={m.home_team} logo={m.home_logo} />
      </div>
      <div className="font-display text-lg min-w-[58px] text-center rounded-lg bg-muted px-2 py-0.5">
        {showScore ? `${m.home_score ?? 0} – ${m.away_score ?? 0}` : "VS"}
      </div>
      <div className="flex items-center gap-2 min-w-0">
        <TeamShield name={m.away_team} logo={m.away_logo} />
        <span className={cn("text-sm font-semibold break-words", awayWins && "text-green-600 dark:text-green-500")}>
          {m.away_team ?? m.away_ph ?? "Por definir"}
        </span>
      </div>
    </Link>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-10 text-center text-sm text-muted-foreground">{text}</p>;
}

const MEDAL = ["bg-yellow-500", "bg-slate-400", "bg-amber-700"];

function Medal({ i }: { i: number }) {
  return i < 3 ? (
    <span className={cn("h-6 w-6 rounded-full grid place-items-center text-xs font-bold text-white", MEDAL[i])}>{i + 1}</span>
  ) : (
    <span className="h-6 w-6 grid place-items-center text-xs text-muted-foreground">{i + 1}</span>
  );
}

function StandingsPane({ categoryId, tournamentId, hasGroups }: { categoryId: string; tournamentId: string; hasGroups: boolean }) {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["home-standings", tournamentId, categoryId],
    enabled: !hasGroups,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("standings_aggregate")
        .select("*, teams!inner(name, logo_url, clubs(logo_url))")
        .eq("tournament_id", tournamentId)
        .eq("category_id", categoryId)
        .order("points", { ascending: false })
        .order("goal_diff", { ascending: false });
      return (data ?? []) as any[];
    },
  });
  if (hasGroups) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground space-y-2">
        <p>Esta categoría se juega por grupos.</p>
        <Link to="/standings" className="text-primary font-semibold hover:underline">Ver las tablas por grupo →</Link>
      </div>
    );
  }
  if (isLoading) return <Empty text="Cargando…" />;
  if (rows.length === 0) return <Empty text="Todavía no hay posiciones para esta categoría." />;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-muted text-[11px] uppercase text-muted-foreground">
          <th className="py-2 pl-3 text-left w-8">#</th>
          <th className="py-2 text-left">Equipo</th>
          <th className="py-2 text-center">PJ</th>
          <th className="py-2 text-center">G</th>
          <th className="py-2 text-center">E</th>
          <th className="py-2 text-center">P</th>
          <th className="py-2 text-center hidden sm:table-cell">GF</th>
          <th className="py-2 text-center hidden sm:table-cell">GC</th>
          <th className="py-2 pr-3 text-center font-bold">Pts</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((s, i) => (
          <tr key={s.team_id ?? s.id ?? i} className="border-t">
            <td className="py-2 pl-3"><Medal i={i} /></td>
            <td className="py-2">
              <div className="flex items-center gap-2 font-semibold">
                <TeamShield name={s.teams?.name} logo={s.teams?.logo_url ?? s.teams?.clubs?.logo_url} />
                <span>{s.teams?.name}</span>
              </div>
            </td>
            <td className="text-center">{s.played}</td>
            <td className="text-center">{s.wins}</td>
            <td className="text-center">{s.draws}</td>
            <td className="text-center">{s.losses}</td>
            <td className="text-center hidden sm:table-cell">{s.goals_for}</td>
            <td className="text-center hidden sm:table-cell">{s.goals_against}</td>
            <td className="text-center pr-3 font-bold">{s.points}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ScorersPane({ categoryId, tournamentId }: { categoryId: string; tournamentId: string }) {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["home-scorers", tournamentId, categoryId],
    staleTime: 2 * 60_000,
    queryFn: async () => {
      const { data: ev } = await supabase
        .from("goal_events")
        .select("scorer_player_id, team_id, matches!inner(category_id, tournament_id)")
        .eq("matches.category_id", categoryId)
        .eq("matches.tournament_id", tournamentId);
      const goals: Record<string, { n: number; team: string | null }> = {};
      (ev ?? []).forEach((e: any) => {
        if (!e.scorer_player_id) return;
        const g = (goals[e.scorer_player_id] ??= { n: 0, team: e.team_id ?? null });
        g.n += 1;
      });
      const top = Object.entries(goals).sort((a, b) => b[1].n - a[1].n).slice(0, 5);
      if (top.length === 0) return [];
      const ids = top.map(([id]) => id);
      const teamIds = Array.from(new Set(top.map(([, g]) => g.team).filter(Boolean))) as string[];
      const [{ data: players }, { data: teams }] = await Promise.all([
        supabase.from("players_public").select("id, first_name, last_name, jersey_number").in("id", ids),
        supabase.from("teams").select("id, name, logo_url, clubs(logo_url)").in("id", teamIds),
      ]);
      return top.map(([id, g]) => {
        const p: any = (players ?? []).find((x: any) => x.id === id);
        const t: any = (teams ?? []).find((x: any) => x.id === g.team);
        return {
          id,
          goals: g.n,
          name: p ? `${p.first_name} ${p.last_name}` : "Jugador",
          jersey: p?.jersey_number ?? null,
          team: t?.name ?? "",
          logo: t?.logo_url ?? t?.clubs?.logo_url ?? null,
        };
      });
    },
  });
  if (isLoading) return <Empty text="Cargando…" />;
  if (rows.length === 0) return <Empty text="Todavía no hay goles registrados en esta categoría." />;
  return (
    <div>
      {rows.map((r, i) => (
        <div key={r.id} className="flex items-center gap-3 px-4 py-3 border-t first:border-t-0">
          <Medal i={i} />
          <TeamShield name={r.team} logo={r.logo} size="md" />
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{r.name}</p>
            <p className="text-xs text-muted-foreground truncate">{r.team}{r.jersey ? ` · #${r.jersey}` : ""}</p>
          </div>
          <span className="ml-auto font-display text-2xl text-primary">{r.goals}</span>
        </div>
      ))}
      <div className="px-4 py-3 border-t text-right">
        <Link to="/stats" className="text-sm text-primary font-semibold hover:underline">Ver todas las estadísticas →</Link>
      </div>
    </div>
  );
}

export default function HomeTabs({
  categories,
  tournamentId,
  matches,
  groupedCategoryIds,
  cat,
  setCat,
}: {
  categories: Cat[];
  tournamentId: string;
  matches: HomeMatch[];
  groupedCategoryIds: Set<string>;
  cat: string;
  setCat: (id: string) => void;
}) {
  const [tab, setTab] = useState("next");

  const filtered = useMemo(() => (cat === "all" ? matches : matches.filter((m) => m.category_id === cat)), [matches, cat]);

  const upcoming = useMemo(
    () =>
      filtered
        .filter((m) => m.status === "scheduled" || m.status === "postponed" || m.status === "to_be_defined")
        .filter((m) => m.match_date)
        .slice(0, 12),
    [filtered],
  );
  const results = useMemo(
    () =>
      filtered
        .filter((m) => m.status === "closed" || m.status === "locked")
        .sort((a, b) => (b.match_date ?? "").localeCompare(a.match_date ?? ""))
        .slice(0, 12),
    [filtered],
  );

  // Posiciones y goleadores son por categoría: si está "Todas", se muestra la primera.
  const effectiveCat = cat === "all" ? categories[0]?.id : cat;
  const needsCat = tab === "table" || tab === "scorers";

  // Agrupa próximos por día (hora Bogotá).
  const upcomingByDay = useMemo(() => {
    const groups: { key: string; label: string; items: HomeMatch[] }[] = [];
    upcoming.forEach((m) => {
      const d = toBogotaDate(m.match_date);
      const key = d ? `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` : "x";
      let g = groups.find((x) => x.key === key);
      if (!g) {
        g = { key, label: formatBogota(m.match_date, "EEEE d 'de' MMMM"), items: [] };
        groups.push(g);
      }
      g.items.push(m);
    });
    return groups;
  }, [upcoming]);

  return (
    <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full h-auto p-2 gap-1 rounded-none bg-muted/40 overflow-x-auto justify-start sm:justify-between">
          <TabsTrigger value="next" className="flex-1 gap-1.5 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <CalendarDays className="h-4 w-4" />Próximos
          </TabsTrigger>
          <TabsTrigger value="results" className="flex-1 gap-1.5 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <CheckCircle2 className="h-4 w-4" />Resultados
          </TabsTrigger>
          <TabsTrigger value="table" className="flex-1 gap-1.5 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <BarChart3 className="h-4 w-4" />Posiciones
          </TabsTrigger>
          <TabsTrigger value="scorers" className="flex-1 gap-1.5 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Target className="h-4 w-4" />Goleadores
          </TabsTrigger>
        </TabsList>

        <div className="flex gap-2 overflow-x-auto px-3 py-3 border-b">
          {[{ id: "all", name: "Todas" }, ...categories].map((c) => {
            const on = (c.id === "all" ? cat === "all" : cat === c.id);
            const color = c.id === "all" ? "hsl(var(--primary))" : catColor(c.name);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCat(c.id)}
                className={cn(
                  "whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold border transition-colors",
                  on ? "text-white border-transparent" : "bg-muted text-muted-foreground hover:text-foreground",
                )}
                style={on ? { backgroundColor: color } : { borderLeft: `4px solid ${color}` }}
              >
                {c.name}
              </button>
            );
          })}
        </div>

        {needsCat && cat === "all" && effectiveCat && (
          <p className="px-4 pt-3 text-xs text-muted-foreground">
            Mostrando {categories.find((c) => c.id === effectiveCat)?.name}. Elige otra categoría arriba.
          </p>
        )}

        <TabsContent value="next" className="m-0">
          {upcomingByDay.length === 0 ? (
            <Empty text="No hay partidos próximos." />
          ) : (
            upcomingByDay.map((g) => (
              <div key={g.key}>
                <div className="px-4 py-2 bg-muted/60 text-xs font-bold uppercase tracking-wider text-primary first-letter:uppercase lowercase">{g.label}</div>
                {g.items.map((m) => <MatchRow key={m.id} m={m} showScore={false} />)}
              </div>
            ))
          )}
          <div className="px-4 py-3 border-t text-right">
            <Link to="/schedule" className="text-sm text-primary font-semibold hover:underline">Ver toda la programación →</Link>
          </div>
        </TabsContent>

        <TabsContent value="results" className="m-0">
          {results.length === 0 ? <Empty text="Todavía no hay resultados." /> : results.map((m) => <MatchRow key={m.id} m={m} showScore />)}
          <div className="px-4 py-3 border-t text-right">
            <Link to="/schedule" className="text-sm text-primary font-semibold hover:underline">Ver todos los resultados →</Link>
          </div>
        </TabsContent>

        <TabsContent value="table" className="m-0">
          {effectiveCat ? (
            <StandingsPane categoryId={effectiveCat} tournamentId={tournamentId} hasGroups={groupedCategoryIds.has(effectiveCat)} />
          ) : <Empty text="Sin categorías." />}
        </TabsContent>

        <TabsContent value="scorers" className="m-0">
          {effectiveCat ? <ScorersPane categoryId={effectiveCat} tournamentId={tournamentId} /> : <Empty text="Sin categorías." />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
