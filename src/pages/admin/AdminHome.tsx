import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Users, Calendar, Shield } from "lucide-react";

export default function AdminHome() {
  const [counts, setCounts] = useState({ divisions: 0, teams: 0, matches: 0, players: 0 });

  useEffect(() => {
    const fetchCounts = async () => {
      const [d, t, m, p] = await Promise.all([
        supabase.from("divisions").select("id", { count: "exact", head: true }),
        supabase.from("teams").select("id", { count: "exact", head: true }),
        supabase.from("matches").select("id", { count: "exact", head: true }),
        supabase.from("players").select("id", { count: "exact", head: true }),
      ]);
      setCounts({
        divisions: d.count ?? 0,
        teams: t.count ?? 0,
        matches: m.count ?? 0,
        players: p.count ?? 0,
      });
    };
    fetchCounts();
  }, []);

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

function cn(...classes: (string | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
