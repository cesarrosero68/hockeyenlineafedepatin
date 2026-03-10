import { useState, useMemo } from "react";
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
import { bogotaInputToUTC } from "@/lib/timezone";
import { Constants } from "@/integrations/supabase/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

export default function CreateMatchDialog({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const [divisionId, setDivisionId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [phase, setPhase] = useState<string>("regular");
  const [homeTeamId, setHomeTeamId] = useState("");
  const [awayTeamId, setAwayTeamId] = useState("");
  const [matchDate, setMatchDate] = useState("");
  const [venue, setVenue] = useState("");
  const [roundNumber, setRoundNumber] = useState("");
  const [status, setStatus] = useState<string>("scheduled");
  const [notes, setNotes] = useState("");

  const { data: divisions = [] } = useQuery({
    queryKey: ["admin-divisions"],
    queryFn: async () => {
      const { data } = await supabase.from("divisions").select("id, name").order("name");
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id, name, division_id").order("sort_order");
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ["admin-teams"],
    queryFn: async () => {
      const { data } = await supabase.from("teams").select("id, name, category_id").order("name");
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const filteredCategories = useMemo(
    () => (divisionId ? categories.filter((c) => c.division_id === divisionId) : categories),
    [categories, divisionId]
  );

  const filteredTeams = useMemo(
    () => (categoryId ? teams.filter((t) => t.category_id === categoryId) : []),
    [teams, categoryId]
  );

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!categoryId || !homeTeamId || !awayTeamId) throw new Error("Faltan campos obligatorios");
      if (homeTeamId === awayTeamId) throw new Error("Los equipos deben ser diferentes");

      const matchPayload: any = {
        category_id: categoryId,
        phase,
        status,
        match_date: matchDate ? bogotaInputToUTC(matchDate) : null,
        venue: venue || null,
        round_number: roundNumber ? parseInt(roundNumber) : null,
        notes: notes || null,
      };

      const { data: matchData, error: matchErr } = await supabase
        .from("matches")
        .insert(matchPayload)
        .select("id")
        .single();
      if (matchErr) throw matchErr;

      const { error: mtErr } = await supabase.from("match_teams").insert([
        { match_id: matchData.id, team_id: homeTeamId, side: "home", score_regular: 0 },
        { match_id: matchData.id, team_id: awayTeamId, side: "away", score_regular: 0 },
      ]);
      if (mtErr) throw mtErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-matches"] });
      toast({ title: "Partido creado exitosamente" });
      resetForm();
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast({ title: "Error al crear partido", description: err.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setDivisionId("");
    setCategoryId("");
    setPhase("regular");
    setHomeTeamId("");
    setAwayTeamId("");
    setMatchDate("");
    setVenue("");
    setRoundNumber("");
    setStatus("scheduled");
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Partido</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>División</Label>
              <Select value={divisionId} onValueChange={(v) => { setDivisionId(v); setCategoryId(""); setHomeTeamId(""); setAwayTeamId(""); }}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  {divisions.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Categoría *</Label>
              <Select value={categoryId} onValueChange={(v) => { setCategoryId(v); setHomeTeamId(""); setAwayTeamId(""); }}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  {filteredCategories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Equipo Local *</Label>
              <Select value={homeTeamId} onValueChange={setHomeTeamId} disabled={!categoryId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  {filteredTeams.filter((t) => t.id !== awayTeamId).map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Equipo Visitante *</Label>
              <Select value={awayTeamId} onValueChange={setAwayTeamId} disabled={!categoryId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
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
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !categoryId || !homeTeamId || !awayTeamId}>
            {createMutation.isPending ? "Creando..." : "Crear Partido"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
