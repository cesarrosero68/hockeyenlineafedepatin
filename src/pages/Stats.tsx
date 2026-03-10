import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, Target, Crosshair } from "lucide-react";

// Placeholder data generator
function generatePlaceholderStats(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    rank: i + 1,
    jersey: ((i * 7 + 13) % 99) + 1,
    name: "Name Last Name",
    goals: Math.max(0, 10 - i + Math.floor(((i * 3 + 7) % 5))),
    assists: Math.max(0, 8 - i + Math.floor(((i * 5 + 3) % 4))),
    points: 0,
  })).map(s => ({ ...s, points: s.goals + s.assists }))
    .sort((a, b) => b.points - a.points)
    .map((s, i) => ({ ...s, rank: i + 1 }));
}

export default function Stats() {
  const { data: stats = [], isLoading } = useQuery({
    queryKey: ["player-stats"],
    queryFn: async () => {
      const { data } = await supabase
        .from("player_stats_view")
        .select("player_id, goles, asistencias, puntos")
        .order("puntos", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  const playerIds = useMemo(() => stats.map((s: any) => s.player_id).filter(Boolean), [stats]);

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
  });

  const getPlayer = (id: string) => players.find((p: any) => p.id === id);

  const hasRealData = stats.length > 0;
  const placeholder = useMemo(() => generatePlaceholderStats(15), []);

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

      {!hasRealData && (
        <Badge variant="outline" className="text-xs">
          Vista previa — Los datos se actualizarán con estadísticas reales
        </Badge>
      )}

      <Tabs defaultValue="points" key={hasRealData ? "real" : "placeholder"}>
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
            data={hasRealData ? stats.map((s: any, i: number) => {
              const p = getPlayer(s.player_id);
              return {
                rank: i + 1,
                jersey: p?.jersey_number ?? 0,
                name: `${p?.first_name ?? "Name"} ${p?.last_name ?? "Last Name"}`,
                goals: s.goles ?? 0,
                assists: s.asistencias ?? 0,
                points: s.puntos ?? 0,
              };
            }) : placeholder}
            sortBy="points"
          />
        </TabsContent>

        <TabsContent value="goals">
          <StatsTable
            title="Líderes de Goles"
            data={hasRealData ? stats.map((s: any, i: number) => {
              const p = getPlayer(s.player_id);
              return {
                rank: i + 1,
                jersey: p?.jersey_number ?? 0,
                name: `${p?.first_name ?? "Name"} ${p?.last_name ?? "Last Name"}`,
                goals: s.goles ?? 0,
                assists: s.asistencias ?? 0,
                points: s.puntos ?? 0,
              };
            }).sort((a: any, b: any) => b.goals - a.goals).map((s: any, i: number) => ({ ...s, rank: i + 1 })) : [...placeholder].sort((a, b) => b.goals - a.goals).map((s, i) => ({ ...s, rank: i + 1 }))}
            sortBy="goals"
          />
        </TabsContent>

        <TabsContent value="assists">
          <StatsTable
            title="Líderes de Asistencias"
            data={hasRealData ? stats.map((s: any, i: number) => {
              const p = getPlayer(s.player_id);
              return {
                rank: i + 1,
                jersey: p?.jersey_number ?? 0,
                name: `${p?.first_name ?? "Name"} ${p?.last_name ?? "Last Name"}`,
                goals: s.goles ?? 0,
                assists: s.asistencias ?? 0,
                points: s.puntos ?? 0,
              };
            }).sort((a: any, b: any) => b.assists - a.assists).map((s: any, i: number) => ({ ...s, rank: i + 1 })) : [...placeholder].sort((a, b) => b.assists - a.assists).map((s, i) => ({ ...s, rank: i + 1 }))}
            sortBy="assists"
          />
        </TabsContent>
      </Tabs>
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
            {data.map((s: any, i: number) => (
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
