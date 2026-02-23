import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Lock, CheckCircle, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const statusLabels: Record<string, string> = {
  scheduled: "Programado",
  in_progress: "En juego",
  closed: "Finalizado",
  locked: "Bloqueado",
};

export default function AdminMatches() {
  const queryClient = useQueryClient();

  const { data: matches, isLoading } = useQuery({
    queryKey: ["admin-matches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select(`
          id, match_date, status, phase, round_number, venue,
          categories!inner(name, divisions!inner(name)),
          match_teams(side, score_regular, score_extra, team_id, teams!inner(name))
        `)
        .order("match_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const closeMatchMutation = useMutation({
    mutationFn: async (matchId: string) => {
      // Validate goals match score
      const match = matches?.find((m: any) => m.id === matchId);
      if (!match) throw new Error("Partido no encontrado");

      const homeTeam = (match as any).match_teams?.find((mt: any) => mt.side === "home");
      const awayTeam = (match as any).match_teams?.find((mt: any) => mt.side === "away");

      if (homeTeam && awayTeam) {
        const { data: goals } = await supabase
          .from("goal_events")
          .select("team_id")
          .eq("match_id", matchId)
          .eq("is_shootout", false);

        const homeGoals = goals?.filter((g) => g.team_id === homeTeam.team_id).length ?? 0;
        const awayGoals = goals?.filter((g) => g.team_id === awayTeam.team_id).length ?? 0;

        if (homeGoals !== homeTeam.score_regular) {
          throw new Error(
            `Goles registrados del local (${homeGoals}) no coinciden con el marcador (${homeTeam.score_regular})`
          );
        }
        if (awayGoals !== awayTeam.score_regular) {
          throw new Error(
            `Goles registrados del visitante (${awayGoals}) no coinciden con el marcador (${awayTeam.score_regular})`
          );
        }
      }

      const { error } = await supabase
        .from("matches")
        .update({ status: "closed" as const })
        .eq("id", matchId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-matches"] });
      toast({ title: "Partido cerrado exitosamente" });
    },
    onError: (err: Error) => {
      toast({ title: "Error al cerrar partido", description: err.message, variant: "destructive" });
    },
  });

  const lockMatchMutation = useMutation({
    mutationFn: async (matchId: string) => {
      const { error } = await supabase
        .from("matches")
        .update({ status: "locked" as const })
        .eq("id", matchId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-matches"] });
      toast({ title: "Partido bloqueado" });
    },
    onError: () => {
      toast({ title: "Error al bloquear partido", variant: "destructive" });
    },
  });

  const startMatchMutation = useMutation({
    mutationFn: async (matchId: string) => {
      const { error } = await supabase
        .from("matches")
        .update({ status: "in_progress" as const })
        .eq("id", matchId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-matches"] });
      toast({ title: "Partido iniciado" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold uppercase flex items-center gap-2">
        <Calendar className="h-6 w-6 text-primary" />
        Gestión de Partidos
      </h1>

      <div className="space-y-3">
        {matches?.map((match: any) => {
          const home = match.match_teams?.find((mt: any) => mt.side === "home");
          const away = match.match_teams?.find((mt: any) => mt.side === "away");
          const isLocked = match.status === "locked";
          const isClosed = match.status === "closed";

          return (
            <Card key={match.id} className={isLocked ? "opacity-70" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">{match.categories?.name}</Badge>
                      <Badge variant="outline" className="text-xs">{match.categories?.divisions?.name}</Badge>
                      <Badge
                        variant={
                          match.status === "locked" ? "destructive" :
                          match.status === "closed" ? "outline" :
                          match.status === "in_progress" ? "default" : "secondary"
                        }
                        className="text-xs"
                      >
                        {statusLabels[match.status]}
                      </Badge>
                      {isLocked && <Lock className="h-4 w-4 text-destructive" />}
                    </div>
                    <p className="font-semibold">
                      {home?.teams?.name ?? "TBD"} {home?.score_regular ?? 0} - {away?.score_regular ?? 0} {away?.teams?.name ?? "TBD"}
                    </p>
                    {match.match_date && (
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(match.match_date), "d MMM yyyy, h:mm a", { locale: es })}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    {match.status === "scheduled" && (
                      <Button size="sm" onClick={() => startMatchMutation.mutate(match.id)}>
                        Iniciar
                      </Button>
                    )}

                    {match.status === "in_progress" && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline" className="gap-1">
                            <CheckCircle className="h-4 w-4" /> Cerrar
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2">
                              <AlertTriangle className="h-5 w-5 text-destructive" />
                              Cerrar Partido
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Se validará que los goles registrados coincidan con el marcador.
                              Esta acción cambiará el estado a "Finalizado".
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => closeMatchMutation.mutate(match.id)}>
                              Confirmar Cierre
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}

                    {isClosed && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive" className="gap-1">
                            <Lock className="h-4 w-4" /> Bloquear
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Bloquear Partido</AlertDialogTitle>
                            <AlertDialogDescription>
                              Un partido bloqueado no podrá ser editado. ¿Confirmar?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => lockMatchMutation.mutate(match.id)}>
                              Bloquear
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
