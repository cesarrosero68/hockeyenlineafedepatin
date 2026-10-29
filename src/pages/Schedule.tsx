import Seo from "@/components/Seo";
import PageHero from "@/components/PageHero";
import TeamShield from "@/components/home/TeamShield";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, Clock, MapPin, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { formatBogota, toBogotaDate } from "@/lib/timezone";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTournament } from "@/contexts/TournamentContext";
import { useMatchClock, periodShort } from "@/lib/matchClock";

// Cruces de fase final sin equipo todavia: el texto viene en "notes" como
// "Local: SEED 1 | Visitante: WIN SUB10-25". Solo se lee ese fragmento.
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
function placeholderFromNotes(notes: string | null | undefined, side: "home" | "away"): string | null {
  if (!notes) return null;
  const re = side === "home" ? /Local:\s*([^|]+?)(?:\s*\||\s*$)/ : /Visitante:\s*(.+?)\s*$/;
  return prettyPlaceholder(notes.match(re)?.[1]);
}

const phaseLabelEs: Record<string, string> = {
  playoff: "Clasificación",
  semifinal: "Semifinal",
  final: "Final",
  third_place: "Tercer puesto",
  ranking: "Definición de puestos",
};

interface MatchWithDetails {
  id: string;
  match_date: string | null;
  status: string;
  phase: string;
  round_number: number | null;
  venue: string | null;
  category_name: string;
  category_id: string;
  division_name: string;
  division_id: string;
  home_team: string | null;
  away_team: string | null;
  home_team_id: string | null;
  away_team_id: string | null;
  home_score: number | null;
  away_score: number | null;
  home_logo: string | null;
  away_logo: string | null;
  home_placeholder?: string | null;
  away_placeholder?: string | null;
  clock_enabled?: boolean | null;
  clock_started_at?: string | null;
  clock_offset_ms?: number | null;
  current_period?: number | null;
  period_minutes?: number | null;
}

const statusLabels: Record<string, string> = {
  scheduled: "Programado", in_progress: "En juego", closed: "Finalizado", locked: "Finalizado", postponed: "Aplazado", to_be_defined: "Por definir",
};
const statusBadgeClasses: Record<string, string> = {
  scheduled: "border-transparent bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
  in_progress: "border-transparent bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
  closed: "border-transparent bg-blue-100 text-blue-800 hover:bg-blue-100",
  locked: "border-transparent bg-blue-100 text-blue-800 hover:bg-blue-100",
  postponed: "border-transparent bg-orange-100 text-orange-800 hover:bg-orange-100",
  to_be_defined: "border-transparent bg-red-100 text-black hover:bg-red-100",
};

export default function Schedule() {
  const { viewedTournamentId } = useTournament();
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [filterDivision, setFilterDivision] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterTeam, setFilterTeam] = useState<string>("all");

  // Fetch divisions, categories, teams for filters
  const { data: divisions = [] } = useQuery({
    queryKey: ["filter-divisions", viewedTournamentId],
    queryFn: async () => {
      let q: any = supabase.from("divisions").select("id, name").order("name");
      if (viewedTournamentId) q = q.eq("tournament_id", viewedTournamentId);
      const { data } = await q;
      return data ?? [];
    },
    staleTime: 300_000,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["filter-categories", viewedTournamentId],
    queryFn: async () => {
      let q: any = supabase.from("categories").select("id, name, division_id").order("sort_order");
      if (viewedTournamentId) q = q.eq("tournament_id", viewedTournamentId);
      const { data } = await q;
      return data ?? [];
    },
    staleTime: 300_000,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ["filter-teams", viewedTournamentId],
    queryFn: async () => {
      let q: any = supabase.from("teams").select("id, name, category_id").order("name");
      if (viewedTournamentId) q = q.eq("tournament_id", viewedTournamentId);
      const { data } = await q;
      return data ?? [];
    },
    staleTime: 300_000,
  });

  // Cascading filter options
  const filteredCategories = useMemo(() => {
    if (filterDivision === "all") return categories;
    return categories.filter((c) => c.division_id === filterDivision);
  }, [categories, filterDivision]);

  const filteredTeams = useMemo(() => {
    if (filterCategory !== "all") return teams.filter((t) => t.category_id === filterCategory);
    if (filterDivision !== "all") {
      const catIds = new Set(filteredCategories.map((c) => c.id));
      return teams.filter((t) => catIds.has(t.category_id));
    }
    return teams;
  }, [teams, filterDivision, filterCategory, filteredCategories]);

  const { data: matches = [], isLoading } = useQuery({
    queryKey: ["schedule-matches", viewedTournamentId],
    queryFn: async () => {
      let q: any = supabase
        .from("matches")
        .select(`
          id, match_date, status, phase, round_number, venue, category_id, notes,
          clock_enabled, clock_started_at, clock_offset_ms, current_period, period_minutes,
          categories!inner(name, division_id, divisions!inner(id, name)),
          match_teams(side, score_regular, teams!inner(id, name, logo_url, clubs(logo_url)))
        `)
        .order("match_date", { ascending: true });
      if (viewedTournamentId) q = q.eq("tournament_id", viewedTournamentId);
      const { data } = await q;

      return (data ?? []).map((m: any) => {
        const home = m.match_teams?.find((mt: any) => mt.side === "home");
        const away = m.match_teams?.find((mt: any) => mt.side === "away");
        return {
          id: m.id,
          match_date: m.match_date,
          status: m.status,
          phase: m.phase,
          round_number: m.round_number,
          venue: m.venue,
          category_name: m.categories?.name ?? "",
          division_name: m.categories?.divisions?.name ?? "",
          division_id: m.categories?.divisions?.id ?? "",
          category_id: m.category_id ?? "",
          home_team: home?.teams?.name ?? null,
          away_team: away?.teams?.name ?? null,
          home_team_id: home?.teams?.id ?? null,
          away_team_id: away?.teams?.id ?? null,
          home_score: home?.score_regular ?? null,
          away_score: away?.score_regular ?? null,
          home_logo: home?.teams?.logo_url ?? home?.teams?.clubs?.logo_url ?? null,
          away_logo: away?.teams?.logo_url ?? away?.teams?.clubs?.logo_url ?? null,
          home_placeholder: home?.teams?.name ? null : placeholderFromNotes(m.notes, "home"),
          away_placeholder: away?.teams?.name ? null : placeholderFromNotes(m.notes, "away"),
          clock_enabled: m.clock_enabled,
          clock_started_at: m.clock_started_at,
          clock_offset_ms: m.clock_offset_ms,
          current_period: m.current_period,
          period_minutes: m.period_minutes,
        } as MatchWithDetails;
      });
    },
    staleTime: 60_000,
  });

  // Apply filters to matches
  const filteredMatches = useMemo(() => {
    let result = matches;
    if (filterDivision !== "all") {
      result = result.filter((m) => m.division_id === filterDivision);
    }
    if (filterCategory !== "all") {
      result = result.filter((m) => m.category_id === filterCategory);
    }
    if (filterTeam !== "all") {
      result = result.filter((m) => m.home_team_id === filterTeam || m.away_team_id === filterTeam);
    }
    return result;
  }, [matches, filterDivision, filterCategory, filterTeam, categories]);

  // Group matches by date key (yyyy-MM-dd in Bogota time)
  const matchesByDate = useMemo(() => {
    const groups: Record<string, MatchWithDetails[]> = {};
    filteredMatches.forEach((m) => {
      const bogota = toBogotaDate(m.match_date);
      const key = bogota ? format(bogota, "yyyy-MM-dd") : null;
      if (!key) return;
      if (!groups[key]) groups[key] = [];
      groups[key].push(m);
    });
    return groups;
  }, [filteredMatches]);

  // Dates that have matches (for highlighting in calendar)
  const datesWithMatches = useMemo(() => new Set(Object.keys(matchesByDate)), [matchesByDate]);

  // Calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const weekDays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const effectiveSelected = useMemo(() => {
    if (selectedDate && matchesByDate[selectedDate]) return selectedDate;
    const sorted = Object.keys(matchesByDate).sort();
    const today = format(new Date(), "yyyy-MM-dd");
    // Find closest date >= today
    const upcoming = sorted.find((d) => d >= today);
    if (upcoming) {
      return upcoming;
    }
    // Fallback: last played date
    const lastPlayed = [...sorted].reverse().find((d) => {
      return matchesByDate[d].some(
        (m) => m.status === "locked" || m.status === "closed"
      );
    });
    return lastPlayed ?? sorted[sorted.length - 1] ?? null;
  }, [selectedDate, matchesByDate]);

useMemo(() => {
    if (effectiveSelected && !selectedDate) {
      const date = new Date(effectiveSelected + "T12:00:00");
      setCurrentMonth(date);
    }
  }, [effectiveSelected]);
  

  const selectedMatches = effectiveSelected ? (matchesByDate[effectiveSelected] ?? []) : [];

  if (isLoading) {
    return (
      <div className="container py-8 flex justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="pb-10">
      <Seo
        title="Programación de partidos | Fedepatin"
        description="Calendario completo de partidos de hockey en línea: fechas, horarios, sedes y resultados por categoría."
        path="/schedule"
        jsonLd={{ "@context": "https://schema.org", "@type": "CollectionPage", name: "Programación de partidos | Fedepatin", description: "Calendario completo de partidos de hockey en línea: fechas, horarios, sedes y resultados por categoría.", url: "https://hockeyenlineafedepatin.site/schedule" }}
      />
      <PageHero icon={CalendarIcon} title="Programación y Resultados" subtitle="Calendario de partidos por fecha" />
      <div className="container py-6 space-y-6">

      {/* Cascading Filters */}
      <div className="flex flex-wrap gap-3 items-end rounded-2xl border bg-card p-4 shadow-sm">
        <div className="w-full sm:w-auto min-w-[180px]">
          <label className="text-xs font-medium text-muted-foreground mb-1 block flex items-center gap-1">
            <Filter className="h-3 w-3" /> División
          </label>
          <Select value={filterDivision} onValueChange={(v) => { setFilterDivision(v); setFilterCategory("all"); setFilterTeam("all"); setSelectedDate(null); }}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las divisiones</SelectItem>
              {divisions.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full sm:w-auto min-w-[180px]">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Categoría</label>
          <Select value={filterCategory} onValueChange={(v) => { setFilterCategory(v); setFilterTeam("all"); setSelectedDate(null); }}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {filteredCategories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {filterCategory !== "all" && (
          <div className="w-full sm:w-auto min-w-[180px]">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Equipo</label>
            <Select value={filterTeam} onValueChange={(v) => { setFilterTeam(v); setSelectedDate(null); }}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los equipos</SelectItem>
                {filteredTeams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {filteredMatches.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>No hay partidos programados aún.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
          {/* Calendar */}
          <Card className="w-full lg:w-[340px]">
            <CardContent className="p-4">
              {/* Month navigation */}
              <div className="flex items-center justify-between mb-4">
                <button
                  aria-label="Mes anterior"
                  onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
                  className="p-1.5 rounded-md hover:bg-accent transition-colors"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <span className="font-display font-bold capitalize text-sm">
                  {format(currentMonth, "MMMM yyyy", { locale: es })}
                </span>
                <button
                  aria-label="Mes siguiente"
                  onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
                  className="p-1.5 rounded-md hover:bg-accent transition-colors"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>

              {/* Week headers */}
              <div className="grid grid-cols-7 mb-1">
                {weekDays.map((d) => (
                  <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">
                    {d}
                  </div>
                ))}
              </div>

              {/* Days grid */}
              <div className="grid grid-cols-7">
                {calendarDays.map((day) => {
                  const key = format(day, "yyyy-MM-dd");
                  const hasMatches = datesWithMatches.has(key);
                  const isSelected = key === effectiveSelected;
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const isToday = isSameDay(day, new Date());

                  return (
                    <button
                      key={key}
                      onClick={() => hasMatches && setSelectedDate(key)}
                      disabled={!hasMatches}
                      className={cn(
                        "relative h-10 w-full flex items-center justify-center text-sm rounded-md transition-colors",
                        !isCurrentMonth && "opacity-30",
                        hasMatches && "cursor-pointer font-semibold hover:bg-accent",
                        !hasMatches && "text-muted-foreground cursor-default",
                        isSelected && "bg-primary text-primary-foreground hover:bg-primary/90",
                        isToday && !isSelected && "ring-1 ring-primary"
                      )}
                    >
                      {format(day, "d")}
                      {hasMatches && !isSelected && (
                        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Matches for selected date */}
          <div className="space-y-3">
            {effectiveSelected && (
              <h3 className="font-display font-bold uppercase text-sm text-muted-foreground flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                {format(new Date(effectiveSelected + "T12:00:00"), "EEEE d 'de' MMMM yyyy", { locale: es })}
                <Badge variant="secondary" className="ml-2 text-xs">
                  {selectedMatches.length} {selectedMatches.length === 1 ? "partido" : "partidos"}
                </Badge>
              </h3>
            )}

            {selectedMatches.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Selecciona un día con partidos en el calendario.
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-2 max-w-2xl">
                {selectedMatches.map((match) => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

function catColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 17 + name.charCodeAt(i)) % 360;
  return `hsl(${h} 60% 42%)`;
}

function MatchCard({ match }: { match: MatchWithDetails }) {
  const time = match.match_date ? formatBogota(match.match_date, "h:mm a") : null;
  const liveClock = useMatchClock(match);
  const showLive = match.status === "in_progress";
  const showScore = match.status === "closed" || match.status === "in_progress" || match.status === "locked";
  const done = match.status === "closed" || match.status === "locked";
  const homeWins = done && (match.home_score ?? 0) > (match.away_score ?? 0);
  const awayWins = done && (match.away_score ?? 0) > (match.home_score ?? 0);
  const color = catColor(match.category_name);

  return (
    <Link to={`/match/${match.id}`}>
      <Card className="overflow-hidden rounded-2xl shadow-sm hover:shadow-md transition-shadow cursor-pointer" style={{ borderLeft: `5px solid ${color}` }}>
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap text-sm">
              {time && <span className="flex items-center gap-1 font-semibold text-foreground"><Clock className="h-4 w-4" />{time}</span>}
              <span className="font-bold uppercase tracking-wide" style={{ color }}>{match.category_name}</span>
              <Badge variant="outline" className="text-xs">{match.division_name}</Badge>
              {match.phase !== "regular" && (
                <Badge variant="outline" className="text-xs">{phaseLabelEs[match.phase] ?? match.phase}</Badge>
              )}
            </div>
            <Badge variant="outline" className={`text-xs ${statusBadgeClasses[match.status] ?? ""}`}>
              {showLive && liveClock
                ? `${statusLabels[match.status]} · ${periodShort(match.current_period)} · ${liveClock}`
                : statusLabels[match.status] ?? match.status}
            </Badge>
          </div>

          <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-3">
            <div className="flex min-w-0 flex-col-reverse items-center gap-1 text-center sm:flex-row sm:justify-end sm:gap-2 sm:text-right">
              <span className={`text-sm sm:text-lg font-semibold leading-tight break-words ${homeWins ? "text-green-600" : ""} ${match.home_team ? "" : "italic text-muted-foreground font-medium"}`}>
                {match.home_team ?? match.home_placeholder ?? "Por definir"}
              </span>
              <TeamShield name={match.home_team} logo={match.home_logo} size="md" />
            </div>
            <div className="min-w-[56px] rounded-lg bg-muted px-2 py-1 text-center font-display text-lg sm:text-2xl font-bold">
              {showScore ? `${match.home_score ?? 0} – ${match.away_score ?? 0}` : <span className="text-muted-foreground text-base">VS</span>}
            </div>
            <div className="flex min-w-0 flex-col items-center gap-1 text-center sm:flex-row sm:gap-2 sm:text-left">
              <TeamShield name={match.away_team} logo={match.away_logo} size="md" />
              <span className={`text-sm sm:text-lg font-semibold leading-tight break-words ${awayWins ? "text-green-600" : ""} ${match.away_team ? "" : "italic text-muted-foreground font-medium"}`}>
                {match.away_team ?? match.away_placeholder ?? "Por definir"}
              </span>
            </div>
          </div>

          {match.venue && (
            <div className="mt-3 flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />{match.venue}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
