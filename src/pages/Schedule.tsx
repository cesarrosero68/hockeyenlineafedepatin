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
}

const statusLabels: Record<string, string> = {
  scheduled: "Programado", in_progress: "En juego", closed: "Finalizado", locked: "Finalizado",
};
const statusColors: Record<string, string> = {
  scheduled: "secondary", in_progress: "default", closed: "outline", locked: "destructive",
};

export default function Schedule() {
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [filterDivision, setFilterDivision] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterTeam, setFilterTeam] = useState<string>("all");

  // Fetch divisions, categories, teams for filters
  const { data: divisions = [] } = useQuery({
    queryKey: ["filter-divisions"],
    queryFn: async () => {
      const { data } = await supabase.from("divisions").select("id, name").order("name");
      return data ?? [];
    },
    staleTime: 300_000,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["filter-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id, name, division_id").order("sort_order");
      return data ?? [];
    },
    staleTime: 300_000,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ["filter-teams"],
    queryFn: async () => {
      const { data } = await supabase.from("teams").select("id, name, category_id").order("name");
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
    queryKey: ["schedule-matches"],
    queryFn: async () => {
      const { data } = await supabase
        .from("matches")
        .select(`
          id, match_date, status, phase, round_number, venue, category_id,
          categories!inner(name, division_id, divisions!inner(id, name)),
          match_teams(side, score_regular, teams!inner(id, name))
        `)
        .order("match_date", { ascending: true });

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
    <div className="container py-8 space-y-6">
      <h1 className="text-3xl font-display font-bold uppercase flex items-center gap-2">
        <CalendarIcon className="h-7 w-7 text-primary" />
        Programación y Resultados
      </h1>

      {/* Cascading Filters */}
      <div className="flex flex-wrap gap-3 items-end">
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
                  onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
                  className="p-1.5 rounded-md hover:bg-accent transition-colors"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <span className="font-display font-bold capitalize text-sm">
                  {format(currentMonth, "MMMM yyyy", { locale: es })}
                </span>
                <button
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
  );
}

function MatchCard({ match }: { match: MatchWithDetails }) {
  const time = match.match_date ? formatBogota(match.match_date, "h:mm a") : null;

  return (
    <Link to={`/match/${match.id}`}>
      <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary" className="text-xs">{match.category_name}</Badge>
              <Badge variant="outline" className="text-xs">{match.division_name}</Badge>
              {match.phase !== "regular" && (
                <Badge variant="outline" className="text-xs capitalize">{match.phase}</Badge>
              )}
            </div>
            <Badge variant={statusColors[match.status] as any} className="text-xs">
              {statusLabels[match.status] ?? match.status}
            </Badge>
          </div>

          <div className="mt-3 flex items-center justify-center gap-4 text-center">
            <span className="flex-1 text-right font-semibold text-sm sm:text-base truncate">
              {match.home_team ?? "Por definir"}
            </span>
            <div className="flex items-center gap-1 font-display font-bold text-lg min-w-[60px] justify-center">
              {match.status === "closed" || match.status === "in_progress" || match.status === "locked" ? (
                <>
                  <span>{match.home_score ?? 0}</span>
                  <span className="text-muted-foreground">-</span>
                  <span>{match.away_score ?? 0}</span>
                </>
              ) : (
                <span className="text-muted-foreground text-sm">vs</span>
              )}
            </div>
            <span className="flex-1 text-left font-semibold text-sm sm:text-base truncate">
              {match.away_team ?? "Por definir"}
            </span>
          </div>

          <div className="mt-2 flex items-center justify-center gap-4 text-xs text-muted-foreground">
            {time && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />{time}
              </span>
            )}
            {match.venue && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />{match.venue}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
