import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";

const POSITIONS = ["Portero", "Defensa", "Delantero"];

function getRandomJersey(seed: number) {
  return ((seed * 7 + 13) % 99) + 1;
}

function getRandomPosition(seed: number) {
  return POSITIONS[seed % POSITIONS.length];
}

export default function TeamsPage() {
  const {
    data: divisions = [],
    isLoading: loadingDivisions,
    isError: errorDivisions,
  } = useQuery({
    queryKey: ["divisions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("divisions").select("id, name, logo_url").order("name");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });

  const { data: categories = [], isLoading: loadingCategories, isError: errorCategories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("id, name, division_id").order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });

  const { data: teams = [], isLoading: loadingTeams, isError: errorTeams } = useQuery({
    queryKey: ["all-teams"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("id, name, logo_url, category_id, clubs(name, logo_url)")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });

  const isLoading = loadingDivisions || loadingCategories || loadingTeams;
  const hasError = errorDivisions || errorCategories || errorTeams;
  const defaultTab = divisions[0]?.id ?? "";

  return (
    <div className="container py-8 space-y-6">
      <h1 className="text-3xl font-display font-bold uppercase flex items-center gap-2">
        <Users className="h-7 w-7 text-primary" />
        Equipos Participantes
      </h1>

      {isLoading ? (
        <Card>
          <CardContent className="py-12 flex justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </CardContent>
        </Card>
      ) : hasError ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <AlertTriangle className="h-10 w-10 mx-auto mb-3 text-destructive" />
            <p>No se pudieron cargar equipos y divisiones.</p>
            <p className="text-sm mt-1">Recarga la página y si persiste reviso la conexión del backend.</p>
          </CardContent>
        </Card>
      ) : divisions.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">No hay divisiones disponibles.</CardContent>
        </Card>
      ) : (
        <Tabs defaultValue={defaultTab} key={defaultTab}>
          <TabsList className="flex-wrap h-auto gap-1">
            {divisions.map((d: any) => (
              <TabsTrigger key={d.id} value={d.id} className="text-xs sm:text-sm">
                {d.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {divisions.map((div: any) => {
            const divCategories = categories.filter((c: any) => c.division_id === div.id);
            return (
              <TabsContent key={div.id} value={div.id} className="space-y-6">
                {divCategories.map((cat: any) => {
                  const catTeams = teams.filter((t: any) => t.category_id === cat.id);
                  if (catTeams.length === 0) return null;
                  return (
                    <div key={cat.id} className="space-y-3">
                      <h3 className="font-display font-bold uppercase text-sm text-muted-foreground">{cat.name}</h3>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {catTeams.map((team: any) => (
                          <TeamCard
                            key={team.id}
                            team={team}
                            categoryName={cat.name}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </TabsContent>
            );
          })}
        </Tabs>
      )}
    </div>
  );
}

function TeamCard({
  team,
  categoryName,
}: {
  team: any;
  categoryName: string;
}) {
  const [expanded, setExpanded] = useState(false);

  // Lazy-load rosters only when expanded
  const { data: rosterData, isLoading: rostersLoading } = useQuery({
    queryKey: ["team-rosters", team.id],
    queryFn: async () => {
      const { data: rosters, error } = await supabase
        .from("rosters")
        .select("id, jersey_number, position, team_id, player_id")
        .eq("team_id", team.id)
        .order("jersey_number");
      if (error) throw error;
      const playerIds = (rosters ?? []).map((r) => r.player_id).filter(Boolean);
      let playersMap: Record<string, { first_name: string | null; last_name: string | null; jersey_number: number | null }> = {};
      if (playerIds.length > 0) {
        const { data: players } = await supabase
          .from("players_public")
          .select("id, first_name, last_name, jersey_number")
          .in("id", playerIds);
        for (const p of players ?? []) {
          if (p.id) playersMap[p.id] = p;
        }
      }
      return { rosters: rosters ?? [], playersMap };
    },
    enabled: expanded,
    staleTime: 5 * 60_000,
  });

  const rosterRows = rosterData?.rosters ?? [];
  const playersMap = rosterData?.playersMap ?? {};

  const displayRoster = useMemo(() => {
    if (rosterRows.length > 0) {
      return [...rosterRows]
        .sort((a: any, b: any) => {
          const aGk = (a.position ?? "") === "ARQUERO" ? 0 : 1;
          const bGk = (b.position ?? "") === "ARQUERO" ? 0 : 1;
          if (aGk !== bGk) return aGk - bGk;
          const aJersey = a.jersey_number ?? playersMap[a.player_id]?.jersey_number ?? 999;
          const bJersey = b.jersey_number ?? playersMap[b.player_id]?.jersey_number ?? 999;
          return aJersey - bJersey;
        })
        .map((r: any, i: number) => {
          const player = playersMap[r.player_id];
          return {
            jersey: r.jersey_number ?? player?.jersey_number ?? getRandomJersey(i),
            name: player ? `${player.first_name ?? ""} ${player.last_name ?? ""}`.trim() || "Sin nombre" : "Sin nombre",
            position: r.position ?? getRandomPosition(i),
            category: categoryName,
          };
        });
    }
    if (expanded && !rostersLoading) {
      return Array.from({ length: 10 }, (_, i) => ({
        jersey: getRandomJersey(i + team.id.charCodeAt(0)),
        name: "Sin registro",
        position: getRandomPosition(i),
        category: categoryName,
      }));
    }
    return [];
  }, [rosterRows, playersMap, expanded, rostersLoading, categoryName, team.id]);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 cursor-pointer flex items-center justify-between gap-3" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-3">
          {(team.clubs?.logo_url || team.logo_url) && (
            <img src={team.clubs?.logo_url || team.logo_url} alt={team.name} className="h-10 w-10 object-contain rounded" loading="lazy" />
          )}
          <div>
            <p className="font-display font-bold text-sm uppercase">{team.name}</p>
            {team.clubs?.name && <p className="text-xs text-muted-foreground">{team.clubs.name}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {categoryName}
          </Badge>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </CardContent>

      {expanded && (
        <div className="border-t px-4 py-3">
          {rostersLoading ? (
            <div className="py-4 flex justify-center">
              <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left py-1.5 px-1">#</th>
                  <th className="text-left py-1.5 px-1">Jugador</th>
                  <th className="text-left py-1.5 px-1">Posición</th>
                  <th className="text-left py-1.5 px-1">Categoría</th>
                </tr>
              </thead>
              <tbody>
                {displayRoster.map((p, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-1.5 px-1 font-mono">{p.jersey}</td>
                    <td className="py-1.5 px-1 font-medium">{p.name}</td>
                    <td className="py-1.5 px-1">
                      <Badge variant="outline" className="text-[10px]">
                        {p.position}
                      </Badge>
                    </td>
                    <td className="py-1.5 px-1 text-muted-foreground">{p.category}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </Card>
  );
}
