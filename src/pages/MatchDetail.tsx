import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { publicClient } from "@/integrations/supabase/public-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, MapPin, Target, ShieldAlert, Users } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const statusLabels: Record<string, string> = {
  scheduled: "Programado",
  in_progress: "En juego",
  closed: "Finalizado",
  locked: "Bloqueado",
};

export default function MatchDetail() {
  const { id } = useParams<{ id: string }>();

  const { data: match, isLoading } = useQuery({
    queryKey: ["match", id],
    queryFn: async () => {
      const { data, error } = await publicClient
        .from("matches")
        .select(`
          id, match_date, status, phase, round_number, venue, notes, extra_time,
          categories!inner(name, divisions!inner(name)),
          match_teams(side, score_regular, score_extra, is_winner, is_forfeit, team_id, teams!inner(id, name, logo_url))
        `)
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const homeTeam = (match as any)?.match_teams?.find((mt: any) => mt.side === "home");
  const awayTeam = (match as any)?.match_teams?.find((mt: any) => mt.side === "away");

  const { data: goals } = useQuery({
    queryKey: ["match-goals", id],
    queryFn: async () => {
      const { data } = await publicClient
        .from("goal_events")
        .select(`
          id, period, game_time, is_overtime, is_shootout, team_id,
          scorer:players_public!goal_events_scorer_player_id_fkey(first_name, last_name, jersey_number),
          assist:players_public!goal_events_assist_player_id_fkey(first_name, last_name, jersey_number)
        `)
        .eq("match_id", id!)
        .order("period")
        .order("game_time");
      return data ?? [];
    },
    enabled: !!id,
  });

  const { data: penaltiesList } = useQuery({
    queryKey: ["match-penalties", id],
    queryFn: async () => {
      const { data } = await publicClient
        .from("penalties")
        .select(`
          id, period, game_time, penalty_code, penalty_description, penalty_minutes, team_id,
          player:players_public!penalties_player_id_fkey(first_name, last_name, jersey_number)
        `)
        .eq("match_id", id!)
        .order("period")
        .order("game_time");
      return data ?? [];
    },
    enabled: !!id,
  });

  const { data: rosters } = useQuery({
    queryKey: ["match-rosters", id, homeTeam?.team_id, awayTeam?.team_id],
    queryFn: async () => {
      const teamIds = [homeTeam?.team_id, awayTeam?.team_id].filter(Boolean);
      if (teamIds.length === 0) return [];
      const { data } = await publicClient
        .from("rosters")
        .select(`
          id, jersey_number, position, team_id,
          player:players_public!rosters_player_id_fkey(first_name, last_name)
        `)
        .in("team_id", teamIds)
        .order("jersey_number");
      return data ?? [];
    },
    enabled: !!homeTeam || !!awayTeam,
  });

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
  const matchDate = m.match_date ? new Date(m.match_date) : null;

  const getTeamName = (teamId: string) => {
    if (homeTeam?.teams?.id === teamId) return homeTeam.teams.name;
    if (awayTeam?.teams?.id === teamId) return awayTeam.teams.name;
    return "—";
  };

  return (
    <div className="container py-8 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="secondary">{m.categories?.name}</Badge>
          <span>{m.categories?.divisions?.name}</span>
          <Badge variant={m.status === "closed" ? "outline" : m.status === "in_progress" ? "default" : "secondary"}>
            {statusLabels[m.status] ?? m.status}
          </Badge>
        </div>
        {matchDate && (
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {format(matchDate, "EEEE d 'de' MMMM yyyy", { locale: es })}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {format(matchDate, "h:mm a")}
            </span>
            {m.venue && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {m.venue}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Scoreboard */}
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-6 text-center">
            <div className="flex-1 text-right space-y-1">
              <p className="text-xl sm:text-2xl font-display font-bold">{homeTeam?.teams?.name ?? "Por definir"}</p>
              <p className="text-xs text-muted-foreground">Local</p>
            </div>
            <div className="flex items-center gap-2 font-display font-bold text-4xl min-w-[100px] justify-center">
              {m.status === "closed" || m.status === "in_progress" || m.status === "locked" ? (
                <>
                  <span>{homeTeam?.score_regular ?? 0}</span>
                  <span className="text-muted-foreground text-2xl">-</span>
                  <span>{awayTeam?.score_regular ?? 0}</span>
                </>
              ) : (
                <span className="text-muted-foreground text-2xl">vs</span>
              )}
            </div>
            <div className="flex-1 text-left space-y-1">
              <p className="text-xl sm:text-2xl font-display font-bold">{awayTeam?.teams?.name ?? "Por definir"}</p>
              <p className="text-xs text-muted-foreground">Visitante</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="goals">
        <TabsList>
          <TabsTrigger value="goals" className="flex items-center gap-1">
            <Target className="h-4 w-4" /> Goles
          </TabsTrigger>
          <TabsTrigger value="penalties" className="flex items-center gap-1">
            <ShieldAlert className="h-4 w-4" /> Sanciones
          </TabsTrigger>
          <TabsTrigger value="rosters" className="flex items-center gap-1">
            <Users className="h-4 w-4" /> Plantillas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="goals" className="space-y-2">
          {(!goals || goals.length === 0) ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No hay goles registrados.</CardContent></Card>
          ) : (
            goals.map((g: any) => (
              <Card key={g.id}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs">{getTeamName(g.team_id)}</Badge>
                    <div>
                      <p className="font-semibold text-sm">
                        {g.scorer?.jersey_number ? `#${g.scorer.jersey_number} ` : ""}
                        {g.scorer?.first_name} {g.scorer?.last_name}
                      </p>
                      {g.assist && (
                        <p className="text-xs text-muted-foreground">
                          Asist: {g.assist.first_name} {g.assist.last_name}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground text-right">
                    <p>Periodo {g.period}{g.is_overtime ? " (OT)" : ""}{g.is_shootout ? " (SO)" : ""}</p>
                    {g.game_time && <p>{g.game_time}</p>}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="penalties" className="space-y-2">
          {(!penaltiesList || penaltiesList.length === 0) ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No hay sanciones registradas.</CardContent></Card>
          ) : (
            penaltiesList.map((p: any) => (
              <Card key={p.id}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs">{getTeamName(p.team_id)}</Badge>
                    <div>
                      <p className="font-semibold text-sm">
                        {p.player?.jersey_number ? `#${p.player.jersey_number} ` : ""}
                        {p.player?.first_name} {p.player?.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {p.penalty_code} — {p.penalty_description}
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground text-right">
                    <p>{p.penalty_minutes} min</p>
                    <p>Periodo {p.period}</p>
                    {p.game_time && <p>{p.game_time}</p>}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="rosters" className="space-y-4">
          {[{ label: "Local", teamId: homeTeam?.team_id, teamName: homeTeam?.teams?.name },
            { label: "Visitante", teamId: awayTeam?.team_id, teamName: awayTeam?.teams?.name }]
            .map(({ label, teamId, teamName }) => {
              const teamRoster = rosters?.filter((r: any) => r.team_id === teamId) ?? [];
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
