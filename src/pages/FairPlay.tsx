import Seo from "@/components/Seo";
import PageHero from "@/components/PageHero";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield } from "lucide-react";
import { useTournament } from "@/contexts/TournamentContext";
import TeamShield from "@/components/home/TeamShield";

const MEDAL = ["bg-yellow-500", "bg-slate-400", "bg-amber-700"];
function Pos({ n }: { n: number }) {
  return n <= 3 ? (
    <span className={`inline-grid h-6 w-6 place-items-center rounded-full text-xs font-bold text-white ${MEDAL[n - 1]}`}>{n}</span>
  ) : (
    <span className="inline-grid h-6 w-6 place-items-center text-xs text-muted-foreground">{n}</span>
  );
}

/** Convierte minutos decimales (1.5) a "m:ss" (1:30). */
function mmss(mins: number): string {
  const total = Math.round(mins * 60);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export default function FairPlay() {
  const { viewedTournamentId } = useTournament();
  const { data: divisions = [] } = useQuery({
    queryKey: ["divisions", viewedTournamentId],
    queryFn: async () => {
      let q: any = supabase.from("divisions").select("id, name");
      if (viewedTournamentId) q = q.eq("tournament_id", viewedTournamentId);
      const { data } = await q;
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories", viewedTournamentId],
    queryFn: async () => {
      let q: any = supabase.from("categories").select("id, name, division_id").order("sort_order");
      if (viewedTournamentId) q = q.eq("tournament_id", viewedTournamentId);
      const { data } = await q;
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });

  const { data: fairPlay = [], isLoading } = useQuery({
    queryKey: ["fair-play", viewedTournamentId],
    queryFn: async () => {
      let q: any = supabase
        .from("fair_play_aggregate")
        .select("*, teams!inner(name, logo_url, clubs(logo_url))")
        .order("total_penalty_minutes", { ascending: true });
      if (viewedTournamentId) q = q.eq("tournament_id", viewedTournamentId);
      const { data } = await q;
      return data ?? [];
    },
  });

  // La tabla resumen guarda los minutos redondeados (1:30 queda en 2).
  // Por eso se suman aquí los minutos reales de cada sanción, por equipo.
  const { data: exactMinutes = {} } = useQuery({
    queryKey: ["fair-play-exact", viewedTournamentId],
    queryFn: async () => {
      const totals: Record<string, number> = {};
      const PAGE = 1000;
      for (let from = 0; ; from += PAGE) {
        let q: any = supabase.from("penalties").select("team_id, penalty_minutes").range(from, from + PAGE - 1);
        if (viewedTournamentId) q = q.eq("tournament_id", viewedTournamentId);
        const { data } = await q;
        (data ?? []).forEach((r: any) => {
          totals[r.team_id] = (totals[r.team_id] ?? 0) + Number(r.penalty_minutes ?? 0);
        });
        if (!data || data.length < PAGE) break;
      }
      return totals;
    },
  });
  const minsOf = (f: any): number => exactMinutes[f.team_id] ?? Number(f.total_penalty_minutes ?? 0);

  if (isLoading) {
    return (
      <div className="container py-8 flex justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const defaultTab = divisions[0]?.id ?? "";

  return (
    <div className="pb-10">
      <Seo
        title="Ranking Fair Play | Fedepatin"
        description="Clasificación de juego limpio por equipo según las sanciones registradas en el torneo."
        path="/fair-play"
      />
      <PageHero icon={Shield} title="Fair Play" subtitle="Disciplina y juego limpio" />
      <div className="container py-6 space-y-6">

      {fairPlay.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>El ranking Fair Play se calcula por menos minutos de penalización.</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue={defaultTab}>
          <TabsList className="flex-wrap h-auto gap-1">
            {divisions.map((d: any) => (
              <TabsTrigger key={d.id} value={d.id} className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow">{d.name}</TabsTrigger>
            ))}
          </TabsList>

          {divisions.map((div: any) => {
            const divCategories = categories.filter((c: any) => c.division_id === div.id);
            return (
              <TabsContent key={div.id} value={div.id} className="space-y-6">
                {divCategories.map((cat: any) => {
                  const catFP = fairPlay
                    .filter((f: any) => f.category_id === cat.id)
                    .sort((x: any, y: any) => minsOf(x) - minsOf(y) || x.total_penalties - y.total_penalties);
                  if (catFP.length === 0) return null;
                  return (
                    <Card key={cat.id} className="rounded-2xl shadow-sm overflow-hidden">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base font-display uppercase">{cat.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="overflow-x-auto">
                        <table className="w-full text-sm sm:text-base">
                          <thead>
                            <tr className="border-b text-muted-foreground text-xs">
                              <th className="text-left py-2 px-1">#</th>
                              <th className="text-left py-2 px-1">Equipo</th>
                              <th className="text-center py-2 px-1">Penalidades</th>
                              <th className="text-center py-2 px-1">Tiempo penalización (min:seg)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {catFP.map((f: any, i: number) => (
                              <tr key={f.id} className="border-b last:border-0">
                                <td className="py-2.5 px-1"><Pos n={i + 1} /></td>
                                <td className="py-2.5 px-1 font-semibold"><span className="flex items-center gap-2"><TeamShield name={f.teams?.name} logo={f.teams?.logo_url ?? f.teams?.clubs?.logo_url} />{f.teams?.name}</span></td>
                                <td className="text-center py-2 px-1">{f.total_penalties}</td>
                                <td className="text-center py-2 px-1 tabular-nums">{mmss(minsOf(f))}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
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
    </div>
  );
}
