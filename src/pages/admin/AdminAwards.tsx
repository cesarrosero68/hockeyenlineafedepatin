import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, Shield } from "lucide-react";
import { toast } from "sonner";
import { useTournament } from "@/contexts/TournamentContext";

export default function AdminAwards() {
  const { currentId } = useTournament();
  const qc = useQueryClient();
  const [saving, setSaving] = useState<string | null>(null);

  const { data: divisions = [] } = useQuery({
    queryKey: ["adm-awards-div", currentId],
    queryFn: async () => (await supabase.from("divisions").select("id, name")).data ?? [],
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["adm-awards-cat", currentId],
    queryFn: async () => (await supabase.from("categories").select("id, name, division_id").order("sort_order")).data ?? [],
  });
  const { data: rosters = [] } = useQuery({
    queryKey: ["adm-awards-rosters", currentId],
    queryFn: async () => {
      let q: any = supabase.from("rosters").select("player_id, jersey_number, team_id, teams(name, category_id)");
      if (currentId) q = q.eq("tournament_id", currentId);
      return (await q).data ?? [];
    },
  });
  const { data: players = [] } = useQuery({
    queryKey: ["adm-awards-players"],
    queryFn: async () => (await supabase.from("players_public").select("id, first_name, last_name")).data ?? [],
  });
  const { data: awards = [], refetch } = useQuery({
    queryKey: ["adm-awards", currentId],
    queryFn: async () => {
      let q: any = (supabase as any).from("category_awards").select("*");
      if (currentId) q = q.eq("tournament_id", currentId);
      return (await q).data ?? [];
    },
  });

  const playerMap = useMemo(() => new Map(players.map((p: any) => [p.id, p])), [players]);

  const setAward = async (category_id: string, award_type: "mvp" | "best_goalkeeper", player_id: string | null) => {
    setSaving(category_id + award_type);
    const existing: any = awards.find((a: any) => a.category_id === category_id && a.award_type === award_type);
    try {
      if (!player_id) {
        if (existing) await (supabase as any).from("category_awards").delete().eq("id", existing.id);
      } else if (existing) {
        await (supabase as any).from("category_awards").update({ player_id }).eq("id", existing.id);
      } else {
        await (supabase as any).from("category_awards").insert({ category_id, award_type, player_id, tournament_id: currentId });
      }
      toast.success("Premio guardado");
      await refetch();
      qc.invalidateQueries({ queryKey: ["podium-awards"] });
    } catch (e: any) { toast.error(e.message ?? "Error"); }
    finally { setSaving(null); }
  };

  const playersForCategory = (categoryId: string) => {
    return (rosters as any[])
      .filter(r => r.teams?.category_id === categoryId)
      .map(r => {
        const p: any = playerMap.get(r.player_id);
        if (!p) return null;
        return {
          id: r.player_id,
          label: `#${r.jersey_number ?? "?"} ${p.first_name} ${p.last_name} (${r.teams?.name ?? ""})`,
        };
      })
      .filter(Boolean) as { id: string; label: string }[];
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-display font-bold uppercase flex items-center gap-2">
        <Star className="h-6 w-6 text-secondary" /> Podio y Premios
      </h2>

      {divisions.map((div: any) => {
        const divCats = categories.filter((c: any) => c.division_id === div.id);
        if (!divCats.length) return null;
        return (
          <div key={div.id} className="space-y-3">
            <h3 className="text-lg font-display uppercase">{div.name}</h3>
            <div className="grid gap-3 md:grid-cols-2">
              {divCats.map((cat: any) => {
                const opts = playersForCategory(cat.id);
                const mvp: any = awards.find((a: any) => a.category_id === cat.id && a.award_type === "mvp");
                const gk: any = awards.find((a: any) => a.category_id === cat.id && a.award_type === "best_goalkeeper");
                return (
                  <Card key={cat.id}>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">{cat.name}</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label className="text-xs flex items-center gap-1"><Star className="h-3 w-3" /> MVP</Label>
                        <Select value={mvp?.player_id ?? "__none__"} onValueChange={(v) => setAward(cat.id, "mvp", v === "__none__" ? null : v)} disabled={saving === cat.id + "mvp"}>
                          <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">— Sin asignar —</SelectItem>
                            {opts.map(o => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs flex items-center gap-1"><Shield className="h-3 w-3" /> Valla Menos Vencida</Label>
                        <Select value={gk?.player_id ?? "__none__"} onValueChange={(v) => setAward(cat.id, "best_goalkeeper", v === "__none__" ? null : v)} disabled={saving === cat.id + "best_goalkeeper"}>
                          <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">— Sin asignar —</SelectItem>
                            {opts.map(o => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}