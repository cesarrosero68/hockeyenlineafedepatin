import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Star, Target, Crosshair } from "lucide-react";

export default function Stats() {
  const [selectedDivision, setSelectedDivision] = useState<string>("");

  // Fetch divisions
  const { data: divisions = [] } = useQuery({
    queryKey: ["divisions"],
    queryFn: async () => {
      const { data } = await supabase.from("divisions").select("id, name").order("name");
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });

  // Auto-select first division
  const activeDivisionId = selectedDivision || divisions[0]?.id || "";

  // Fetch categories for selected division
  const { data: categories = [] } = useQuery({
    queryKey: ["categories", activeDivisionId],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("id, name, sort_order")
        .eq("division_id", activeDivisionId)
        .order("sort_order");
      return data ?? [];
    },
    enabled: !!activeDivisionId,
    staleTime: 5 * 60_000,
  });

  // Fetch all goal_events with match category info for the active division
  const { data: goalEvents = [], isLoading } = useQuery({
    queryKey: ["goal-events-stats", activeDivisionId],
    queryFn: async () => {
      const categoryIds = categories.map((c) => c.id);
      if (categoryIds.length === 0) return [];

      const { data } = await supabase
        .from("goal_events")
        .select("scorer_player_id, assist_player_id, team_id, match_id, matches!inner(category_id)")
        .in("matches.category_id", categoryIds);
      return data ?? [];
    },
    enabled: categories.length > 0,
    staleTime: 2 * 60_000,
  });

  // Collect unique player IDs
  const playerIds = useMemo(() => {
    const ids = new Set<string>();
    goalEvents.forEach((e: any) => {
      if (e.scorer_player_id) ids.add(e.scorer_player_id);
      if (e.assist_player_id) ids.add(e.assist_player_id);
    });
    return Array.from(ids);
  }, [goalEvents]);

  // Fetch player names from players_public
  const { data: players = [] } = useQuery({
    queryKey: ["stat-players", playerIds],
    queryFn: async () => {
      if (playerIds.length === 0) return [];
      const { data } = await supabase
        .from("players_public")
        .select("id, first_name, last_name, jersey_number")
        .in("id", playerIds);
      return data ?? [];
    },
    enabled: playerIds.length > 0,
    staleTime: 5 * 60_000,
  });

  const playersMap = useMemo(() => {
    const map: Record<string, { first_name: string; last_name: string; jersey_number: number | null }> = {};
    players.forEach((p: any) => {
      if (p.id) map[p.id] = p;
    });
    return map;
  }, [players]);

  // Collect unique team IDs from goal events
  const teamIds = useMemo(() => {
    const ids = new Set<string>();
    goalEvents.forEach((e: any) => {
      if (e.team_id) ids.add(e.team_id);
    });
    return Array.from(ids);
  }, [goalEvents]);

  // Fetch team names with club info
  const { data: teams = [] } = useQuery({
    queryKey: ["stat-teams", teamIds],
    queryFn: async () => {
      if (teamIds.length === 0) return [];
      const { data } = await supabase
        .from("teams")
        .select("id, name, club_id, clubs(name)")
        .in("id", teamIds);
      return data ?? [];
    },
    enabled: teamIds.length > 0,
    staleTime: 5 * 60_000,
  });

  const teamsMap = useMemo(() => {
    const map: Record<string, { teamName: string; clubName: string }> = {};
    teams.forEach((t: any) => {
      map[t.id] = { teamName: t.name, clubName: t.clubs?.name ?? "" };
    });
    return map;
  }, [teams]);

  // Compute stats per category + track player→team mapping
  const statsByCategory = useMemo(() => {
    const result: Record<string, { goals: Record<string, number>; assists: Record<string, number>; playerTeam: Record<string, string> }> = {};

    categories.forEach((c) => {
      result[c.id] = { goals: {}, assists: {}, playerTeam: {} };
    });

    goalEvents.forEach((e: any) => {
      const catId = e.matches?.category_id;
      if (!catId || !result[catId]) return;

      if (e.scorer_player_id) {
        result[catId].goals[e.scorer_player_id] = (result[catId].goals[e.scorer_player_id] || 0) + 1;
        if (e.team_id) result[catId].playerTeam[e.scorer_player_id] = e.team_id;
      }
      if (e.assist_player_id) {
        result[catId].assists[e.assist_player_id] = (result[catId].assists[e.assist_player_id] || 0) + 1;
        if (e.team_id) result[catId].playerTeam[e.assist_player_id] = e.team_id;
      }
    });

    return result;
  }, [goalEvents, categories]);

  // Build leaderboard for a category
  const buildLeaderboard = (categoryId: string) => {
    const catStats = statsByCategory[categoryId];
    if (!catStats) return [];

    const allPlayers = new Set([...Object.keys(catStats.goals), ...Object.keys(catStats.assists)]);
    const rows = Array.from(allPlayers).map((pid) => {
      const p = playersMap[pid];
      const goals = catStats.goals[pid] || 0;
      const assists = catStats.assists[pid] || 0;
      return {
        playerId: pid,
        jersey: p?.jersey_number ?? 0,
        name: p ? `${p.first_name} ${p.last_name}` : "Jugador",
        goals,
        assists,
        points: goals + assists,
      };
    });

    return rows.sort((a, b) => b.points - a.points || b.goals - a.goals);
  };

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
        <Star className="h-7 w-7 text-secondary" />
        Estadísticas
      </h1>

      {/* Division selector */}
      <div className="max-w-xs">
        <Select value={activeDivisionId} onValueChange={setSelectedDivision}>
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar División" />
          </SelectTrigger>
          <SelectContent>
            {divisions.map((d: any) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Category sections */}
      {categories.map((cat: any) => {
        const leaderboard = buildLeaderboard(cat.id);
        const hasData = leaderboard.length > 0;

        return (
          <div key={cat.id} className="space-y-3">
            <h2 className="text-xl font-display font-bold uppercase">{cat.name}</h2>

            {!hasData ? (
              <Card>
                <CardContent className="py-6 text-center text-muted-foreground text-sm">
                  Sin estadísticas registradas aún
                </CardContent>
              </Card>
            ) : (
              <Tabs defaultValue="points">
                <TabsList>
                  <TabsTrigger value="points" className="flex items-center gap-1">
                    <Star className="h-4 w-4" /> Puntos
                  </TabsTrigger>
                  <TabsTrigger value="goals" className="flex items-center gap-1">
                    <Target className="h-4 w-4" /> Goles
                  </TabsTrigger>
                  <TabsTrigger value="assists" className="flex items-center gap-1">
                    <Crosshair className="h-4 w-4" /> Asistencias
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="points">
                  <StatsTable
                    title="Líderes de Puntos"
                    data={leaderboard.map((s, i) => ({ ...s, rank: i + 1 }))}
                    sortBy="points"
                  />
                </TabsContent>

                <TabsContent value="goals">
                  <StatsTable
                    title="Líderes de Goles"
                    data={[...leaderboard]
                      .sort((a, b) => b.goals - a.goals || b.points - a.points)
                      .map((s, i) => ({ ...s, rank: i + 1 }))}
                    sortBy="goals"
                  />
                </TabsContent>

                <TabsContent value="assists">
                  <StatsTable
                    title="Líderes de Asistencias"
                    data={[...leaderboard]
                      .sort((a, b) => b.assists - a.assists || b.points - a.points)
                      .map((s, i) => ({ ...s, rank: i + 1 }))}
                    sortBy="assists"
                  />
                </TabsContent>
              </Tabs>
            )}
          </div>
        );
      })}
    </div>
  );
}

function StatsTable({ title, data, sortBy }: { title: string; data: any[]; sortBy: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-display uppercase">{title}</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-muted-foreground text-xs">
              <th className="text-left py-2 px-1">#</th>
              <th className="text-left py-2 px-1">Jugador</th>
              <th className={`text-center py-2 px-1 ${sortBy === "goals" ? "font-bold" : ""}`}>G</th>
              <th className={`text-center py-2 px-1 ${sortBy === "assists" ? "font-bold" : ""}`}>A</th>
              <th className={`text-center py-2 px-1 ${sortBy === "points" ? "font-bold" : ""}`}>Pts</th>
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 20).map((s: any, i: number) => (
              <tr key={i} className="border-b last:border-0">
                <td className="py-2 px-1 text-muted-foreground">{s.rank}</td>
                <td className="py-2 px-1 font-medium">
                  {s.jersey ? `#${s.jersey} ` : ""}
                  {s.name}
                </td>
                <td className={`text-center py-2 px-1 ${sortBy === "goals" ? "font-bold" : ""}`}>{s.goals}</td>
                <td className={`text-center py-2 px-1 ${sortBy === "assists" ? "font-bold" : ""}`}>{s.assists}</td>
                <td className={`text-center py-2 px-1 ${sortBy === "points" ? "font-bold" : ""}`}>{s.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
