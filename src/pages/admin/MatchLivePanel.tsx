import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Play, Pause, SkipForward, TimerReset } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  defaultPeriodMinutesForCategory,
  elapsedMs,
  formatClock,
  isClockRunning,
  isPeriodOver,
  periodLabel,
  periodMs,
  PERIOD_PRESETS,
  remainingMs,
  useMatchClock,
  usePenaltyClock,
} from "@/lib/matchClock";
import { toast } from "@/hooks/use-toast";

const PENALTY_CODES = [
  { code: "BC", desc: "BODY CHECKING" },
  { code: "BDG", desc: "BOARDING" },
  { code: "BE", desc: "BUTT ENDING" },
  { code: "BP", desc: "BENCH PENALTY" },
  { code: "BS", desc: "BROKEN STICK" },
  { code: "CC", desc: "CROSS CHECKING" },
  { code: "CFB", desc: "CC FROM BEHIND" },
  { code: "CH", desc: "CHARGING" },
  { code: "DG", desc: "DELAY OF GAME" },
  { code: "ELB", desc: "ELBOWING" },
  { code: "FI", desc: "FIGHTING" },
  { code: "FOP", desc: "FALLING ON PUCK" },
  { code: "FOV", desc: "FACE OFF VIOL." },
  { code: "GE", desc: "GAME EJECTION" },
  { code: "GM", desc: "GAME MISSCONDUCT" },
  { code: "HKG", desc: "HOOKING" },
  { code: "HO", desc: "HOLDING" },
  { code: "HP", desc: "HAND PASS" },
  { code: "HS", desc: "HIGH STICK" },
  { code: "IE", desc: "ILLEGAL EQUIPMENT" },
  { code: "INT", desc: "INTERFERENCE" },
  { code: "INTG", desc: "INT. OF GOALTENDER" },
  { code: "KNE", desc: "KNEEING" },
  { code: "MP", desc: "MATCH PENALTY" },
  { code: "MSC", desc: "MISSCONDUCT" },
  { code: "OA", desc: "OFFICIAL ABUSE" },
  { code: "PS", desc: "PENALTY SHOOT" },
  { code: "RO", desc: "ROUGHING" },
  { code: "SL", desc: "SLASHING" },
  { code: "SP", desc: "SPEARING" },
  { code: "TMM", desc: "TOO MANY MEN" },
  { code: "TR", desc: "TRIPPING" },
  { code: "USC", desc: "UNSPORTSMANLIKE" },
];

const PENALTY_TIMES = [
  { label: "1:00", minutes: 1 },
  { label: "1:30", minutes: 1.5 },
  { label: "4:00", minutes: 4 },
  { label: "10:00", minutes: 10 },
  { label: "Manual", minutes: 0 },
];

/** Convert numeric minutes (e.g. 1.5) to mm:ss string (e.g. "1:30") */
export function minutesToMmSs(mins: number): string {
  const totalSeconds = Math.round(mins * 60);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const PERIODS = [
  { value: "1", label: "1T" },
  { value: "2", label: "2T" },
  { value: "3", label: "OT" },
];

interface MatchLivePanelProps {
  matchId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function MatchLivePanel({ matchId, open, onOpenChange }: MatchLivePanelProps) {
  const queryClient = useQueryClient();
  const { restoreSession } = useAuth();

  // Goal form state
  const [goalTeamId, setGoalTeamId] = useState("");
  const [goalScorerId, setGoalScorerId] = useState("");
  const [goalAssistId, setGoalAssistId] = useState("");
  const [goalTime, setGoalTime] = useState("");
  const [goalPeriod, setGoalPeriod] = useState("1");
  const [goalTimeTouched, setGoalTimeTouched] = useState(false);

  // Penalty form state
  const [penTeamId, setPenTeamId] = useState("");
  const [penPlayerId, setPenPlayerId] = useState("");
  const [penCode, setPenCode] = useState("");
  const [penTimePreset, setPenTimePreset] = useState("1:30");
  const [penTimeManual, setPenTimeManual] = useState("");
  const [penPeriod, setPenPeriod] = useState("1");
  const [penMatchTime, setPenMatchTime] = useState("");
  const [penMatchTimeTouched, setPenMatchTimeTouched] = useState(false);

  const isValidMatchTime = useCallback((v: string) => /^\d{2}:\d{2}$/.test(v), []);

  // Self-contained match data fetch — isolated from parent
  const { data: matchData } = useQuery({
    queryKey: ["live-match-detail", matchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select(
          `
          id, match_date, status, phase, category_id,
          clock_enabled, clock_started_at, clock_offset_ms, current_period, period_minutes,
          categories(name),
          match_teams(side, score_regular, score_extra, team_id, teams!inner(id, name, logo_url)),
          home_timeouts_used, away_timeouts_used
        `,
        )
        .eq("id", matchId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: open && !!matchId,
    staleTime: 10_000,
    retry: 2,
  });

  useEffect(() => {
    if (!open || !matchId) return;
    let timerId: ReturnType<typeof setTimeout> | undefined;

    const refetchAfterRestore = () => {
      timerId = setTimeout(() => {
        void (async () => {
          await restoreSession({ forceRefresh: true });
          await Promise.all([
            queryClient.refetchQueries({ queryKey: ["live-match-detail", matchId] }),
            queryClient.refetchQueries({ queryKey: ["live-match-rosters", matchId] }),
            queryClient.refetchQueries({ queryKey: ["match-goals", matchId] }),
            queryClient.refetchQueries({ queryKey: ["match-penalties", matchId] }),
          ]);
        })();
      }, 500);
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        refetchAfterRestore();
      }
    };

    const handleFocus = () => {
      if (document.visibilityState === "visible") {
        refetchAfterRestore();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("online", refetchAfterRestore);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("online", refetchAfterRestore);
      if (timerId) {
        clearTimeout(timerId);
      }
    };
  }, [open, matchId, queryClient, restoreSession]);

  const homeTeam = matchData?.match_teams?.find((mt: any) => mt.side === "home");
  const awayTeam = matchData?.match_teams?.find((mt: any) => mt.side === "away");
  const teamIds = useMemo(
    () => [homeTeam?.team_id, awayTeam?.team_id].filter(Boolean) as string[],
    [homeTeam, awayTeam],
  );

  // Fetch rosters for both teams
  const { data: rosters = [] } = useQuery({
    queryKey: ["live-match-rosters", matchId, teamIds.join(",")],
    queryFn: async () => {
      if (teamIds.length === 0) return [];
      const { data, error } = await supabase
        .from("rosters")
        .select(
          "id, jersey_number, position, team_id, player_id, players!rosters_player_id_fkey(id, first_name, last_name)",
        )
        .in("team_id", teamIds);
      if (error) throw error;
      return data;
    },
    enabled: open && teamIds.length > 0,
    staleTime: 5 * 60_000,
  });

  // Fetch existing goals
  const { data: goals = [] } = useQuery({
    queryKey: ["match-goals", matchId],
    queryFn: async () => {
      if (!matchId) return [];
      const { data, error } = await supabase
        .from("goal_events")
        .select(
          "*, scorer:players!goal_events_scorer_player_id_fkey(first_name, last_name), assist:players!goal_events_assist_player_id_fkey(first_name, last_name)",
        )
        .eq("match_id", matchId)
        .order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: open && !!matchId,
    staleTime: 10_000,
    retry: 2,
  });

  // Fetch existing penalties
  const { data: penalties = [] } = useQuery({
    queryKey: ["match-penalties", matchId],
    queryFn: async () => {
      if (!matchId) return [];
      const { data, error } = await supabase
        .from("penalties")
        .select("*, player:players!penalties_player_id_fkey(first_name, last_name)")
        .eq("match_id", matchId)
        .order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: open && !!matchId,
    staleTime: 10_000,
    retry: 2,
  });

  // Resolve the correct edition-specific jersey number from rosters (not from the
  // global players catalog, which can be stale across editions — see Muñetón case)
  const jerseyByPlayerTeam = useCallback(
    (playerId: string | null | undefined, teamId: string | null | undefined) => {
      if (!playerId) return null;
      const r = rosters.find(
        (r: any) => r.player_id === playerId && (!teamId || r.team_id === teamId),
      );
      return r?.jersey_number ?? null;
    },
    [rosters],
  );

  const playersForTeam = useCallback(
    (teamId: string) =>
      rosters
        .filter((r: any) => r.team_id === teamId)
        .sort((a: any, b: any) => {
          const aGk = a.position === "ARQUERO" ? 0 : 1;
          const bGk = b.position === "ARQUERO" ? 0 : 1;
          if (aGk !== bGk) return aGk - bGk;
          return (a.jersey_number ?? 999) - (b.jersey_number ?? 999);
        })
        .map((r: any) => ({
          id: r.players?.id ?? r.player_id,
          label: `#${r.jersey_number ?? "?"} ${r.players?.first_name ?? ""} ${r.players?.last_name ?? ""}`,
        })),
    [rosters],
  );

  const teamName = useCallback(
    (teamId: string) => {
      if (teamId === homeTeam?.team_id) return homeTeam?.teams?.name ?? "Local";
      if (teamId === awayTeam?.team_id) return awayTeam?.teams?.name ?? "Visitante";
      return "—";
    },
    [homeTeam, awayTeam],
  );

  // Mutation helper: auto-reset after 15s to prevent stuck buttons
  const mutationTimeoutRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const startMutationTimeout = useCallback((key: string, resetFn: () => void) => {
    const existing = mutationTimeoutRef.current.get(key);
    if (existing) clearTimeout(existing);
    mutationTimeoutRef.current.set(
      key,
      setTimeout(() => {
        resetFn();
        mutationTimeoutRef.current.delete(key);
      }, 15_000),
    );
  }, []);
  const clearMutationTimeout = useCallback((key: string) => {
    const existing = mutationTimeoutRef.current.get(key);
    if (existing) {
      clearTimeout(existing);
      mutationTimeoutRef.current.delete(key);
    }
  }, []);

  // Add goal mutation with timeout protection
  const addGoalMutation = useMutation({
    mutationFn: async () => {
      if (!matchId) throw new Error("No match");
      await restoreSession({ forceRefresh: true });
      const isOT = goalPeriod === "3";
      if (goalTime && !isValidMatchTime(goalTime)) {
        throw new Error("Formato de tiempo inválido. Use mm:ss (ej: 05:32)");
      }
      const { error } = await supabase.from("goal_events").insert({
        match_id: matchId,
        team_id: goalTeamId,
        scorer_player_id: goalScorerId,
        assist_player_id: goalAssistId === "na" ? null : goalAssistId || null,
        period: parseInt(goalPeriod),
        game_time: goalTime || null,
        is_overtime: isOT,
        is_shootout: false,
      });
      if (error) throw error;

      const { data: allGoals } = await supabase
        .from("goal_events")
        .select("team_id")
        .eq("match_id", matchId)
        .eq("is_shootout", false);

      const homeGoals = allGoals?.filter((g) => g.team_id === homeTeam?.team_id).length ?? 0;
      const awayGoals = allGoals?.filter((g) => g.team_id === awayTeam?.team_id).length ?? 0;

      await Promise.all(
        [
          homeTeam
            ? supabase
                .from("match_teams")
                .update({ score_regular: homeGoals })
                .eq("match_id", matchId)
                .eq("side", "home")
            : null,
          awayTeam
            ? supabase
                .from("match_teams")
                .update({ score_regular: awayGoals })
                .eq("match_id", matchId)
                .eq("side", "away")
            : null,
        ].filter(Boolean),
      );
    },
    onMutate: () => startMutationTimeout("addGoal", () => addGoalMutation.reset()),
    onSuccess: () => {
      clearMutationTimeout("addGoal");
      queryClient.refetchQueries({ queryKey: ["match-goals", matchId] });
      queryClient.refetchQueries({ queryKey: ["live-match-detail", matchId] });
      setGoalTeamId("");
      setGoalScorerId("");
      setGoalAssistId("");
      setGoalTime("");
      setGoalTimeTouched(false);
      toast({ title: "Gol registrado" });
    },
    onError: (e: Error) => {
      clearMutationTimeout("addGoal");
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  // Delete goal mutation
  const deleteGoalMutation = useMutation({
    mutationFn: async (goalId: string) => {
      await restoreSession({ forceRefresh: true });
      const { error } = await supabase.from("goal_events").delete().eq("id", goalId);
      if (error) throw error;
      const { data: allGoals } = await supabase
        .from("goal_events")
        .select("team_id")
        .eq("match_id", matchId!)
        .eq("is_shootout", false);
      const homeGoals = allGoals?.filter((g) => g.team_id === homeTeam?.team_id).length ?? 0;
      const awayGoals = allGoals?.filter((g) => g.team_id === awayTeam?.team_id).length ?? 0;
      await Promise.all(
        [
          homeTeam
            ? supabase
                .from("match_teams")
                .update({ score_regular: homeGoals })
                .eq("match_id", matchId!)
                .eq("side", "home")
            : null,
          awayTeam
            ? supabase
                .from("match_teams")
                .update({ score_regular: awayGoals })
                .eq("match_id", matchId!)
                .eq("side", "away")
            : null,
        ].filter(Boolean),
      );
    },
    onMutate: () => startMutationTimeout("deleteGoal", () => deleteGoalMutation.reset()),
    onSuccess: () => {
      clearMutationTimeout("deleteGoal");
      queryClient.refetchQueries({ queryKey: ["match-goals", matchId] });
      queryClient.refetchQueries({ queryKey: ["live-match-detail", matchId] });
      toast({ title: "Gol eliminado" });
    },
    onError: () => clearMutationTimeout("deleteGoal"),
  });

  // Add penalty mutation
  const addPenaltyMutation = useMutation({
    mutationFn: async () => {
      if (!matchId) throw new Error("No match");
      await restoreSession({ forceRefresh: true });
      const selectedPenalty = PENALTY_CODES.find((p) => p.code === penCode);
      const preset = PENALTY_TIMES.find((t) => t.label === penTimePreset);
      const minutes = penTimePreset === "Manual" ? parseFloat(penTimeManual) || 2 : (preset?.minutes ?? 2);

      if (penMatchTime && !isValidMatchTime(penMatchTime)) {
        throw new Error("Formato de tiempo inválido. Use mm:ss (ej: 10:15)");
      }
      const { error } = await supabase.from("penalties").insert({
        match_id: matchId,
        team_id: penTeamId,
        player_id: penPlayerId || null,
        penalty_code: penCode,
        penalty_description: selectedPenalty?.desc ?? penCode,
        penalty_minutes: minutes,
        period: parseInt(penPeriod),
        game_time: penTimePreset === "Manual" ? penTimeManual : penTimePreset,
        penalty_time: penMatchTime || null,
      } as any);
      if (error) throw error;
    },
    onMutate: () => startMutationTimeout("addPenalty", () => addPenaltyMutation.reset()),
    onSuccess: () => {
      clearMutationTimeout("addPenalty");
      queryClient.refetchQueries({ queryKey: ["match-penalties", matchId] });
      setPenTeamId("");
      setPenPlayerId("");
      setPenCode("");
      setPenTimePreset("1:30");
      setPenTimeManual("");
      setPenMatchTime("");
      setPenMatchTimeTouched(false);
      toast({ title: "Sanción registrada" });
    },
    onError: (e: Error) => {
      clearMutationTimeout("addPenalty");
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const deletePenaltyMutation = useMutation({
    mutationFn: async (penId: string) => {
      await restoreSession({ forceRefresh: true });
      const { error } = await supabase.from("penalties").delete().eq("id", penId);
      if (error) throw error;
    },
    onMutate: () => startMutationTimeout("deletePenalty", () => deletePenaltyMutation.reset()),
    onSuccess: () => {
      clearMutationTimeout("deletePenalty");
      queryClient.refetchQueries({ queryKey: ["match-penalties", matchId] });
      toast({ title: "Sanción eliminada" });
    },
    onError: () => clearMutationTimeout("deletePenalty"),
  });

  // Terminar una sanción antes de tiempo (p.ej. gol en power play): no borra
  // el registro — lo marca ended_early=true, que hace que penaltyRemainingMs
  // devuelva null tanto acá como en la página pública, así el timer
  // desaparece de inmediato en ambos lados sin perder el dato histórico.
  const endPenaltyMutation = useMutation({
    mutationFn: async (penId: string) => {
      await restoreSession({ forceRefresh: true });
      const { error } = await supabase
        .from("penalties")
        .update({ ended_early: true, ended_at: new Date().toISOString() } as any)
        .eq("id", penId);
      if (error) throw error;
    },
    onMutate: () => startMutationTimeout("endPenalty", () => endPenaltyMutation.reset()),
    onSuccess: () => {
      clearMutationTimeout("endPenalty");
      queryClient.refetchQueries({ queryKey: ["match-penalties", matchId] });
      toast({ title: "Sanción terminada" });
    },
    onError: (e: Error) => {
      clearMutationTimeout("endPenalty");
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  /* ---------------- Match clock ---------------- */
  const clockMatch = matchData as any;
  const clockEnabled = clockMatch ? clockMatch.clock_enabled !== false : true;
  const clockRunning = isClockRunning(clockMatch);
  const liveClock = useMatchClock(clockMatch);
  const currentPeriod = clockMatch?.current_period ?? 1;

  const updateClock = useMutation({
    mutationFn: async (patch: Record<string, unknown>) => {
      if (!matchId) throw new Error("No match");
      await restoreSession({ forceRefresh: true });
      const { error } = await supabase.from("matches").update(patch as any).eq("id", matchId);
      if (error) throw error;
    },
    onMutate: () => startMutationTimeout("clock", () => updateClock.reset()),
    onSuccess: () => {
      clearMutationTimeout("clock");
      queryClient.refetchQueries({ queryKey: ["live-match-detail", matchId] });
    },
    onError: (e: any) => {
      clearMutationTimeout("clock");
      toast({ title: "No se pudo actualizar el reloj", description: e?.message, variant: "destructive" });
    },
  });

  const useTimeout = (side: "home" | "away") => {
    const used = side === "home" ? (clockMatch?.home_timeouts_used ?? 0) : (clockMatch?.away_timeouts_used ?? 0);
    if (used >= 2) return;
    const patch: Record<string, unknown> = {
      clock_started_at: null,
      clock_offset_ms: Math.round(elapsedMs(clockMatch ?? {})),
    };
    patch[side === "home" ? "home_timeouts_used" : "away_timeouts_used"] = used + 1;
    updateClock.mutate(patch);
  };

  const resetTimeouts = (side: "home" | "away") => {
    const patch: Record<string, unknown> = {};
    patch[side === "home" ? "home_timeouts_used" : "away_timeouts_used"] = 0;
    updateClock.mutate(patch);
  };

  const startClock = () => updateClock.mutate({ clock_started_at: new Date().toISOString() });
  const pauseClock = () =>
    updateClock.mutate({
      clock_started_at: null,
      clock_offset_ms: Math.round(elapsedMs(clockMatch ?? {})),
    });
  const nextPeriod = () =>
    updateClock.mutate({
      current_period: Math.min(3, currentPeriod + 1),
      clock_started_at: null,
      clock_offset_ms: 0,
    });
  const resetClock = () => updateClock.mutate({ clock_started_at: null, clock_offset_ms: 0 });

  // Detener el reloj automaticamente al agotarse el periodo
  useEffect(() => {
    if (!open || !clockEnabled) return;
    if (!clockMatch?.clock_started_at) return;
    if (!isPeriodOver(clockMatch)) return;
    updateClock.mutate({
      clock_started_at: null,
      clock_offset_ms: periodMs(clockMatch),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, clockEnabled, clockMatch, liveClock]);

  // Al abrir un partido que nunca tuvo duración de período configurada,
  // fijar automáticamente el valor de norma según su categoría:
  // 10' Sub-8 | 12' Sub-10/Sub-12 | 15' Sub-14, Sub-16 Mixto, Juvenil, Femenino
  useEffect(() => {
    if (!open || !clockMatch) return;
    if (clockMatch.period_minutes != null) return;
    if (clockMatch.clock_started_at) return; // no tocar un reloj ya corriendo
    const categoryName = clockMatch.categories?.name as string | undefined;
    const defaultMinutes = defaultPeriodMinutesForCategory(categoryName);
    updateClock.mutate({ period_minutes: defaultMinutes });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, clockMatch?.id, clockMatch?.period_minutes]);

  // Reset the "touched" flags whenever the panel opens for a (possibly new) match,
  // so a fresh team selection triggers the time snapshot instead of staying stuck
  // on a manual edit carried over from a previous session.
  useEffect(() => {
    if (!open) return;
    setGoalTimeTouched(false);
    setPenMatchTimeTouched(false);
    setGoalTeamId("");
    setPenTeamId("");
    setGoalTime("");
    setPenMatchTime("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, matchId]);

  // Keep the goal period aligned with the live period while the clock is on
  useEffect(() => {
    if (!open || !clockEnabled) return;
    setGoalPeriod(String(currentPeriod));
  }, [open, clockEnabled, currentPeriod]);

  // Keep the penalty period aligned with the live period while the clock is on
  useEffect(() => {
    if (!open || !clockEnabled) return;
    setPenPeriod(String(currentPeriod));
  }, [open, clockEnabled, currentPeriod]);

  // Selecting a team is the trigger: the moment the "Equipo" field goes from
  // empty to a real team, snapshot the clock's remaining time into the field —
  // once, not continuously. Uses remainingMs (same source as the big on-screen
  // clock) so the recorded value always matches exactly what the ref saw on
  // the clock, not a separately-computed elapsed time. If the person picked a
  // manual time before choosing the team (goalTimeTouched/penMatchTimeTouched),
  // we respect that and don't overwrite it.
  const handleGoalTeamChange = useCallback(
    (teamId: string) => {
      const wasEmpty = !goalTeamId;
      setGoalTeamId(teamId);
      if (wasEmpty && teamId && clockEnabled && clockMatch && !goalTimeTouched) {
        setGoalTime(formatClock(remainingMs(clockMatch)));
      }
    },
    [goalTeamId, clockEnabled, clockMatch, goalTimeTouched],
  );

  const handlePenTeamChange = useCallback(
    (teamId: string) => {
      const wasEmpty = !penTeamId;
      setPenTeamId(teamId);
      if (wasEmpty && teamId && clockEnabled && clockMatch && !penMatchTimeTouched) {
        setPenMatchTime(formatClock(remainingMs(clockMatch)));
      }
    },
    [penTeamId, clockEnabled, clockMatch, penMatchTimeTouched],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl lg:w-[75vw] lg:max-w-[75vw] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-lg lg:text-2xl flex items-center justify-center gap-3">
            <span className="flex items-center gap-2">
              {homeTeam?.teams?.logo_url && (
                <img src={homeTeam.teams.logo_url} alt="" className="h-8 w-8 lg:h-11 lg:w-11 rounded-full object-cover border" />
              )}
              {homeTeam?.teams?.name ?? "Local"}
            </span>
            <span className="text-muted-foreground font-normal">vs</span>
            <span className="flex items-center gap-2">
              {awayTeam?.teams?.logo_url && (
                <img src={awayTeam.teams.logo_url} alt="" className="h-8 w-8 lg:h-11 lg:w-11 rounded-full object-cover border" />
              )}
              {awayTeam?.teams?.name ?? "Visitante"}
            </span>
          </SheetTitle>
          <p className="text-sm lg:text-base text-muted-foreground text-center">
            Marcador: {homeTeam?.score_regular ?? 0} - {awayTeam?.score_regular ?? 0}
          </p>
        </SheetHeader>

        {/* Clock panel */}
        <div className="mt-4 rounded-lg border p-3 lg:p-5 space-y-3 lg:space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Switch
                id="clock-enabled"
                checked={clockEnabled}
                onCheckedChange={(checked) => updateClock.mutate({ clock_enabled: checked })}
                disabled={!matchId || updateClock.isPending}
              />
              <label htmlFor="clock-enabled" className="text-sm lg:text-base font-medium">
                {clockEnabled ? "Reloj habilitado" : "Reloj deshabilitado"}
              </label>
            </div>
            <div className="text-right">
              <p
                className={
                  "font-display text-2xl lg:text-5xl font-bold tabular-nums " +
                  (!clockEnabled
                    ? "text-muted-foreground"
                    : clockRunning
                    ? "text-green-600 dark:text-green-500"
                    : "text-red-600 dark:text-red-500")
                }
              >
                {clockEnabled ? (liveClock ?? formatClock(0)) : "--:--"}
              </p>
              <p className="text-xs lg:text-sm text-muted-foreground">{periodLabel(currentPeriod)}</p>
            </div>
          </div>

          {/* Cajitas de sanción activa, estilo "penalty box": dorsal grande + timer,
              atadas al reloj principal. No se borra el registro al terminar — solo
              deja de mostrarse (ver penaltyRemainingMs / ended_early). */}
          {penalties.length > 0 && (
            <div className="flex flex-wrap gap-2 lg:gap-3 pt-1">
              {penalties.map((p: any) => (
                <PenaltyBox
                  key={p.id}
                  penalty={{ ...p, resolvedJersey: jerseyByPlayerTeam(p.player_id, p.team_id) }}
                  clockMatch={clockMatch}
                  teamName={teamName}
                  isHome={p.team_id === homeTeam?.team_id}
                  clockRunning={clockRunning}
                  onEnd={(id) => endPenaltyMutation.mutate(id)}
                  ending={endPenaltyMutation.isPending}
                />
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2 lg:gap-3">
            {clockRunning ? (
              <Button
                size="sm"
                className="gap-1.5 lg:h-14 lg:px-8 lg:text-lg font-bold bg-orange-600 hover:bg-orange-700 text-white border-transparent"
                onClick={pauseClock}
                disabled={!clockEnabled || updateClock.isPending}
              >
                <Pause className="h-5 w-5 lg:h-6 lg:w-6" /> Pausar
              </Button>
            ) : (
              <Button size="sm" className="gap-1 lg:h-11 lg:px-5 lg:text-base" onClick={startClock} disabled={!clockEnabled || updateClock.isPending}>
                <Play className="h-4 w-4" />
                {(clockMatch?.clock_offset_ms ?? 0) > 0 ? "Reanudar" : "Iniciar"}
              </Button>
            )}
            <Button size="sm" variant="outline" className="gap-1" onClick={nextPeriod} disabled={!clockEnabled || updateClock.isPending}>
              <SkipForward className="h-4 w-4" /> Siguiente período
            </Button>
            <Button size="sm" variant="ghost" className="gap-1" onClick={resetClock} disabled={!clockEnabled || updateClock.isPending}>
              <TimerReset className="h-4 w-4" /> Reiniciar
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <span className="text-xs text-muted-foreground">Duracion del periodo:</span>
            {PERIOD_PRESETS.map((mins) => (
              <Button
                key={mins}
                size="sm"
                variant={(clockMatch?.period_minutes ?? defaultPeriodMinutesForCategory(clockMatch?.categories?.name)) === mins ? "default" : "outline"}
                className="h-7 px-2 text-xs"
                onClick={() => updateClock.mutate({ period_minutes: mins })}
                disabled={!clockEnabled || updateClock.isPending}
              >
                {mins}'
              </Button>
            ))}
            <input
              type="number"
              min={1}
              max={99}
              className="h-7 w-16 rounded-md border bg-background px-2 text-xs"
              placeholder="Manual"
              defaultValue={clockMatch?.period_minutes ?? defaultPeriodMinutesForCategory(clockMatch?.categories?.name)}
              onBlur={(e) => {
                const v = parseInt(e.target.value, 10);
                const current = clockMatch?.period_minutes ?? defaultPeriodMinutesForCategory(clockMatch?.categories?.name);
                if (!isNaN(v) && v > 0 && v !== current) {
                  updateClock.mutate({ period_minutes: v });
                }
              }}
              disabled={!clockEnabled || updateClock.isPending}
            />
          </div>

          {!clockEnabled && (
            <p className="text-xs text-muted-foreground">
              El reloj está deshabilitado para este partido: los tiempos se registran manualmente y no se muestra reloj en vivo al público.
            </p>
          )}

          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-2">Tiempos fuera (máx 2 por equipo)</p>
            <div className="grid grid-cols-2 gap-2">
              {(["home", "away"] as const).map((side) => {
                const used = side === "home" ? (clockMatch?.home_timeouts_used ?? 0) : (clockMatch?.away_timeouts_used ?? 0);
                const label = side === "home" ? (homeTeam?.teams?.name ?? "Local") : (awayTeam?.teams?.name ?? "Visitante");
                return (
                  <div key={side} className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="justify-between gap-2 lg:h-11 flex-1 min-w-0"
                      onClick={() => useTimeout(side)}
                      disabled={!clockEnabled || used >= 2 || updateClock.isPending}
                    >
                      <span className="truncate text-sm lg:text-base font-semibold">{label}</span>
                      <span className="flex items-center gap-1 shrink-0">
                        {[0, 1].map((i) => (
                          <span
                            key={i}
                            className={"h-2 w-3.5 rounded-sm " + (i < used ? "bg-primary" : "bg-muted")}
                          />
                        ))}
                      </span>
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="shrink-0 h-8 w-8 lg:h-11 lg:w-11 text-muted-foreground"
                      onClick={() => resetTimeouts(side)}
                      disabled={used === 0 || updateClock.isPending}
                      title={`Restablecer tiempos fuera de ${label}`}
                    >
                      <TimerReset className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <Tabs defaultValue="goals" className="mt-4">
          <TabsList className="w-full lg:hidden">
            <TabsTrigger value="goals" className="flex-1">
              Goles ({goals.length})
            </TabsTrigger>
            <TabsTrigger value="penalties" className="flex-1">
              Sanciones ({penalties.length})
            </TabsTrigger>
          </TabsList>

          {/* En pantallas grandes (lg+) Goles y Sanciones se muestran en dos
              columnas lado a lado en vez de pestañas — forceMount mantiene
              ambos TabsContent montados y las clases data-[state] los ocultan
              solo cuando corresponde en mobile, sin duplicar el formulario. */}
          <div className="lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start">

          {/* GOALS TAB */}
          <TabsContent
            value="goals"
            forceMount
            className="space-y-4 mt-4 lg:mt-0 data-[state=inactive]:hidden lg:data-[state=inactive]:block"
          >
            <h3 className="hidden lg:block text-sm font-bold uppercase tracking-wide text-blue-700 dark:text-blue-400 mb-2">
              ⚽ Goles
            </h3>
            <div className="space-y-3 p-3 lg:p-4 border rounded-lg">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs lg:text-base font-extrabold underline underline-offset-2">Equipo</label>
                  <Select value={goalTeamId} onValueChange={handleGoalTeamChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Equipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {homeTeam && <SelectItem value={homeTeam.team_id}>{homeTeam.teams?.name} (Local)</SelectItem>}
                      {awayTeam && <SelectItem value={awayTeam.team_id}>{awayTeam.teams?.name} (Visitante)</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs lg:text-base font-extrabold underline underline-offset-2">Periodo</label>
                  <Select value={goalPeriod} onValueChange={setGoalPeriod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PERIODS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs lg:text-base font-extrabold underline underline-offset-2">Goleador</label>
                <Select value={goalScorerId} onValueChange={setGoalScorerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar jugador" />
                  </SelectTrigger>
                  <SelectContent>
                    {goalTeamId &&
                      playersForTeam(goalTeamId).map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs lg:text-base font-extrabold underline underline-offset-2">Asistencia</label>
                <Select value={goalAssistId} onValueChange={setGoalAssistId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar jugador" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="na">N/A</SelectItem>
                    {goalTeamId &&
                      playersForTeam(goalTeamId).map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs lg:text-base font-extrabold underline underline-offset-2">Tiempo (mm:ss)</label>
                  {clockEnabled && clockMatch && (
                    <button
                      type="button"
                      className="text-[11px] text-primary underline underline-offset-2"
                      onClick={() => {
                        setGoalTimeTouched(false);
                        setGoalTime(formatClock(remainingMs(clockMatch)));
                      }}
                    >
                      Usar tiempo del reloj
                    </button>
                  )}
                </div>
                <Input
                  value={goalTime}
                  onChange={(e) => {
                    setGoalTimeTouched(true);
                    setGoalTime(e.target.value);
                  }}
                  placeholder="00:00"
                  className="w-[100px]"
                />
              </div>
              <Button
                onClick={() => {
                  addGoalMutation.reset();
                  addGoalMutation.mutate();
                }}
                disabled={!goalTeamId || !goalScorerId}
                className="w-full gap-1 lg:h-11 lg:text-base"
              >
                <Plus className="h-4 w-4" /> Registrar Gol
              </Button>
            </div>

            {/* Listed goals */}
            <div className="space-y-2">
              {goals.map((g: any) => (
                <div key={g.id} className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm">
                  <div>
                    <span className="font-medium">{teamName(g.team_id)}</span>
                    {" — "}
                    {jerseyByPlayerTeam(g.scorer_player_id, g.team_id) ? `#${jerseyByPlayerTeam(g.scorer_player_id, g.team_id)} ` : ""}{g.scorer?.first_name} {g.scorer?.last_name}
                    {g.assist && (
                      <span className="text-muted-foreground">
                        {" "}
                        (Asist: {jerseyByPlayerTeam(g.assist_player_id, g.team_id) ? `#${jerseyByPlayerTeam(g.assist_player_id, g.team_id)} ` : ""}{g.assist.first_name} {g.assist.last_name})
                      </span>
                    )}
                    <span className="text-muted-foreground ml-2">
                      {PERIODS.find((p) => p.value === String(g.period))?.label} {g.game_time ?? ""}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-destructive"
                    onClick={() => deleteGoalMutation.mutate(g.id)}
                    disabled={deleteGoalMutation.isPending}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* PENALTIES TAB */}
          <TabsContent
            value="penalties"
            forceMount
            className="space-y-4 mt-4 lg:mt-0 data-[state=inactive]:hidden lg:data-[state=inactive]:block"
          >
            <h3 className="hidden lg:block text-sm font-bold uppercase tracking-wide text-red-700 dark:text-red-400 mb-2">
              🚫 Sanciones
            </h3>
            <div className="space-y-3 p-3 lg:p-4 border rounded-lg">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs lg:text-base font-extrabold underline underline-offset-2">Equipo</label>
                  <Select value={penTeamId} onValueChange={handlePenTeamChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Equipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {homeTeam && <SelectItem value={homeTeam.team_id}>{homeTeam.teams?.name} (Local)</SelectItem>}
                      {awayTeam && <SelectItem value={awayTeam.team_id}>{awayTeam.teams?.name} (Visitante)</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs lg:text-base font-extrabold underline underline-offset-2">Periodo</label>
                  <Select value={penPeriod} onValueChange={setPenPeriod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PERIODS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs lg:text-base font-extrabold underline underline-offset-2">Jugador</label>
                <Select value={penPlayerId} onValueChange={setPenPlayerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar jugador" />
                  </SelectTrigger>
                  <SelectContent>
                    {penTeamId &&
                      playersForTeam(penTeamId).map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs lg:text-base font-extrabold underline underline-offset-2">Tipo de Sanción</label>
                <Select value={penCode} onValueChange={setPenCode}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar sanción" />
                  </SelectTrigger>
                  <SelectContent>
                    {PENALTY_CODES.map((p) => (
                      <SelectItem key={p.code} value={p.code}>
                        {p.code}: {p.desc}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs lg:text-base font-extrabold underline underline-offset-2">Tiempo del partido (mm:ss)</label>
                  {clockEnabled && clockMatch && (
                    <button
                      type="button"
                      className="text-[11px] text-primary underline underline-offset-2"
                      onClick={() => {
                        setPenMatchTimeTouched(false);
                        setPenMatchTime(formatClock(remainingMs(clockMatch)));
                      }}
                    >
                      Usar tiempo del reloj
                    </button>
                  )}
                </div>
                <Input
                  value={penMatchTime}
                  onChange={(e) => {
                    setPenMatchTimeTouched(true);
                    setPenMatchTime(e.target.value);
                  }}
                  placeholder="00:00"
                  className="w-[100px]"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs lg:text-base font-extrabold underline underline-offset-2">Duración Sanción</label>
                  <Select value={penTimePreset} onValueChange={setPenTimePreset}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PENALTY_TIMES.map((t) => (
                        <SelectItem key={t.label} value={t.label}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {penTimePreset === "Manual" && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Minutos</label>
                    <Input
                      type="number"
                      value={penTimeManual}
                      onChange={(e) => setPenTimeManual(e.target.value)}
                      placeholder="2"
                    />
                  </div>
                )}
              </div>
              {clockEnabled && clockRunning && (
                <p className="text-xs text-destructive font-medium">
                  Pausá el reloj para registrar la sanción — el timer de la penalidad arranca junto con el reloj principal.
                </p>
              )}
              <Button
                onClick={() => addPenaltyMutation.mutate()}
                disabled={
                  !penTeamId ||
                  !penCode ||
                  addPenaltyMutation.isPending ||
                  (clockEnabled && clockRunning)
                }
                className="w-full gap-1 lg:h-11 lg:text-base"
              >
                <Plus className="h-4 w-4" /> Registrar Sanción
              </Button>
            </div>

            {/* Listed penalties */}
            <div className="space-y-2">
              {penalties.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm">
                  <div>
                    <span className="font-medium">{teamName(p.team_id)}</span>
                    {" — "}
                    {jerseyByPlayerTeam(p.player_id, p.team_id) ? `#${jerseyByPlayerTeam(p.player_id, p.team_id)} ` : ""}{p.player?.first_name} {p.player?.last_name}
                    <span className="text-muted-foreground ml-2">
                      {p.penalty_code} · P{p.period}{p.penalty_time ? ` · ${p.penalty_time}` : ""}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-destructive"
                    onClick={() => deletePenaltyMutation.mutate(p.id)}
                    disabled={deletePenaltyMutation.isPending}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>

          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

/**
 * Panel con las sanciones que están corriendo ahora mismo (según el mismo
 * cálculo penaltyRemainingMs que usa la página pública), con un botón para
 * terminarlas antes de tiempo. Solo muestra las que todavía tienen tiempo
 * restante — una sanción que ya se cumplió sola desaparece de esta lista.
 */
/**
 * "Penalty box" estilo Legends: dorsal grande + timer corriendo, atada al
 * reloj principal (se pausa/reanuda con él, cruza de período si hace falta).
 * No se muestra si ya se cumplió o si un árbitro ya la terminó (ended_early).
 */
function PenaltyBox({
  penalty,
  clockMatch,
  teamName,
  isHome,
  clockRunning,
  onEnd,
  ending,
}: {
  penalty: any;
  clockMatch: any;
  teamName: (teamId: string) => string;
  isHome: boolean;
  clockRunning: boolean;
  onEnd: (id: string) => void;
  ending: boolean;
}) {
  const remaining = usePenaltyClock(clockMatch, penalty);
  if (!remaining) return null;
  // Local en amarillo/dorado, visitante en rojo oscuro — para distinguir de un
  // vistazo de qué lado viene cada sanción cuando hay varias a la vez.
  const palette = isHome
    ? {
        border: "border-amber-500",
        bg: "bg-amber-50 dark:bg-amber-950/40",
        text: "text-amber-700 dark:text-amber-400",
        badge: "bg-amber-500",
      }
    : {
        border: "border-red-800",
        bg: "bg-red-50 dark:bg-red-950/40",
        text: "text-red-800 dark:text-red-400",
        badge: "bg-red-800",
      };
  // Terminar la sanción a mano exige el mismo estado que ya se necesita para
  // registrar goles/sanciones: reloj pausado. Así el momento real ("hubo un
  // gol, se pausa, se corrige lo que haga falta") es el único en que se puede tocar.
  const canEnd = !clockRunning;
  return (
    <div
      className={`relative flex flex-col items-center justify-center gap-0.5 rounded-lg border-2 ${palette.border} ${palette.bg} px-3 py-2 lg:px-5 lg:py-4 min-w-[76px] lg:min-w-[110px]`}
    >
      <button
        type="button"
        onClick={() => canEnd && onEnd(penalty.id)}
        disabled={!canEnd || ending}
        title={canEnd ? "Terminar sanción (p.ej. gol en power play)" : "Pausá el reloj para terminar la sanción"}
        className={`absolute -top-2 -right-2 flex h-5 w-5 lg:h-6 lg:w-6 items-center justify-center rounded-full text-white text-xs lg:text-sm leading-none shadow disabled:opacity-40 disabled:cursor-not-allowed ${palette.badge}`}
      >
        ×
      </button>
      <span className={`text-xs lg:text-sm font-semibold ${palette.text} truncate max-w-[70px] lg:max-w-[100px]`}>
        {teamName(penalty.team_id)}
      </span>
      <span className={`font-display text-base lg:text-xl font-bold ${palette.text} leading-none`}>
        {penalty.resolvedJersey ? `#${penalty.resolvedJersey}` : "—"}
      </span>
      <span className={`font-display text-sm lg:text-lg font-bold tabular-nums ${palette.text} leading-none`}>
        {remaining}
      </span>
    </div>
  );
}
