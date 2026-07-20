import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Medal, Award, Crown } from "lucide-react";
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
      let q: any = (supabase.from("matches") as any)
        .select("id, phase, category_id, status, tournament_id, match_teams(team_id, is_winner, teams(name))")
        .in("phase", ["final", "third_place"])
        .in("status", ["closed", "locked"]);
      if (currentId) q = q.eq("tournament_id", currentId);
      const { data } = await q;
      return data ?? [];
    },
  });

const { data: standings = [] } = useQuery({
    queryKey: ["podium-standings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("standings_aggregate" as any)
        .select("category_id, team_id, rank, teams(name)")
        .order("rank");
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

  const { data: rosters = [] } = useQuery({
    queryKey: ["podium-rosters", currentId],
    queryFn: async () => {
      let q: any = supabase.from("rosters").select("player_id, jersey_number, teams(name, category_id)");
      if (currentId) q = q.eq("tournament_id", currentId);
      return (await q).data ?? [];
    },
  });

  const playerInfo = (id: string | null, categoryId: string) => {
    if (!id) return null;
    const p: any = players.find((pl: any) => pl.id === id);
    if (!p) return null;
    const r: any = (rosters as any[]).find(x => x.player_id === id && x.teams?.category_id === categoryId);
    return {
      name: `${p.first_name} ${p.last_name}`,
      jersey: r?.jersey_number,
      team: r?.teams?.name,
    };
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
                  const mvpInfo = mvp ? playerInfo((mvp as any).player_id, cat.id) : null;
                  const gkInfo = gk ? playerInfo((gk as any).player_id, cat.id) : null;
                  return (
                    <Card key={cat.id}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-display uppercase">{cat.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end pt-6">
                          <PodiumSpot rank={2} team={second} />
                          <PodiumSpot rank={1} team={first} />
                          <PodiumSpot rank={3} team={third} />
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2 pt-3 border-t">
                          <AwardLine emoji="🏅" label="MVP" info={mvpInfo} fallback={(mvp as any)?.notes} />
                          <AwardLine emoji="🧤" label="Valla Menos Vencida" info={gkInfo} fallback={(gk as any)?.notes} />
                        </div>
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

function PodiumSpot({ rank, team }: { rank: 1 | 2 | 3; team?: string }) {
  const config = {
    1: { color: "#FFD700", height: "h-32 sm:h-40", icon: Crown, iconClass: "h-10 w-10", label: "1°", scale: "scale-110", ring: "ring-2 ring-yellow-400" },
    2: { color: "#C0C0C0", height: "h-24 sm:h-28", icon: Medal, iconClass: "h-8 w-8", label: "2°", scale: "", ring: "" },
    3: { color: "#CD7F32", height: "h-20 sm:h-24", icon: Award, iconClass: "h-7 w-7", label: "3°", scale: "", ring: "" },
  }[rank];
  const Icon = config.icon;
  return (
    <div className={`flex flex-col items-center gap-2 ${config.scale}`}>
      <Icon className={config.iconClass} style={{ color: config.color }} />
      <div className="text-xs font-semibold text-center min-h-[2.5rem] flex items-center">
        {team ?? <span className="text-muted-foreground italic">Por definir</span>}
      </div>
      <div
        className={`w-full ${config.height} rounded-t-lg flex items-start justify-center pt-2 font-display font-bold text-2xl ${config.ring}`}
        style={{ background: `linear-gradient(180deg, ${config.color}, ${config.color}99)`, color: rank === 1 ? "#5b3a00" : "#1a1a1a" }}
      >
        {config.label}
      </div>
    </div>
  );
}

function AwardLine({ emoji, label, info, fallback }: { emoji: string; label: string; info: { name: string; jersey?: number; team?: string } | null; fallback?: string }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="text-lg leading-none">{emoji}</span>
      <div>
        <span className="font-medium">{label}:</span>{" "}
        {info ? (
          <span>
            {info.name}
            {info.jersey != null && <span className="text-muted-foreground"> #{info.jersey}</span>}
            {info.team && <span className="text-muted-foreground"> — {info.team}</span>}
          </span>
        ) : (
          <span className="text-muted-foreground italic">{fallback || "Por definir"}</span>
        )}
      </div>
    </div>
  );
}
