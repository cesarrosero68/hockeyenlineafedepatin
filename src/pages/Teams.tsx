import Seo from "@/components/Seo";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { useTournament } from "@/contexts/TournamentContext";

const POSITIONS = ["Portero", "Defensa", "Delantero"];

function getRandomJersey(seed: number) {
  return ((seed * 7 + 13) % 99) + 1;
}

function getRandomPosition(seed: number) {
  return POSITIONS[seed % POSITIONS.length];
}

export default function TeamsPage() {
  const { viewedTournamentId } = useTournament();
  const [searchParams] = useSearchParams();
  const requestedDivision = searchParams.get("division");
  const [activeDivision, setActiveDivision] = useState<string>("");

  // Divisions and categories are shared structure across editions — never filtered by tournament_id
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

  // Teams ARE edition-specific — filtered by viewedTournamentId
  const { data: teams = [], isLoading: loadingTeams, isError: errorTeams } = useQuery({
    queryKey: ["all-teams", viewedTournamentId],
    queryFn: async () => {
      let q: any = supabase
        .from("teams")
        .select("id, name, logo_url, category_id, group_name, clubs(name, logo_url)")
        .order("name");
      if (viewedTournamentId) q = q.eq("tournament_id", viewedTournamentId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });

  const isLoading = loadingDivisions || loadingCategories || loadingTeams;
  const hasError = errorDivisions || errorCategories || errorTeams;

  // Only show divisions/categories that actually have teams in this edition
  const divisionsWithTeams = useMemo(() => {
    return divisions.filter((d: any) =>
      categories.some((c: any) => c.division_id === d.id && teams.some((t: any) => t.category_id === c.id))
    );
  }, [divisions, categories, teams]);

  const defaultTab = divisionsWithTeams[0]?.id ?? "";

  useEffect(() => {
    if (divisionsWithTeams.length === 0) return;
    const match = requestedDivision
      ? divisionsWithTeams.find(
          (d: any) =>
            d.id === requestedDivision ||
            d.name.toLowerCase() === requestedDivision.toLowerCase()
        )
      : null;
    setActiveDivision((prev) => match?.id ?? (prev && divisionsWithTeams.some((d: any) => d.id === prev) ? prev : defaultTab));
  }, [requestedDivision, divisionsWithTeams, defaultTab]);

  return (
    <div className="container py-8 space-y-6">
      <Seo
        title="Equipos y planteles | Fedepatin Hockey en Línea"
        description="Consulta los equipos y planteles por división y categoría del torneo de hockey en línea de Fedepatin."
        path="/teams"
        jsonLd={{ "@context": "https://schema.org", "@type": "CollectionPage", name: "Equipos y planteles | Fedepatin Hockey en Línea", description: "Consulta los equipos y planteles por división y categoría del torneo de hockey en línea de Fedepatin.", url: "https://hockeyenlineafedepatin.site/teams" }}
      />
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
      ) : divisionsWithTeams.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No hay equipos registrados aún en esta edición.
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeDivision || defaultTab} onValueChange={setActiveDivision}>
          <TabsList className="flex-wrap h-auto gap-1">
            {divisionsWithTeams.map((d: any) => (
              <TabsTrigger key={d.id} value={d.id} className="text-xs sm:text-sm">
                {d.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {divisionsWithTeams.map((div: any) => {
            const divCategories = categories.filter((c: any) => c.division_id === div.id);
            return (
              <TabsContent key={div.id} value={div.id} className="space-y-6">
                {divCategories.map((cat: any) => {
                  const catTeams = teams.filter((t: any) => t.category_id === cat.id);
                  if (catTeams.length === 0) return null;
                  const hasGroups = catTeams.some((t: any) => t.group_name);
                  const groups = hasGroups
                    ? Array.from(new Set(catTeams.map((t: any) => t.group_name).filter(Boolean))).sort()
                    : [];
                  return (
                    <div key={cat.id} className="space-y-3">
                      <h2 className="font-display font-bold uppercase text-sm text-muted-foreground">{cat.name}</h2>
                      {hasGroups ? (
                        <div className="grid lg:grid-cols-2 gap-6">
                          {groups.map((group: string) => (
                            <div key={group} className="space-y-3">
                              <h3 className="font-display font-bold uppercase text-sm">Grupo {group}</h3>
                              <div className="grid sm:grid-cols-2 gap-3">
                                {catTeams
                                  .filter((t: any) => t.group_name === group)
                                  .map((team: any) => (
                                    <TeamCard
                                      key={team.id}
                                      team={team}
                                      categoryName={cat.name}
                                    />
                                  ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {catTeams.map((team: any) => (
                            <TeamCard
                              key={team.id}
                              team={team}
                              categoryName={cat.name}
                            />
                          ))}
                        </div>
                      )}
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
  const groupName = team.group_name;
  const [expanded, setExpanded] = useState(false);

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
      let playersMap: Record<string, { first_name: string | null; last_name: string | null; jersey_number: number | null; velopro_number: string | null }> = {};
      if (playerIds.length > 0) {
        const { data: players } = await supabase
          .from("players_public")
          .select("id, first_name, last_name, jersey_number, velopro_number")
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

  const { data: staffRows = [] } = useQuery({
    queryKey: ["team-staff", team.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_staff" as any)
        .select("id, first_name, last_name, role")
        .eq("team_id", team.id);
      if (error) throw error;
      const order: Record<string, number> = { ENTRENADOR: 0, ASISTENTE: 1, DELEGADO: 2 };
      return [...((data as any[]) ?? [])].sort(
        (a, b) => (order[a.role] ?? 9) - (order[b.role] ?? 9)
      );
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
          const aJersey = a.jersey_number ?? 999;
          const bJersey = b.jersey_number ?? 999;
          return aJersey - bJersey;
        })
        .map((r: any, i: number) => {
          const player = playersMap[r.player_id];
          return {
            jersey: r.jersey_number ?? null,
            name: player ? `${player.last_name ?? ""}, ${player.first_name ?? ""}`.trim() || "Sin nombre" : "Sin nombre",
            position: r.position ?? getRandomPosition(i),
            document: player?.velopro_number ?? "",
          };
        });
    }
    return [];
  }, [rosterRows, playersMap, expanded, rostersLoading, categoryName, team.id]);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 cursor-pointer flex items-center justify-between gap-3" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-3">
          {(team.logo_url || team.clubs?.logo_url) ? (
            <img src={team.logo_url || team.clubs?.logo_url} alt={team.name} className="h-10 w-10 object-contain rounded" loading="lazy" />
          ) : (
            <div className="h-10 w-10 rounded border bg-muted flex items-center justify-center text-muted-foreground text-[10px] font-bold">
              {team.name?.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-display font-bold text-sm uppercase">{team.name}</p>
            {team.clubs?.name && <p className="text-xs text-muted-foreground">{team.clubs.name}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Badge variant="secondary" className="text-xs">
            {categoryName}
          </Badge>
          {groupName && (
            <Badge variant="outline" className="text-xs">
              Grupo {groupName}
            </Badge>
          )}
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
            <>
            {staffRows.length > 0 && (
              <div className="mb-4">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5">
                  Cuerpo Técnico
                </p>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left py-1.5 px-1 uppercase text-[10px]">Nombre Completo</th>
                      <th className="text-left py-1.5 px-1 uppercase text-[10px]">Rol</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffRows.map((st: any) => (
                      <tr key={st.id} className="border-b last:border-0">
                        <td className="py-1.5 px-1 font-medium">
                          {`${st.last_name ?? ""}, ${st.first_name ?? ""}`.trim()}
                        </td>
                        <td className="py-1.5 px-1 text-primary">
                          {st.role.charAt(0) + st.role.slice(1).toLowerCase()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {displayRoster.length > 0 ? (
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5">
                  Jugadores
                </p>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left py-1.5 px-1 uppercase text-[10px]">#</th>
                      <th className="text-left py-1.5 px-1 uppercase text-[10px]">Nombre Completo</th>
                      <th className="text-left py-1.5 px-1 uppercase text-[10px]">Posición</th>
                      <th className="text-left py-1.5 px-1 uppercase text-[10px]">VeloPro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayRoster.map((p, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-1.5 px-1 font-mono">{p.jersey ?? ""}</td>
                        <td className="py-1.5 px-1 font-medium">{p.name}</td>
                        <td className="py-1.5 px-1 text-muted-foreground">
                          {p.position === "ARQUERO" ? "Arquero" : "Jugador"}
                        </td>
                        <td className="py-1.5 px-1 text-muted-foreground">{p.document}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              !rostersLoading && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Nómina aún no publicada.
                </p>
              )
            )}
            </>
          )}
        </div>
      )}
    </Card>
  );
}
