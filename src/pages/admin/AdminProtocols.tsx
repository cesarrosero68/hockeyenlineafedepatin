import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardList, Clock, Timer, Flag, Users, Trophy, Copy, CheckCircle2, TriangleAlert, ListOrdered, CalendarDays, Gavel, Info } from "lucide-react";
import { toast } from "sonner";
import { useTournament } from "@/contexts/TournamentContext";
import { catStyle, CatChip, Empty } from "@/components/admin/AdminBits";
import { PROTOCOLOS, REGLAS_GENERALES, DESEMPATES, CALENDARIO, type Protocolo } from "@/data/protocolos";

const norm = (s: any) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
const PROTO_BY_NAME = new Map(Object.entries(PROTOCOLOS).map(([k, v]) => [norm(k), v]));

function Tile({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Icon className="h-5 w-5" /></span>
      <span className="leading-tight">
        <span className="block font-display text-xl font-bold">{value}</span>
        <span className="block text-[11px] text-muted-foreground">{label}</span>
      </span>
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <Card className="overflow-hidden rounded-2xl shadow-sm">
      <div className="flex items-center gap-2 border-b bg-primary/10 px-4 py-2.5 font-display text-base font-bold uppercase text-primary">
        <Icon className="h-4 w-4" /> {title}
      </div>
      <CardContent className="p-4">{children}</CardContent>
    </Card>
  );
}

function Bullets({ items, numbered }: { items: string[]; numbered?: boolean }) {
  return (
    <ul className="space-y-2.5 text-sm">
      {items.map((t, i) => (
        <li key={i} className="flex gap-2.5">
          {numbered ? (
            <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">{i + 1}</span>
          ) : (
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-secondary" />
          )}
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

function buildText(name: string, p: Protocolo) {
  return [
    `*${name} · Protocolo Copa*`,
    `Equipos: ${p.equipos} · Tiempo: ${p.tiempo} · Sanción: ${p.sancion} · Goleada técnica: ${p.goleada}`,
    "",
    "*Fase regular*",
    ...p.regular.map((t) => `• ${t}`),
    "",
    "*Fase final*",
    ...p.final.map((t, i) => `${i + 1}. ${t}`),
    "",
    "*Reglas generales*",
    ...REGLAS_GENERALES.map((t) => `• ${t}`),
  ].join("\n");
}

export default function AdminProtocols() {
  const { viewedTournamentId, viewedTournament } = useTournament();
  const tid = viewedTournamentId ?? undefined;
  const [selected, setSelected] = useState<string | null>(null);

  const { data: categories = [] } = useQuery({
    queryKey: ["adm-proto-cats", tid],
    enabled: !!tid,
    queryFn: async () => {
      const { data } = await (supabase.from("categories") as any).select("id, name, sort_order").eq("tournament_id", tid as string).order("sort_order");
      return (data ?? []) as { id: string; name: string; sort_order: number }[];
    },
  });
  const { data: teams = [] } = useQuery({
    queryKey: ["adm-proto-teams", tid],
    enabled: !!tid,
    queryFn: async () => {
      const { data } = await (supabase.from("teams") as any).select("id, name, category_id").eq("tournament_id", tid as string).order("name");
      return (data ?? []) as { id: string; name: string; category_id: string }[];
    },
  });
  const { data: matches = [] } = useQuery({
    queryKey: ["adm-proto-matches", tid],
    enabled: !!tid,
    queryFn: async () => {
      const { data } = await (supabase.from("matches") as any).select("category_id, status").eq("tournament_id", tid as string);
      return (data ?? []) as { category_id: string; status: string }[];
    },
  });

  const cat = categories.find((c) => c.id === selected) ?? categories[0] ?? null;
  const proto = cat ? PROTO_BY_NAME.get(norm(cat.name)) ?? null : null;

  const live = useMemo(() => {
    if (!cat) return null;
    const t = teams.filter((x) => x.category_id === cat.id);
    const m = matches.filter((x) => x.category_id === cat.id);
    const played = m.filter((x) => x.status === "closed" || x.status === "locked").length;
    return { teams: t, total: m.length, played };
  }, [cat, teams, matches]);

  const copy = async () => {
    if (!cat || !proto) return;
    try {
      await navigator.clipboard.writeText(buildText(cat.name, proto));
      toast.success("Protocolo copiado: pégalo en WhatsApp");
    } catch {
      toast.error("No se pudo copiar");
    }
  };

  const teamsOk = !!(proto && live && live.teams.length === proto.equipos);
  const matchesOk = !!(proto && live && live.total === proto.partidos);
  const pct = live && live.total ? Math.round((live.played / live.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold uppercase">
          <ClipboardList className="h-6 w-6 text-primary" /> Protocolos
        </h1>
        {viewedTournament && <Badge className="text-xs">Edición: {viewedTournament.name}</Badge>}
      </div>

      {/* Selector de categoría */}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {categories.map((c) => {
          const active = cat?.id === c.id;
          const s = catStyle(c.name);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelected(c.id)}
              aria-pressed={active}
              className={`shrink-0 rounded-xl border px-4 py-2 text-sm font-bold transition ${active ? "shadow-md ring-2" : "hover:shadow-sm"}`}
              style={active ? { backgroundColor: s.color, color: "#fff", borderColor: s.color, ["--tw-ring-color" as any]: s.backgroundColor } : { ...s, borderColor: "transparent" }}
            >
              {c.name}
            </button>
          );
        })}
      </div>

      {!cat && (
        <Card className="rounded-2xl"><Empty icon={ClipboardList} text="Esta edición no tiene categorías." /></Card>
      )}

      {cat && !proto && (
        <Card className="rounded-2xl">
          <CardContent className="flex gap-3 p-6 text-sm">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="font-bold"><CatChip name={cat.name} /> no tiene protocolo cargado.</p>
              <p className="mt-1 text-muted-foreground">Las reglas generales de abajo sí aplican. Para agregar el protocolo de esta categoría, hay que editar el archivo <code className="rounded bg-muted px-1">src/data/protocolos.ts</code>.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {cat && proto && live && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CatChip name={cat.name} className="text-base" />
              <span className="text-sm text-muted-foreground">{proto.partidos} partidos en total</span>
            </div>
            <Button variant="outline" size="sm" onClick={copy} className="gap-1.5 bg-card"><Copy className="h-4 w-4" /> Copiar para WhatsApp</Button>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Tile icon={Users} label="Equipos" value={String(proto.equipos)} />
            <Tile icon={Clock} label="Tiempo por periodo" value={proto.tiempo} />
            <Tile icon={Timer} label="Sanción" value={proto.sancion} />
            <Tile icon={Flag} label="Goleada técnica" value={proto.goleada} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Section icon={ListOrdered} title="Fase regular"><Bullets items={proto.regular} /></Section>
            <Section icon={Trophy} title="Fase final"><Bullets items={proto.final} numbered /></Section>
          </div>

          <Section icon={Users} title="Equipos y estado en la plataforma">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {live.teams.length === 0 ? (
                  <span className="text-sm text-muted-foreground">No hay equipos cargados.</span>
                ) : (
                  live.teams.map((t) => <span key={t.id} className="rounded-lg border bg-card px-2.5 py-1 text-xs font-semibold">{t.name}</span>)
                )}
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} /></div>
              <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
                <span><b>{live.played}</b> de {live.total} partidos jugados ({pct}%)</span>
                <span className={`flex items-center gap-1 ${teamsOk ? "text-emerald-700" : "font-semibold text-amber-700"}`}>
                  {teamsOk ? <CheckCircle2 className="h-4 w-4" /> : <TriangleAlert className="h-4 w-4" />}
                  Equipos: {live.teams.length} cargados / {proto.equipos} del protocolo
                </span>
                <span className={`flex items-center gap-1 ${matchesOk ? "text-emerald-700" : "font-semibold text-amber-700"}`}>
                  {matchesOk ? <CheckCircle2 className="h-4 w-4" /> : <TriangleAlert className="h-4 w-4" />}
                  Partidos: {live.total} cargados / {proto.partidos} del protocolo
                </span>
              </div>
            </div>
          </Section>
        </div>
      )}

      {/* Reglas para todas las categorías */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Section icon={Gavel} title="Reglas de juego"><Bullets items={REGLAS_GENERALES} /></Section>
        <Section icon={Gavel} title="Desempates"><Bullets items={DESEMPATES} /></Section>
        <Section icon={CalendarDays} title="Calendario">
          <ul className="space-y-3 text-sm">
            {CALENDARIO.map((c) => (
              <li key={c.titulo}>
                <b className="block text-primary">{c.titulo}</b>
                <span className="text-muted-foreground">{c.detalle}</span>
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </div>
  );
}
