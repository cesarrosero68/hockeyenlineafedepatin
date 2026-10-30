import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Star, Shield, Trophy, ChevronsUpDown, Check, Wand2, UserPen, TriangleAlert, Loader2, Info, Crown } from "lucide-react";
import { toast } from "sonner";
import { useTournament } from "@/contexts/TournamentContext";
import { CatChip, StatChip } from "@/components/admin/AdminBits";

type AwardType = "mvp" | "best_goalkeeper";
type Option = { id: string; label: string; gk: boolean };

const norm = (s: any) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

function PlayerPicker({ options, onSelect, disabled, placeholder }: { options: Option[]; onSelect: (id: string) => void; disabled?: boolean; placeholder: string }) {
  const [open, setOpen] = useState(false);
  const gks = options.filter((o) => o.gk);
  const others = options.filter((o) => !o.gk);
  const item = (o: Option) => (
    <CommandItem key={o.id} value={o.label} onSelect={() => { onSelect(o.id); setOpen(false); }}>
      <Check className="mr-2 h-4 w-4 opacity-0" />
      {o.label}
    </CommandItem>
  );
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} disabled={disabled} className="w-full justify-between bg-card font-normal">
          <span className="truncate">{placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[340px] max-w-[90vw] p-0" align="start">
        <Command filter={(value, search) => (norm(value).includes(norm(search)) ? 1 : 0)}>
          <CommandInput placeholder="Buscar jugador o equipo…" />
          <CommandList>
            <CommandEmpty>Sin resultados.</CommandEmpty>
            {gks.length > 0 && <CommandGroup heading="Arqueros">{gks.map(item)}</CommandGroup>}
            <CommandGroup heading={gks.length > 0 ? "Demás jugadores" : "Jugadores"}>{others.map(item)}</CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function AdminAwards() {
  const { currentId, current } = useTournament();
  const qc = useQueryClient();
  const [saving, setSaving] = useState<string | null>(null);

  const { data: divisions = [] } = useQuery({
    queryKey: ["adm-awards-div", currentId],
    queryFn: async () => {
      let q: any = supabase.from("divisions").select("id, name");
      if (currentId) q = q.eq("tournament_id", currentId);
      return (await q).data ?? [];
    },
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["adm-awards-cat", currentId],
    queryFn: async () => {
      let q: any = supabase.from("categories").select("id, name, division_id").order("sort_order");
      if (currentId) q = q.eq("tournament_id", currentId);
      return (await q).data ?? [];
    },
  });
  const { data: rosters = [] } = useQuery({
    queryKey: ["adm-awards-rosters", currentId],
    queryFn: async () => {
      let q: any = supabase.from("rosters").select("player_id, jersey_number, position, team_id, teams(name, category_id)");
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
  // Lo mismo que lee la página pública, para mostrar qué se ve hoy
  const { data: matches = [] } = useQuery({
    queryKey: ["adm-awards-matches", currentId],
    queryFn: async () => {
      let q: any = (supabase.from("matches") as any)
        .select("id, phase, category_id, status, match_teams(team_id, is_winner, teams(name))")
        .in("phase", ["final", "third_place"])
        .in("status", ["closed", "locked"]);
      if (currentId) q = q.eq("tournament_id", currentId);
      return (await q).data ?? [];
    },
  });
  const { data: standings = [] } = useQuery({
    queryKey: ["adm-awards-standings", currentId],
    queryFn: async () => {
      let q: any = (supabase.from("standings_aggregate" as any) as any).select("category_id, rank, teams(name)").order("rank");
      if (currentId) q = q.eq("tournament_id", currentId);
      return (await q).data ?? [];
    },
  });
  const { data: autoMvps = [] } = useQuery({
    queryKey: ["adm-awards-auto-mvp", currentId],
    queryFn: async () => {
      let q: any = (supabase.from("mvp_by_category" as any) as any)
        .select("category_id, player_name, jersey_number, team_name, goals, assists").eq("rank_in_category", 1);
      if (currentId) q = q.eq("tournament_id", currentId);
      return (await q).data ?? [];
    },
  });
  const { data: autoDefense = [] } = useQuery({
    queryKey: ["adm-awards-auto-def", currentId],
    queryFn: async () => {
      let q: any = (supabase.from("best_defense_by_category" as any) as any)
        .select("category_id, team_name, goals_against, played").eq("rank_in_category", 1);
      if (currentId) q = q.eq("tournament_id", currentId);
      return (await q).data ?? [];
    },
  });

  const playerMap = useMemo(() => new Map((players as any[]).map((p) => [p.id, p])), [players]);
  const fullName = (id: string | null | undefined) => {
    const p: any = id ? playerMap.get(id) : null;
    return p ? `${p.first_name} ${p.last_name}`.trim() : "";
  };

  const optionsFor = (categoryId: string): Option[] =>
    (rosters as any[])
      .filter((r) => r.teams?.category_id === categoryId)
      .map((r) => {
        const name = fullName(r.player_id);
        if (!name) return null;
        return {
          id: r.player_id,
          label: `#${r.jersey_number ?? "?"} ${name} (${r.teams?.name ?? ""})`,
          gk: String(r.position ?? "").toUpperCase() === "ARQUERO",
        };
      })
      .filter(Boolean) as Option[];

  const getPodium = (categoryId: string) => {
    const fin: any = (matches as any[]).find((m) => m.category_id === categoryId && m.phase === "final");
    const third: any = (matches as any[]).find((m) => m.category_id === categoryId && m.phase === "third_place");
    let first: string | undefined, second: string | undefined, bronze: string | undefined;
    if (fin) {
      first = fin.match_teams?.find((mt: any) => mt.is_winner)?.teams?.name;
      second = fin.match_teams?.find((mt: any) => !mt.is_winner)?.teams?.name;
    }
    if (third) bronze = third.match_teams?.find((mt: any) => mt.is_winner)?.teams?.name;
    const definitive = !!(first && second && bronze);
    if (!definitive) {
      const cs = (standings as any[]).filter((s) => s.category_id === categoryId).sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
      first = first ?? cs[0]?.teams?.name;
      second = second ?? cs[1]?.teams?.name;
      bronze = bronze ?? cs[2]?.teams?.name;
    }
    return { first, second, third: bronze, definitive };
  };

  const rowFor = (categoryId: string, type: AwardType): any =>
    (awards as any[]).find((a) => a.category_id === categoryId && a.award_type === type);

  // Guarda el jugador Y su nombre en "notes": la página pública muestra ese texto.
  const setAward = async (category_id: string, award_type: AwardType, player_id: string | null) => {
    const key = category_id + award_type;
    setSaving(key);
    const existing = rowFor(category_id, award_type);
    try {
      let error: any = null;
      if (!player_id) {
        if (existing) ({ error } = await (supabase as any).from("category_awards").delete().eq("id", existing.id));
      } else {
        const payload = { player_id, notes: fullName(player_id) };
        if (existing) ({ error } = await (supabase as any).from("category_awards").update(payload).eq("id", existing.id));
        else ({ error } = await (supabase as any).from("category_awards").insert({ category_id, award_type, tournament_id: currentId, ...payload }));
      }
      if (error) throw error;
      toast.success(player_id ? "Premio guardado y publicado" : "Vuelve a ser automático");
      await refetch();
      qc.invalidateQueries({ queryKey: ["podium-awards"] });
    } catch (e: any) {
      toast.error(e.message ?? "Error");
    } finally {
      setSaving(null);
    }
  };

  const totalCats = (categories as any[]).length;
  const definitiveCount = (categories as any[]).filter((c) => getPodium(c.id).definitive).length;
  const manualCount = (awards as any[]).length;
  const unpublished = (awards as any[]).filter((a) => a.player_id && !a.notes).length;

  const AwardBlock = ({ cat, type }: { cat: any; type: AwardType }) => {
    const isMvp = type === "mvp";
    const row = rowFor(cat.id, type);
    const manualName = row ? row.notes || fullName(row.player_id) : "";
    const busy = saving === cat.id + type;
    const auto = isMvp
      ? (autoMvps as any[]).find((m) => m.category_id === cat.id)
      : (autoDefense as any[]).find((d) => d.category_id === cat.id);
    const autoText = auto
      ? isMvp
        ? `${auto.player_name}${auto.jersey_number != null ? ` #${auto.jersey_number}` : ""} — ${auto.team_name} (${auto.goals}G + ${auto.assists}A)`
        : `${auto.team_name} (${auto.goals_against} goles en contra en ${auto.played} PJ)`
      : null;
    const Icon = isMvp ? Star : Shield;
    return (
      <div className="rounded-xl border p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-sm font-bold"><Icon className="h-4 w-4 text-primary" /> {isMvp ? "MVP" : "Valla menos vencida"}</span>
          {row ? (
            <Badge className="gap-1 bg-primary/10 text-primary hover:bg-primary/10"><UserPen className="h-3 w-3" /> Manual</Badge>
          ) : (
            <Badge variant="secondary" className="gap-1"><Wand2 className="h-3 w-3" /> Automático</Badge>
          )}
        </div>

        <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
          <span className="text-xs text-muted-foreground">El público ve: </span>
          {row ? (
            row.notes ? <span className="font-semibold">{manualName}</span> : <span className="font-semibold text-amber-700">{auto ? "la sugerencia automática" : "Por definir"}</span>
          ) : autoText ? (
            <span className="font-semibold">{autoText}</span>
          ) : (
            <span className="italic text-muted-foreground">Por definir (aún no hay datos)</span>
          )}
        </div>

        {row && !row.notes && (
          <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <TriangleAlert className="h-4 w-4 shrink-0" />
            <span>Elegiste a <b>{fullName(row.player_id) || "un jugador"}</b> antes, pero no se estaba mostrando al público.</span>
            <Button size="sm" className="h-7" disabled={busy} onClick={() => setAward(cat.id, type, row.player_id)}>Publicar ahora</Button>
          </div>
        )}

        {row && row.notes && autoText && (
          <p className="mt-2 text-xs text-muted-foreground">Sugerencia automática: {autoText}</p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="min-w-[200px] flex-1">
            <PlayerPicker
              options={optionsFor(cat.id)}
              disabled={busy}
              placeholder={row ? "Cambiar jugador…" : "Elegir a mano…"}
              onSelect={(id) => setAward(cat.id, type, id)}
            />
          </div>
          {row && (
            <Button variant="outline" size="sm" disabled={busy} onClick={() => setAward(cat.id, type, null)} className="gap-1">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} Volver a automático
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold uppercase">
          <Star className="h-6 w-6 text-secondary" /> Podio y Premios
        </h1>
        {current && <Badge className="text-xs">Edición: {current.name}</Badge>}
      </div>

      <div className="flex flex-wrap gap-3">
        <StatChip icon={Trophy} label="Categorías" value={totalCats} />
        <StatChip icon={Crown} label="Podios definitivos" value={`${definitiveCount} de ${totalCats}`} />
        <StatChip icon={UserPen} label="Premios elegidos a mano" value={manualCount} />
        {unpublished > 0 && <StatChip icon={TriangleAlert} label="Sin publicar al público" value={unpublished} warn />}
      </div>

      <Card className="rounded-2xl border-primary/30 bg-primary/5">
        <CardContent className="flex gap-3 p-4 text-sm">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="space-y-1">
            <p><b>Podio:</b> se define solo con la final y el partido por el tercer puesto. Mientras no se jueguen, el público ve un podio <b>provisional</b> según la tabla de posiciones.</p>
            <p><b>MVP:</b> automático = el jugador con más goles + asistencias. <b>Valla menos vencida:</b> automático = el equipo con menos goles en contra.</p>
            <p>Si quieres otro nombre, elígelo a mano; con "Volver a automático" se quita y manda de nuevo el cálculo.</p>
          </div>
        </CardContent>
      </Card>

      {(divisions as any[]).map((div) => {
        const divCats = (categories as any[]).filter((c) => c.division_id === div.id);
        if (!divCats.length) return null;
        return (
          <div key={div.id} className="space-y-3">
            <h2 className="font-display text-xl font-bold uppercase text-primary">{div.name}</h2>
            <div className="grid gap-4 xl:grid-cols-2">
              {divCats.map((cat) => {
                const pod = getPodium(cat.id);
                return (
                  <Card key={cat.id} className="overflow-hidden rounded-2xl shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-primary/10 px-4 py-2.5">
                      <CatChip name={cat.name} className="text-sm" />
                      <Badge variant={pod.definitive ? "default" : "secondary"} className="text-[11px]">
                        {pod.definitive ? "Podio definitivo" : "Podio provisional"}
                      </Badge>
                    </div>
                    <CardContent className="space-y-3 p-4">
                      <div className="grid grid-cols-3 gap-2 text-center text-sm">
                        {[
                          ["🥇", pod.first],
                          ["🥈", pod.second],
                          ["🥉", pod.third],
                        ].map(([m, n], i) => (
                          <div key={i} className="rounded-lg border bg-card px-2 py-2">
                            <div className="text-xl leading-none">{m}</div>
                            <div className="mt-1 truncate font-semibold">{n ?? <span className="text-xs italic text-muted-foreground">Por definir</span>}</div>
                          </div>
                        ))}
                      </div>
                      <AwardBlock cat={cat} type="mvp" />
                      <AwardBlock cat={cat} type="best_goalkeeper" />
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
