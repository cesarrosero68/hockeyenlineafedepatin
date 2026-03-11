import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Users, Calendar, Shield, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminHome() {
  const {
    data: counts = { divisions: 0, teams: 0, matches: 0, players: 0 },
    isError,
  } = useQuery({
    queryKey: ["admin-counts"],
    queryFn: async () => {
      const [d, t, m, p] = await Promise.all([
        supabase.from("divisions").select("id", { count: "exact", head: true }),
        supabase.from("teams").select("id", { count: "exact", head: true }),
        supabase.from("matches").select("id", { count: "exact", head: true }),
        supabase.from("rosters").select("id", { count: "exact", head: true }),
      ]);

      const firstError = d.error ?? t.error ?? m.error ?? p.error;
      if (firstError) throw firstError;

      return {
        divisions: d.count ?? 0,
        teams: t.count ?? 0,
        matches: m.count ?? 0,
        players: p.count ?? 0,
      };
    },
    staleTime: 60_000,
  });

  if (isError) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <AlertTriangle className="mx-auto mb-2 h-6 w-6 text-destructive" />
          No se pudieron cargar los indicadores del panel.
        </CardContent>
      </Card>
    );
  }

  const stats = [
    { label: "Divisiones", value: counts.divisions, icon: Trophy, color: "text-primary" },
    { label: "Equipos", value: counts.teams, icon: Users, color: "text-accent" },
    { label: "Partidos", value: counts.matches, icon: Calendar, color: "text-secondary" },
    { label: "Jugadores", value: counts.players, icon: Shield, color: "text-destructive" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold uppercase">Resumen del Torneo</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
              <s.icon className={cn("h-5 w-5", s.color)} />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-display font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
