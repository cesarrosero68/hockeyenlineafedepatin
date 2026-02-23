import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star } from "lucide-react";

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

  const playerIds = stats.map((s: any) => s.player_id).filter(Boolean);

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

      {stats.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Star className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>Las estadísticas se calculan desde eventos de gol registrados.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display uppercase">Líderes de Puntos</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground text-xs">
                  <th className="text-left py-2 px-1">#</th>
                  <th className="text-left py-2 px-1">Jugador</th>
                  <th className="text-center py-2 px-1">G</th>
                  <th className="text-center py-2 px-1">A</th>
                  <th className="text-center py-2 px-1 font-bold">Pts</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((s: any, i: number) => {
                  const p = getPlayer(s.player_id);
                  return (
                    <tr key={s.player_id} className="border-b last:border-0">
                      <td className="py-2 px-1 text-muted-foreground">{i + 1}</td>
                      <td className="py-2 px-1 font-medium">
                        {p?.jersey_number ? `#${p.jersey_number} ` : ""}
                        {p?.first_name} {p?.last_name}
                      </td>
                      <td className="text-center py-2 px-1">{s.goles ?? 0}</td>
                      <td className="text-center py-2 px-1">{s.asistencias ?? 0}</td>
                      <td className="text-center py-2 px-1 font-bold">{s.puntos ?? 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
