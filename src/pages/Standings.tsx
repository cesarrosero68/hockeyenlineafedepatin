import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3 } from "lucide-react";

export default function Standings() {
  const { data: divisions = [] } = useQuery({
    queryKey: ["divisions"],
    queryFn: async () => {
      const { data } = await supabase.from("divisions").select("id, name");
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id, name, division_id").order("sort_order");
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });

  const { data: standings = [], isLoading } = useQuery({
    queryKey: ["standings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("standings_aggregate")
        .select("*, teams!inner(name)")
        .order("points", { ascending: false })
        .order("goal_diff", { ascending: false });
      return data ?? [];
    },
  });

  if (isLoading) {
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
        <BarChart3 className="h-7 w-7 text-primary" />
        Tabla de Posiciones
      </h1>

      <Tabs defaultValue={defaultTab} key={defaultTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          {divisions.map((d: any) => (
            <TabsTrigger key={d.id} value={d.id} className="text-xs sm:text-sm">{d.name}</TabsTrigger>
          ))}
        </TabsList>

        {divisions.map((div: any) => {
          const divCategories = categories.filter((c: any) => c.division_id === div.id);
          return (
            <TabsContent key={div.id} value={div.id} className="space-y-6">
              {divCategories.map((cat: any) => {
                const catStandings = standings.filter((s: any) => s.category_id === cat.id);
                return (
                  <Card key={cat.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-display uppercase">{cat.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="overflow-x-auto">
                      {catStandings.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">
                          Sin datos aún. Las posiciones se calcularán al cerrar partidos.
                        </p>
                      ) : (
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b text-muted-foreground text-xs">
                              <th className="text-left py-2 px-1">#</th>
                              <th className="text-left py-2 px-1">Equipo</th>
                              <th className="text-center py-2 px-1">PJ</th>
                              <th className="text-center py-2 px-1">G</th>
                              <th className="text-center py-2 px-1">E</th>
                              <th className="text-center py-2 px-1">P</th>
                              <th className="text-center py-2 px-1">GF</th>
                              <th className="text-center py-2 px-1">GC</th>
                              <th className="text-center py-2 px-1">DG</th>
                              <th className="text-center py-2 px-1 font-bold">Pts</th>
                            </tr>
                          </thead>
                          <tbody>
                            {catStandings.map((s: any, i: number) => (
                              <tr key={s.id} className="border-b last:border-0">
                                <td className="py-2 px-1 text-muted-foreground">{s.rank ?? i + 1}</td>
                                <td className="py-2 px-1 font-medium">{s.teams?.name}</td>
                                <td className="text-center py-2 px-1">{s.played}</td>
                                <td className="text-center py-2 px-1">{s.wins}</td>
                                <td className="text-center py-2 px-1">{s.draws}</td>
                                <td className="text-center py-2 px-1">{s.losses}</td>
                                <td className="text-center py-2 px-1">{s.goals_for}</td>
                                <td className="text-center py-2 px-1">{s.goals_against}</td>
                                <td className="text-center py-2 px-1">{s.goal_diff}</td>
                                <td className="text-center py-2 px-1 font-bold">{s.points}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
