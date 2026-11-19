import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { shootoutState, winningKick, type Kick } from "@/lib/shootout";

type PlayerOpt = { id: string; label: string };

interface Props {
  matchId: string;
  tournamentId: string | null;
  home: { teamId: string; name: string };
  away: { teamId: string; name: string };
  homePlayers: PlayerOpt[];
  awayPlayers: PlayerOpt[];
  /** true si ya existe el gol de shootout (is_shootout) en el partido */
  finalized: boolean;
  /** pide al panel refrescar marcador y goles */
  onChanged: () => void;
}

export default function ShootoutPanel({
  matchId,
  tournamentId,
  home,
  away,
  homePlayers,
  awayPlayers,
  finalized,
  onChanged,
}: Props) {
  const queryClient = useQueryClient();
  const db = supabase as any; // la tabla shootout_kicks es nueva y aún no está en los tipos generados

  const { data: kicks = [] } = useQuery({
    queryKey: ["shootout-kicks", matchId],
    queryFn: async () => {
      const { data, error } = await db
        .from("shootout_kicks")
        .select("id, team_id, kick_number, player_id, scored")
        .eq("match_id", matchId)
        .order("kick_number");
      if (error) throw error;
      return (data ?? []) as Kick[];
    },
    staleTime: 5_000,
  });

  const st = useMemo(() => shootoutState(kicks, home.teamId, away.teamId), [kicks, home.teamId, away.teamId]);

  const [homePlayer, setHomePlayer] = useState("");
  const [awayPlayer, setAwayPlayer] = useState("");

  const label = (teamId: string, playerId: string | null) => {
    const list = teamId === home.teamId ? homePlayers : awayPlayers;
    return list.find((p) => p.id === playerId)?.label ?? "—";
  };

  const refreshKicks = () => queryClient.refetchQueries({ queryKey: ["shootout-kicks", matchId] });

  const addKick = useMutation({
    mutationFn: async (v: { teamId: string; playerId: string; scored: boolean; n: number }) => {
      const { error } = await db.from("shootout_kicks").insert({
        match_id: matchId,
        team_id: v.teamId,
        kick_number: v.n,
        player_id: v.playerId,
        scored: v.scored,
      });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      if (v.teamId === home.teamId) setHomePlayer("");
      else setAwayPlayer("");
      refreshKicks();
    },
    onError: (e: any) => toast({ title: "No se pudo guardar el cobro", description: e?.message, variant: "destructive" }),
  });

  const deleteKick = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("shootout_kicks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: refreshKicks,
    onError: (e: any) => toast({ title: "No se pudo borrar", description: e?.message, variant: "destructive" }),
  });

  // Recalcula el marcador contando TODOS los goles del partido (incluido el gol del shootout)
  const recalcScore = async () => {
    const { data: all } = await supabase.from("goal_events").select("team_id").eq("match_id", matchId);
    const hg = all?.filter((g) => g.team_id === home.teamId).length ?? 0;
    const ag = all?.filter((g) => g.team_id === away.teamId).length ?? 0;
    await Promise.all([
      supabase.from("match_teams").update({ score_regular: hg }).eq("match_id", matchId).eq("team_id", home.teamId),
      supabase.from("match_teams").update({ score_regular: ag }).eq("match_id", matchId).eq("team_id", away.teamId),
    ]);
  };

  const finalize = useMutation({
    mutationFn: async () => {
      if (!st.winner) throw new Error("El shootout todavía no está decidido");
      const winnerTeam = st.winner === "home" ? home.teamId : away.teamId;
      const loserTeam = st.winner === "home" ? away.teamId : home.teamId;
      const wk = winningKick(kicks, winnerTeam);
      if (!wk || !wk.player_id) throw new Error("No se encontró el cobro ganador");

      const { error } = await supabase.from("goal_events").insert({
        match_id: matchId,
        tournament_id: tournamentId,
        team_id: winnerTeam,
        scorer_player_id: wk.player_id,
        assist_player_id: null,
        period: 3,
        game_time: null,
        is_overtime: false,
        is_shootout: true,
      });
      if (error) throw error;

      await recalcScore();
      await Promise.all([
        supabase.from("match_teams").update({ is_winner: true }).eq("match_id", matchId).eq("team_id", winnerTeam),
        supabase.from("match_teams").update({ is_winner: false }).eq("match_id", matchId).eq("team_id", loserTeam),
      ]);
    },
    onSuccess: () => {
      toast({ title: "Shootout finalizado", description: "Se sumó el gol del cobro ganador al marcador." });
      onChanged();
    },
    onError: (e: any) => toast({ title: "No se pudo finalizar", description: e?.message, variant: "destructive" }),
  });

  const reopen = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("goal_events").delete().eq("match_id", matchId).eq("is_shootout", true);
      if (error) throw error;
      await recalcScore();
      await supabase.from("match_teams").update({ is_winner: false }).eq("match_id", matchId);
    },
    onSuccess: () => {
      toast({ title: "Shootout reabierto" });
      onChanged();
    },
    onError: (e: any) => toast({ title: "No se pudo reabrir", description: e?.message, variant: "destructive" }),
  });

  const rounds = Math.max(st.homeKicks, st.awayKicks);
  const lastOf = (teamId: string) =>
    [...kicks].filter((k) => k.team_id === teamId).sort((a, b) => b.kick_number - a.kick_number)[0];

  const renderSide = (
    side: "home" | "away",
    team: { teamId: string; name: string },
    players: PlayerOpt[],
    selected: string,
    setSelected: (v: string) => void,
    mine: number,
    other: number,
  ) => {
    const waiting = mine > other; // ya cobró: espera al rival
    const disabled = finalized || st.decided || waiting || addKick.isPending;
    return (
      <div className="rounded-lg border p-3 space-y-2">
        <p className="font-bold text-sm lg:text-base">
          {side === "home" ? "Local" : "Visitante"} · {team.name}
        </p>
        <p className="text-xs text-muted-foreground">
          {finalized || st.decided ? "Shootout decidido" : waiting ? "Espera el cobro del rival" : `Cobro #${mine + 1}`}
        </p>
        <Select value={selected} onValueChange={setSelected} disabled={disabled}>
          <SelectTrigger>
            <SelectValue placeholder="Jugador que cobra" />
          </SelectTrigger>
          <SelectContent>
            {players.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="grid grid-cols-2 gap-2">
          <Button
            className="bg-green-600 hover:bg-green-700 text-white"
            disabled={disabled || !selected}
            onClick={() => addKick.mutate({ teamId: team.teamId, playerId: selected, scored: true, n: mine + 1 })}
          >
            Anota
          </Button>
          <Button
            variant="destructive"
            disabled={disabled || !selected}
            onClick={() => addKick.mutate({ teamId: team.teamId, playerId: selected, scored: false, n: mine + 1 })}
          >
            Falla
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="mt-4 rounded-lg border-2 border-primary/50 p-3 lg:p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold text-base lg:text-xl">Shootouts</h3>
        <span className="text-lg lg:text-2xl font-bold tabular-nums">
          {st.homeGoals} – {st.awayGoals}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        3 cobros por equipo; si siguen empatados, se cobra de a uno hasta que alguien gane. El ganador suma 1 gol al
        marcador, a nombre del jugador que anotó su último cobro.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {renderSide("home", home, homePlayers, homePlayer, setHomePlayer, st.homeKicks, st.awayKicks)}
        {renderSide("away", away, awayPlayers, awayPlayer, setAwayPlayer, st.awayKicks, st.homeKicks)}
      </div>

      {rounds > 0 && (
        <div className="rounded border text-sm">
          <div className="grid grid-cols-[3rem_1fr_1fr] bg-muted/60 font-semibold px-2 py-1">
            <span>#</span>
            <span>{home.name}</span>
            <span>{away.name}</span>
          </div>
          {Array.from({ length: rounds }, (_, i) => i + 1).map((n) => {
            const hk = kicks.find((k) => k.team_id === home.teamId && k.kick_number === n);
            const ak = kicks.find((k) => k.team_id === away.teamId && k.kick_number === n);
            const cell = (k: Kick | undefined, teamId: string) => {
              if (!k) return <span className="text-muted-foreground">—</span>;
              const isLast = lastOf(teamId)?.id === k.id;
              return (
                <span className="flex items-center gap-1">
                  <span className={k.scored ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                    {k.scored ? "✓" : "✗"}
                  </span>
                  <span className="truncate">{label(teamId, k.player_id)}</span>
                  {isLast && !finalized && k.id && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 ml-auto"
                      title="Borrar este cobro"
                      onClick={() => deleteKick.mutate(k.id!)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </span>
              );
            };
            return (
              <div key={n} className="grid grid-cols-[3rem_1fr_1fr] px-2 py-1 border-t">
                <span className="font-semibold">{n}</span>
                {cell(hk, home.teamId)}
                {cell(ak, away.teamId)}
              </div>
            );
          })}
        </div>
      )}

      {finalized ? (
        <div className="flex items-center justify-between gap-2 rounded bg-green-50 dark:bg-green-950/30 p-2 text-sm">
          <span className="font-semibold">Shootout finalizado. Ya puedes cerrar el partido.</span>
          <Button size="sm" variant="outline" onClick={() => reopen.mutate()} disabled={reopen.isPending}>
            Reabrir shootout
          </Button>
        </div>
      ) : st.decided ? (
        <div className="flex items-center justify-between gap-2 rounded bg-primary/10 p-2 text-sm">
          <span className="font-semibold">
            Gana {st.winner === "home" ? home.name : away.name} el shootout ({st.homeGoals}–{st.awayGoals}).
          </span>
          <Button onClick={() => finalize.mutate()} disabled={finalize.isPending}>
            Finalizar shootout
          </Button>
        </div>
      ) : null}
    </div>
  );
}
