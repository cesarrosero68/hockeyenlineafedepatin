import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const PENALTY_CODES = [
  { code: "BC", desc: "BODY CHECKING" }, { code: "BDG", desc: "BOARDING" },
  { code: "BE", desc: "BUTT ENDING" }, { code: "BP", desc: "BENCH PENALTY" },
  { code: "BS", desc: "BROKEN STICK" }, { code: "CC", desc: "CROSS CHECKING" },
  { code: "CFB", desc: "CC FROM BEHIND" }, { code: "CH", desc: "CHARGING" },
  { code: "DG", desc: "DELAY OF GAME" }, { code: "ELB", desc: "ELBOWING" },
  { code: "FI", desc: "FIGHTING" }, { code: "FOP", desc: "FALLING ON PUCK" },
  { code: "FOV", desc: "FACE OFF VIOL." }, { code: "GE", desc: "GAME EJECTION" },
  { code: "GM", desc: "GAME MISSCONDUCT" }, { code: "HKG", desc: "HOOKING" },
  { code: "HO", desc: "HOLDING" }, { code: "HP", desc: "HAND PASS" },
  { code: "HS", desc: "HIGH STICK" }, { code: "IE", desc: "ILLEGAL EQUIPMENT" },
  { code: "INT", desc: "INTERFERENCE" }, { code: "INTG", desc: "INT. OF GOALTENDER" },
  { code: "KNE", desc: "KNEEING" }, { code: "MP", desc: "MATCH PENALTY" },
  { code: "MSC", desc: "MISSCONDUCT" }, { code: "OA", desc: "OFFICIAL ABUSE" },
  { code: "PS", desc: "PENALTY SHOOT" }, { code: "RO", desc: "ROUGHING" },
  { code: "SL", desc: "SLASHING" }, { code: "SP", desc: "SPEARING" },
  { code: "TMM", desc: "TOO MANY MEN" }, { code: "TR", desc: "TRIPPING" },
  { code: "USC", desc: "UNSPORTSMANLIKE" },
];

const PENALTY_TIMES = [
  { label: "1:30", minutes: 2 },
  { label: "4:00", minutes: 4 },
  { label: "10:00", minutes: 10 },
  { label: "Manual", minutes: 0 },
];

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

  // Goal form state
  const [goalTeamId, setGoalTeamId] = useState("");
  const [goalScorerId, setGoalScorerId] = useState("");
  const [goalAssistId, setGoalAssistId] = useState("");
  const [goalTime, setGoalTime] = useState("");
  const [goalPeriod, setGoalPeriod] = useState("1");

  // Penalty form state
  const [penTeamId, setPenTeamId] = useState("");
  const [penPlayerId, setPenPlayerId] = useState("");
  const [penCode, setPenCode] = useState("");
  const [penTimePreset, setPenTimePreset] = useState("1:30");
  const [penTimeManual, setPenTimeManual] = useState("");
  const [penPeriod, setPenPeriod] = useState("1");
  const [penMatchTime, setPenMatchTime] = useState("");

  const isValidMatchTime = useCallback((v: string) => /^\d{2}:\d{2}$/.test(v), []);

  // Self-contained match data fetch — isolated from parent
  const { data: matchData } = useQuery({
    queryKey: ["live-match-detail", matchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select(`
          id, match_date, status, phase, category_id,
          match_teams(side, score_regular, score_extra, team_id, teams!inner(id, name))
        `)
        .eq("id", matchId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: open && !!matchId,
    staleTime: 30_000,
  });

  const homeTeam = matchData?.match_teams?.find((mt: any) => mt.side === "home");
  const awayTeam = matchData?.match_teams?.find((mt: any) => mt.side === "away");
  const teamIds = useMemo(() => [homeTeam?.team_id, awayTeam?.team_id].filter(Boolean) as string[], [homeTeam, awayTeam]);

  // Fetch rosters for both teams
  const { data: rosters = [] } = useQuery({
    queryKey: ["live-match-rosters", matchId, teamIds.join(",")],
    queryFn: async () => {
      if (teamIds.length === 0) return [];
      const { data, error } = await supabase
        .from("rosters")
        .select("id, jersey_number, position, team_id, player_id, players!rosters_player_id_fkey(id, first_name, last_name)")
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
        .select("*, scorer:players!goal_events_scorer_player_id_fkey(first_name, last_name), assist:players!goal_events_assist_player_id_fkey(first_name, last_name)")
        .eq("match_id", matchId)
        .order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: open && !!matchId,
    staleTime: 10_000,
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
  });

  const playersForTeam = useCallback((teamId: string) =>
    rosters.filter((r: any) => r.team_id === teamId).map((r: any) => ({
      id: r.players?.id ?? r.player_id,
      label: `#${r.jersey_number ?? "?"} ${r.players?.first_name ?? ""} ${r.players?.last_name ?? ""}`,
    })), [rosters]);

  const teamName = useCallback((teamId: string) => {
    if (teamId === homeTeam?.team_id) return homeTeam?.teams?.name ?? "Local";
    if (teamId === awayTeam?.team_id) return awayTeam?.teams?.name ?? "Visitante";
    return "—";
  }, [homeTeam, awayTeam]);

  // Invalidate only the panel's own queries — let realtime handle the admin-matches list
  const invalidatePanelQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["match-goals", matchId] });
    queryClient.invalidateQueries({ queryKey: ["live-match-detail", matchId] });
  }, [queryClient, matchId]);

  // Add goal mutation
  const addGoalMutation = useMutation({
    mutationFn: async () => {
      if (!matchId) throw new Error("No match");
      const isOT = goalPeriod === "3";
      if (goalTime && !isValidMatchTime(goalTime)) {
        throw new Error("Formato de tiempo inválido. Use mm:ss (ej: 05:32)");
      }
      // Insert goal
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

      // Update scores in a single batch — fetch goals first
      const { data: allGoals } = await supabase
        .from("goal_events")
        .select("team_id")
        .eq("match_id", matchId)
        .eq("is_shootout", false);

      const homeGoals = allGoals?.filter(g => g.team_id === homeTeam?.team_id).length ?? 0;
      const awayGoals = allGoals?.filter(g => g.team_id === awayTeam?.team_id).length ?? 0;

      // Update both scores in parallel
      await Promise.all([
        homeTeam ? supabase.from("match_teams").update({ score_regular: homeGoals }).eq("match_id", matchId).eq("side", "home") : null,
        awayTeam ? supabase.from("match_teams").update({ score_regular: awayGoals }).eq("match_id", matchId).eq("side", "away") : null,
      ].filter(Boolean));
    },
    onSuccess: () => {
      invalidatePanelQueries();
      setGoalScorerId(""); setGoalAssistId(""); setGoalTime("");
      toast({ title: "Gol registrado" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Delete goal mutation
  const deleteGoalMutation = useMutation({
    mutationFn: async (goalId: string) => {
      const { error } = await supabase.from("goal_events").delete().eq("id", goalId);
      if (error) throw error;
      const { data: allGoals } = await supabase
        .from("goal_events").select("team_id").eq("match_id", matchId!).eq("is_shootout", false);
      const homeGoals = allGoals?.filter(g => g.team_id === homeTeam?.team_id).length ?? 0;
      const awayGoals = allGoals?.filter(g => g.team_id === awayTeam?.team_id).length ?? 0;
      await Promise.all([
        homeTeam ? supabase.from("match_teams").update({ score_regular: homeGoals }).eq("match_id", matchId!).eq("side", "home") : null,
        awayTeam ? supabase.from("match_teams").update({ score_regular: awayGoals }).eq("match_id", matchId!).eq("side", "away") : null,
      ].filter(Boolean));
    },
    onSuccess: () => {
      invalidatePanelQueries();
      toast({ title: "Gol eliminado" });
    },
  });

  // Add penalty mutation
  const addPenaltyMutation = useMutation({
    mutationFn: async () => {
      if (!matchId) throw new Error("No match");
      const selectedPenalty = PENALTY_CODES.find(p => p.code === penCode);
      const preset = PENALTY_TIMES.find(t => t.label === penTimePreset);
      const minutes = penTimePreset === "Manual" ? (parseInt(penTimeManual) || 2) : (preset?.minutes ?? 2);

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match-penalties", matchId] });
      setPenPlayerId(""); setPenCode(""); setPenTimePreset("1:30"); setPenTimeManual(""); setPenMatchTime("");
      toast({ title: "Sanción registrada" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deletePenaltyMutation = useMutation({
    mutationFn: async (penId: string) => {
      const { error } = await supabase.from("penalties").delete().eq("id", penId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match-penalties", matchId] });
      toast({ title: "Sanción eliminada" });
    },
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-lg">
            {homeTeam?.teams?.name ?? "Local"} vs {awayTeam?.teams?.name ?? "Visitante"}
          </SheetTitle>
          <p className="text-sm text-muted-foreground">
            Marcador: {homeTeam?.score_regular ?? 0} - {awayTeam?.score_regular ?? 0}
          </p>
        </SheetHeader>

        <Tabs defaultValue="goals" className="mt-4">
          <TabsList className="w-full">
            <TabsTrigger value="goals" className="flex-1">Goles ({goals.length})</TabsTrigger>
            <TabsTrigger value="penalties" className="flex-1">Sanciones ({penalties.length})</TabsTrigger>
          </TabsList>

          {/* GOALS TAB */}
          <TabsContent value="goals" className="space-y-4 mt-4">
            <div className="space-y-3 p-3 border rounded-lg">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Equipo</label>
                  <Select value={goalTeamId} onValueChange={setGoalTeamId}>
                    <SelectTrigger><SelectValue placeholder="Equipo" /></SelectTrigger>
                    <SelectContent>
                      {homeTeam && <SelectItem value={homeTeam.team_id}>{homeTeam.teams?.name} (Local)</SelectItem>}
                      {awayTeam && <SelectItem value={awayTeam.team_id}>{awayTeam.teams?.name} (Visitante)</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Periodo</label>
                  <Select value={goalPeriod} onValueChange={setGoalPeriod}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PERIODS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Goleador</label>
                <Select value={goalScorerId} onValueChange={setGoalScorerId}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar jugador" /></SelectTrigger>
                  <SelectContent>
                    {goalTeamId && playersForTeam(goalTeamId).map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Asistencia</label>
                <Select value={goalAssistId} onValueChange={setGoalAssistId}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar jugador" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="na">N/A</SelectItem>
                    {goalTeamId && playersForTeam(goalTeamId).map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Tiempo (mm:ss)</label>
                <Input value={goalTime} onChange={e => setGoalTime(e.target.value)} placeholder="00:00" className="w-[100px]" />
              </div>
              <Button onClick={() => addGoalMutation.mutate()} disabled={!goalTeamId || !goalScorerId || addGoalMutation.isPending} className="w-full gap-1">
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
                    {g.scorer?.first_name} {g.scorer?.last_name}
                    {g.assist && <span className="text-muted-foreground"> (Asist: {g.assist.first_name} {g.assist.last_name})</span>}
                    <span className="text-muted-foreground ml-2">{PERIODS.find(p => p.value === String(g.period))?.label} {g.game_time ?? ""}</span>
                  </div>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteGoalMutation.mutate(g.id)} disabled={deleteGoalMutation.isPending}><Trash2 className="h-3 w-3" /></Button>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* PENALTIES TAB */}
          <TabsContent value="penalties" className="space-y-4 mt-4">
            <div className="space-y-3 p-3 border rounded-lg">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Equipo</label>
                  <Select value={penTeamId} onValueChange={setPenTeamId}>
                    <SelectTrigger><SelectValue placeholder="Equipo" /></SelectTrigger>
                    <SelectContent>
                      {homeTeam && <SelectItem value={homeTeam.team_id}>{homeTeam.teams?.name} (Local)</SelectItem>}
                      {awayTeam && <SelectItem value={awayTeam.team_id}>{awayTeam.teams?.name} (Visitante)</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Periodo</label>
                  <Select value={penPeriod} onValueChange={setPenPeriod}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PERIODS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Jugador</label>
                <Select value={penPlayerId} onValueChange={setPenPlayerId}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar jugador" /></SelectTrigger>
                  <SelectContent>
                    {penTeamId && playersForTeam(penTeamId).map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Tipo de Sanción</label>
                <Select value={penCode} onValueChange={setPenCode}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar sanción" /></SelectTrigger>
                  <SelectContent>
                    {PENALTY_CODES.map(p => <SelectItem key={p.code} value={p.code}>{p.code}: {p.desc}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Tiempo del partido (mm:ss)</label>
                <Input value={penMatchTime} onChange={e => setPenMatchTime(e.target.value)} placeholder="00:00" className="w-[100px]" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Duración Sanción</label>
                  <Select value={penTimePreset} onValueChange={setPenTimePreset}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PENALTY_TIMES.map(t => <SelectItem key={t.label} value={t.label}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {penTimePreset === "Manual" && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Minutos</label>
                    <Input type="number" value={penTimeManual} onChange={e => setPenTimeManual(e.target.value)} placeholder="2" />
                  </div>
                )}
              </div>
              <Button onClick={() => addPenaltyMutation.mutate()} disabled={!penTeamId || !penCode || addPenaltyMutation.isPending} className="w-full gap-1">
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
                    {p.player?.first_name} {p.player?.last_name}
                    <span className="text-muted-foreground ml-2">{p.penalty_code} ({p.game_time})</span>
                  </div>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => deletePenaltyMutation.mutate(p.id)} disabled={deletePenaltyMutation.isPending}><Trash2 className="h-3 w-3" /></Button>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
