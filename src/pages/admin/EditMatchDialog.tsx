import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { bogotaInputToUTC, utcToBogotaInput } from "@/lib/timezone";
import { Constants } from "@/integrations/supabase/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  match: any;
}

const phaseLabels: Record<string, string> = {
  regular: "Regular",
  playoff: "Playoff",
  final: "Final",
  third_place: "Tercer puesto",
  ranking: "Ranking",
};

const statusLabels: Record<string, string> = {
  scheduled: "Programado",
  in_progress: "En juego",
  closed: "Finalizado",
};

export default function EditMatchDialog({ open, onOpenChange, match }: Props) {
  const queryClient = useQueryClient();

  const home = match?.match_teams?.find((mt: any) => mt.side === "home");
  const away = match?.match_teams?.find((mt: any) => mt.side === "away");

  const [phase, setPhase] = useState(match?.phase ?? "regular");
  const [matchDate, setMatchDate] = useState("");
  const [venue, setVenue] = useState(match?.venue ?? "");
  const [roundNumber, setRoundNumber] = useState(match?.round_number?.toString() ?? "");
  const [status, setStatus] = useState(match?.status ?? "scheduled");
  const [notes, setNotes] = useState(match?.notes ?? "");
  const [homeTeamId, setHomeTeamId] = useState(home?.team_id ?? "");
  const [awayTeamId, setAwayTeamId] = useState(away?.team_id ?? "");

  const categoryId = match?.categories ? (match as any).category_id ?? match.categories?.id : "";

  useEffect(() => {
    if (match && open) {
      setPhase(match.phase ?? "regular");
      setMatchDate(utcToBogotaInput(match.match_date));
      setVenue(match.venue ?? "");
      setRoundNumber(match.round_number?.toString() ?? "");
      setStatus(match.status ?? "scheduled");
      setNotes(match.notes ?? "");
      const h = match.match_teams?.find((mt: any) => mt.side === "home");
      const a = match.match_teams?.find((mt: any) => mt.side === "away");
      setHomeTeamId(h?.team_id ?? "");
      setAwayTeamId(a?.team_id ?? "");
    }
  }, [match, open]);

  const { data: teams = [] } = useQuery({
    queryKey: ["admin-teams"],
    queryFn: async () => {
      const { data } = await supabase.from("teams").select("id, name, category_id").order("name");
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Get category_id from the match
  const matchCategoryId = useMemo(() => {
    if (!match) return "";
    // The match query joins categories, so we need the category's id
    // It's stored as match.categories.id or we can look it up
    return (match as any).categories?.id ?? categoryId;
  }, [match, categoryId]);

  const filteredTeams = useMemo(
    () => (matchCategoryId ? teams.filter((t) => t.category_id === matchCategoryId) : []),
    [teams, matchCategoryId]
  );

  // Check if match has goals or penalties (prevents team changes)
  const hasEvents = useMemo(() => {
    const h = match?.match_teams?.find((mt: any) => mt.side === "home");
    const a = match?.match_teams?.find((mt: any) => mt.side === "away");
    return (h?.score_regular > 0 || a?.score_regular > 0);
  }, [match]);

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!match) return;

      const { error: matchErr } = await supabase
        .from("matches")
        .update({
          phase: phase as any,
          status: status as any,
          match_date: matchDate ? bogotaInputToUTC(matchDate) : null,
          venue: venue || null,
          round_number: roundNumber ? parseInt(roundNumber) : null,
          notes: notes || null,
        })
        .eq("id", match.id);
      if (matchErr) throw matchErr;

      // Update teams if changed and no events
      const origHome = match.match_teams?.find((mt: any) => mt.side === "home");
      const origAway = match.match_teams?.find((mt: any) => mt.side === "away");
      const teamsChanged = origHome?.team_id !== homeTeamId || origAway?.team_id !== awayTeamId;

      if (teamsChanged && !hasEvents) {
        // Delete old match_teams and insert new
        const { error: delErr } = await supabase.from("match_teams").delete().eq("match_id", match.id);
        if (delErr) throw delErr;

        const { error: insErr } = await supabase.from("match_teams").insert([
          { match_id: match.id, team_id: homeTeamId, side: "home", score_regular: 0 },
          { match_id: match.id, team_id: awayTeamId, side: "away", score_regular: 0 },
        ]);
        if (insErr) throw insErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-matches"] });
      toast({ title: "Partido actualizado" });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast({ title: "Error al editar", description: err.message, variant: "destructive" });
    },
  });

  if (!match) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Partido</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-2 bg-muted rounded text-sm">
            <span className="font-medium">{match.categories?.divisions?.name}</span> → <span>{match.categories?.name}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Equipo Local</Label>
              <Select value={homeTeamId} onValueChange={setHomeTeamId} disabled={hasEvents}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {filteredTeams.filter((t) => t.id !== awayTeamId).map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hasEvents && <p className="text-xs text-muted-foreground">No editable (tiene eventos)</p>}
            </div>
            <div className="space-y-1">
              <Label>Equipo Visitante</Label>
              <Select value={awayTeamId} onValueChange={setAwayTeamId} disabled={hasEvents}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {filteredTeams.filter((t) => t.id !== homeTeamId).map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Fase</Label>
              <Select value={phase} onValueChange={setPhase}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Constants.public.Enums.match_phase.map((p) => (
                    <SelectItem key={p} value={p}>{phaseLabels[p] ?? p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Estado</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["scheduled", "in_progress", "closed"].map((s) => (
                    <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Fecha y Hora (Bogotá)</Label>
              <Input type="datetime-local" value={matchDate} onChange={(e) => setMatchDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Ronda</Label>
              <Input type="number" min={1} value={roundNumber} onChange={(e) => setRoundNumber(e.target.value)} placeholder="Opcional" />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Cancha / Venue</Label>
            <Input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Ej: Cancha 1" />
          </div>

          <div className="space-y-1">
            <Label>Notas</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => editMutation.mutate()} disabled={editMutation.isPending || !homeTeamId || !awayTeamId}>
            {editMutation.isPending ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
