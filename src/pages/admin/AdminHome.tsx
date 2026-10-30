import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, Calendar, Shield, AlertTriangle, ArrowRight, Star, Upload, Download, Handshake, LayoutDashboard, Lock } from "lucide-react";
import { useTournament } from "@/contexts/TournamentContext";

const SHORTCUTS = [
  { to: "/admin/matches", icon: Calendar, label: "Partidos", hint: "Resultados y horarios" },
  { to: "/admin/awards", icon: Star, label: "Podio y Premios", hint: "MVP y valla menos vencida" },
  { to: "/admin/upload", icon: Upload, label: "Cargue CSV", hint: "Programación y jugadores" },
  { to: "/admin/export", icon: Download, label: "Exportar", hint: "Excel del torneo" },
  { to: "/admin/sponsors", icon: Handshake, label: "Patrocinadores", hint: "Barra y estadísticas" },
];

export default function AdminHome() {
  const { viewedTournament, viewedTournamentId, isReadOnly } = useTournament();
  const t = viewedTournament as { id: string; name: string } | null;
  const tid = viewedTournamentId ?? undefined;

  const { data, isError } = useQuery({
    queryKey: ["admin-counts", tid],
    enabled: !!tid,
    queryFn: async () => {
      const c = (table: string) => (supabase.from(table as any) as any).select("id", { count: "exact", head: true }).eq("tournament_id", tid as string);
      const [d, tm, m, p, closed, live] = await Promise.all([
        c("divisions"), c("teams"), c("matches"), c("rosters"),
        c("matches").in("status", ["closed", "locked"]),
        c("matches").eq("status", "in_progress"),
      ]);
      const firstError = d.error ?? tm.error ?? m.error ?? p.error ?? closed.error ?? live.error;
      if (firstError) throw firstError;
      return {
        divisions: d.count ?? 0, teams: tm.count ?? 0, matches: m.count ?? 0, players: p.count ?? 0,
        closed: closed.count ?? 0, live: live.count ?? 0,
      };
    },
    staleTime: 60_000,
  });

  if (isError) {
    return (
      <Card className="rounded-2xl">
        <CardContent className="py-8 text-center text-muted-foreground">
          <AlertTriangle className="mx-auto mb-2 h-6 w-6 text-destructive" />
          No se pudieron cargar los indicadores del panel.
        </CardContent>
      </Card>
    );
  }

  const d = data ?? { divisions: 0, teams: 0, matches: 0, players: 0, closed: 0, live: 0 };
  const pct = d.matches ? Math.round((d.closed / d.matches) * 100) : 0;
  const stats = [
    { label: "Divisiones", value: d.divisions, icon: Trophy, to: "/admin/divisions" },
    { label: "Equipos", value: d.teams, icon: Users, to: "/admin/teams" },
    { label: "Partidos", value: d.matches, icon: Calendar, to: "/admin/matches" },
    { label: "Jugadores", value: d.players, icon: Shield, to: "/admin/players" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold uppercase">
          <LayoutDashboard className="h-6 w-6 text-primary" /> Resumen del torneo
        </h1>
        <div className="flex items-center gap-2">
          {t && <Badge className="text-xs">{t.name}</Badge>}
          {isReadOnly && <Badge variant="secondary" className="gap-1 text-xs"><Lock className="h-3 w-3" /> Edición cerrada</Badge>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} to={s.to} className="group">
            <Card className="rounded-2xl shadow-sm transition group-hover:border-primary/50 group-hover:shadow-md">
              <CardContent className="flex items-center gap-3 p-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <s.icon className="h-6 w-6" />
                </span>
                <span className="leading-tight">
                  <span className="block font-display text-3xl font-bold">{s.value}</span>
                  <span className="block text-xs text-muted-foreground">{s.label}</span>
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="overflow-hidden rounded-2xl shadow-sm">
        <div className="flex items-center justify-between border-b bg-primary/10 px-4 py-2.5 font-display text-base font-bold uppercase text-primary">
          <span className="flex items-center gap-2"><Calendar className="h-4 w-4" /> Avance del torneo</span>
          <span>{pct}%</span>
        </div>
        <CardContent className="space-y-3 p-4">
          <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <span><b>{d.closed}</b> de {d.matches} partidos finalizados</span>
            <span><b>{Math.max(d.matches - d.closed - d.live, 0)}</b> por jugar</span>
            {d.live > 0 && <span className="font-semibold text-destructive">● {d.live} en vivo</span>}
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 font-display text-lg font-bold uppercase text-primary">Accesos rápidos</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SHORTCUTS.map((s) => (
            <Link key={s.to} to={s.to} className="group flex items-center gap-3 rounded-xl border bg-card p-3 transition hover:border-primary/50 hover:shadow-sm">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-secondary/30 text-primary"><s.icon className="h-5 w-5" /></span>
              <span className="flex-1 leading-tight">
                <span className="block text-sm font-bold">{s.label}</span>
                <span className="block text-xs text-muted-foreground">{s.hint}</span>
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
