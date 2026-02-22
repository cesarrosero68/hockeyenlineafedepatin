import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, MapPin } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface MatchWithDetails {
  id: string;
  match_date: string | null;
  status: string;
  phase: string;
  round_number: number | null;
  venue: string | null;
  category_name: string;
  division_name: string;
  division_id: string;
  home_team: string | null;
  away_team: string | null;
  home_score: number | null;
  away_score: number | null;
}

interface Division {
  id: string;
  name: string;
}

const statusLabels: Record<string, string> = {
  scheduled: "Programado",
  in_progress: "En juego",
  closed: "Finalizado",
  locked: "Bloqueado",
};

const statusColors: Record<string, string> = {
  scheduled: "secondary",
  in_progress: "default",
  closed: "outline",
  locked: "destructive",
};

export default function Schedule() {
  const [matches, setMatches] = useState<MatchWithDetails[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [divRes, matchRes] = await Promise.all([
        supabase.from("divisions").select("id, name"),
        supabase
          .from("matches")
          .select(`
            id, match_date, status, phase, round_number, venue,
            categories!inner(name, division_id, divisions!inner(id, name)),
            match_teams(side, score_regular, teams!inner(name))
          `)
          .order("match_date", { ascending: true }),
      ]);

      if (divRes.data) setDivisions(divRes.data);

      if (matchRes.data) {
        const mapped: MatchWithDetails[] = matchRes.data.map((m: any) => {
          const homeTeam = m.match_teams?.find((mt: any) => mt.side === "home");
          const awayTeam = m.match_teams?.find((mt: any) => mt.side === "away");
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
            home_team: homeTeam?.teams?.name ?? null,
            away_team: awayTeam?.teams?.name ?? null,
            home_score: homeTeam?.score_regular ?? null,
            away_score: awayTeam?.score_regular ?? null,
          };
        });
        setMatches(mapped);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const groupByDate = (items: MatchWithDetails[]) => {
    const groups: Record<string, MatchWithDetails[]> = {};
    items.forEach((m) => {
      const key = m.match_date
        ? format(new Date(m.match_date), "yyyy-MM-dd")
        : "sin-fecha";
      if (!groups[key]) groups[key] = [];
      groups[key].push(m);
    });
    return groups;
  };

  if (loading) {
    return (
      <div className="container py-8 flex justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const defaultTab = divisions[0]?.id ?? "";

  return (
    <div className="container py-8 space-y-6">
      <h1 className="text-3xl font-display font-bold uppercase flex items-center gap-2">
        <Calendar className="h-7 w-7 text-primary" />
        Programación y Resultados
      </h1>

      {matches.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>No hay partidos programados aún.</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue={defaultTab}>
          <TabsList className="flex-wrap h-auto gap-1">
            {divisions.map((d) => (
              <TabsTrigger key={d.id} value={d.id} className="text-xs sm:text-sm">
                {d.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {divisions.map((div) => {
            const divMatches = matches.filter((m) => m.division_id === div.id);
            const grouped = groupByDate(divMatches);
            const dateKeys = Object.keys(grouped).sort();

            return (
              <TabsContent key={div.id} value={div.id} className="space-y-6">
                {divMatches.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      No hay partidos en esta división.
                    </CardContent>
                  </Card>
                ) : (
                  dateKeys.map((dateKey) => (
                    <div key={dateKey} className="space-y-3">
                      <h3 className="font-display font-bold uppercase text-sm text-muted-foreground flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {dateKey === "sin-fecha"
                          ? "Sin fecha asignada"
                          : format(new Date(dateKey + "T12:00:00"), "EEEE d 'de' MMMM yyyy", { locale: es })}
                      </h3>
                      <div className="grid gap-2">
                        {grouped[dateKey].map((match) => (
                          <MatchCard key={match.id} match={match} />
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      )}
    </div>
  );
}

function MatchCard({ match }: { match: MatchWithDetails }) {
  const time = match.match_date
    ? format(new Date(match.match_date), "h:mm a")
    : null;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {/* Category & Phase */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary" className="text-xs">
              {match.category_name}
            </Badge>
            {match.phase !== "regular" && (
              <Badge variant="outline" className="text-xs capitalize">
                {match.phase}
              </Badge>
            )}
          </div>

          {/* Status */}
          <Badge variant={statusColors[match.status] as any} className="text-xs">
            {statusLabels[match.status] ?? match.status}
          </Badge>
        </div>

        {/* Teams & Score */}
        <div className="mt-3 flex items-center justify-center gap-4 text-center">
          <span className="flex-1 text-right font-semibold text-sm sm:text-base truncate">
            {match.home_team ?? "Por definir"}
          </span>
          <div className="flex items-center gap-1 font-display font-bold text-lg min-w-[60px] justify-center">
            {match.status === "closed" || match.status === "in_progress" ? (
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

        {/* Meta */}
        <div className="mt-2 flex items-center justify-center gap-4 text-xs text-muted-foreground">
          {time && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {time}
            </span>
          )}
          {match.venue && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {match.venue}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
