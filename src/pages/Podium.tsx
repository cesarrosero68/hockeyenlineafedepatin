import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Medal, Award, Star, Shield } from "lucide-react";
import { useTournament } from "@/contexts/TournamentContext";

export default function Podium() {
  const { currentId } = useTournament();

  const { data: divisions = [] } = useQuery({
    queryKey: ["podium-divisions", currentId],
    queryFn: async () => (await supabase.from("divisions").select("id, name")).data ?? [],
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["podium-categories", currentId],
    queryFn: async () => (await supabase.from("categories").select("id, name, division_id").order("sort_order")).data ?? [],
  });

  const { data: matches = [] } = useQuery({
    queryKey: ["podium-matches", currentId],
    queryFn: async () => {
      let q = supabase
        .from("matches")
        .select("id, phase, category_id, status, tournament_id, match_teams(team_id, is_winner, teams(name))")
        .in("phase", ["final", "third_place"] as any)
        .in("status", ["closed", "locked"] as any);
      if (currentId) q = q.eq("tournament_id" as any, currentId);
      const { data } = await q;
      return data ?? [];
    },
  });

  const { data: standings = [] } = useQuery({
    queryKey: ["podium-standings", currentId],
    queryFn: async () => {
      let q = supabase.from("standings_aggregate").select("category_id, team_id, rank, tournament_id, teams(name)").order("rank");
      if (currentId) q = q.eq("tournament_id" as any, currentId);
      const { data } = await q;
      return data ?? [];
    },
  });

  const { data: awards = [] } = useQuery({
    queryKey: ["podium-awards", currentId],
    queryFn: async () => {
      let q = supabase.from("category_awards" as any).select("*");
      if (currentId) q = q.eq("tournament_id", currentId);
      const { data } = await q;
      return (data ?? []) as any[];
    },
  });

  const { data: players = [] } = useQuery({
    queryKey: ["podium-players"],
    queryFn: async () => (await supabase.from("players_public").select("id, first_name, last_name")).data ?? [],
  });

  const playerName = (id: string | null) => {
    if (!id) return "";
    const p: any = players.find((pl: any) => pl.id === id);
    return p ? `${p.first_name} ${p.last_name}` : "";
  };

  const getPodium = (categoryId: string): { first?: string; second?: string; third?: string } => {
    // Try from final match first
    const finalMatch: any = matches.find((m: any) => m.category_id === categoryId && m.phase === "final");
    const thirdMatch: any = matches.find((m: any) => m.category_id === categoryId && m.phase === "third_place");
    let first: string | undefined, second: string | undefined, third: string | undefined;
    if (finalMatch) {
      const winner = finalMatch.match_teams?.find((mt: any) => mt.is_winner);
      const loser = finalMatch.match_teams?.find((mt: any) => !mt.is_winner);
      first = winner?.teams?.name;
      second = loser?.teams?.name;
    }
    if (thirdMatch) {
      const winner = thirdMatch.match_teams?.find((mt: any) => mt.is_winner);
      third = winner?.teams?.name;
    }
    // Fallback to standings
    if (!first || !second || !third) {
      const cs = standings.filter((s: any) => s.category_id === categoryId).sort((a: any, b: any) => (a.rank ?? 99) - (b.rank ?? 99));
      first = first ?? (cs[0] as any)?.teams?.name;
      second = second ?? (cs[1] as any)?.teams?.name;
      third = third ?? (cs[2] as any)?.teams?.name;
    }
    return { first, second, third };
  };

  const defaultTab = divisions[0]?.id ?? "";

  return (
    <div className="container py-8 space-y-6">
      <h1 className="text-3xl font-display font-bold uppercase flex items-center gap-2">
        <Trophy className="h-7 w-7 text-secondary" />
        Podio del Torneo
      </h1>

      {divisions.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Sin datos aún.</CardContent></Card>
      ) : (
        <Tabs defaultValue={defaultTab}>
          <TabsList className="flex-wrap h-auto gap-1">
            {divisions.map((d: any) => <TabsTrigger key={d.id} value={d.id} className="text-xs sm:text-sm">{d.name}</TabsTrigger>)}
          </TabsList>

          {divisions.map((div: any) => {
            const divCats = categories.filter((c: any) => c.division_id === div.id);
            return (
              <TabsContent key={div.id} value={div.id} className="space-y-6">
                {divCats.map((cat: any) => {
                  const { first, second, third } = getPodium(cat.id);
                  const mvp = awards.find((a: any) => a.category_id === cat.id && a.award_type === "mvp");
                  const gk = awards.find((a: any) => a.category_id === cat.id && a.award_type === "best_goalkeeper");
                  return (
                    <Card key={cat.id}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-display uppercase">{cat.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-3 gap-3">
                          <PodiumSpot rank={2} icon={Medal} team={second} color="text-slate-400" />
                          <PodiumSpot rank={1} icon={Trophy} team={first} color="text-yellow-500" featured />
                          <PodiumSpot rank={3} icon={Award} team={third} color="text-amber-700" />
                        </div>
                        {(mvp || gk) && (
                          <div className="grid gap-2 sm:grid-cols-2 pt-2 border-t">
                            {mvp && (
                              <div className="flex items-center gap-2 text-sm">
                                <Star className="h-4 w-4 text-secondary" />
                                <span className="font-medium">MVP:</span>
                                <span>{playerName(mvp.player_id) || mvp.notes || "—"}</span>
                              </div>
                            )}
                            {gk && (
                              <div className="flex items-center gap-2 text-sm">
                                <Shield className="h-4 w-4 text-accent" />
                                <span className="font-medium">Mejor Arquero:</span>
                                <span>{playerName(gk.player_id) || gk.notes || "—"}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
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

function PodiumSpot({ rank, icon: Icon, team, color, featured }: any) {
  return (
    <div className={`flex flex-col items-center gap-2 rounded-lg p-3 border ${featured ? "bg-secondary/10 border-secondary" : "bg-muted/30"}`}>
      <Icon className={`h-8 w-8 ${color}`} />
      <div className="text-xs text-muted-foreground">{rank}° lugar</div>
      <div className="font-semibold text-center text-sm">{team ?? "Por definir"}</div>
    </div>
  );
}
