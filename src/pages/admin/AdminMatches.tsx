import { utils, writeFile } from "xlsx";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, Lock, CheckCircle, AlertTriangle, Pencil, Save, X, Play, Plus, Trash2, CalendarDays, List, Download } from "lucide-react";
import { formatBogota, utcToBogotaInput, bogotaInputToUTC } from "@/lib/timezone";
import { toast } from "@/hooks/use-toast";
import MatchLivePanel from "./MatchLivePanel";
import CreateMatchDialog from "./CreateMatchDialog";
import EditMatchDialog from "./EditMatchDialog";
import AdminScheduleCalendar from "./AdminScheduleCalendar";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const statusLabels: Record<string, string> = {
  scheduled: "Programado",
  in_progress: "En juego",
  postponed: "Aplazado",
  closed: "Finalizado",
  locked: "Bloqueado",
  to_be_defined: "Por definir",
};

export default function AdminMatches() {
  const queryClient = useQueryClient();
  const [editingDateId, setEditingDateId] = useState<string | null>(null);
  const [editDateValue, setEditDateValue] = useState("");
  const [filterDivision, setFilterDivision] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [liveMatchId, setLiveMatchId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editMatch, setEditMatch] = useState<any>(null);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [filterDate, setFilterDate] = useState<string>("all");

  const { data: activeTournament } = useQuery({
    queryKey: ["admin-active-tournament"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("tournaments")
        .select("id, name")
        .eq("status", "active")
        .maybeSingle();
      return data as { id: string; name: string } | null;
    },
  });
  const activeTournamentId = activeTournament?.id;

  const { data: divisions = [] } = useQuery({
    queryKey: ["admin-divisions", activeTournamentId],
    queryFn: async () => {
      let q: any = supabase.from("divisions").select("id, name").order("name");
      if (activeTournamentId) q = q.eq("tournament_id", activeTournamentId);
      const { data } = await q;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: matches, isLoading } = useQuery({
    queryKey: ["admin-matches", activeTournamentId],
    enabled: !!activeTournamentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select(`
          id, match_date, status, phase, round_number, venue, notes, category_id, tournament_id,
          categories!inner(id, name, division_id, divisions!inner(id, name)),
          match_teams(side, score_regular, score_extra, team_id, teams!inner(name))
        `)
        .eq("tournament_id", activeTournamentId as string)
        .order("match_date", { ascending: true });
      if (error) throw error;
      return data;
    },
    staleTime: 30_000,
  });

  const availableDates = useMemo(() => {
    if (!matches) return [];
    const dates = new Set<string>();
    matches.forEach((m: any) => {
      if (m.match_date) {
        dates.add(m.match_date.slice(0, 10));
      }
    });
    return Array.from(dates).sort();
  }, [matches]);

  const filteredMatches = useMemo(() => {
    if (!matches) return [];
    return matches.filter((m: any) => {
      if (filterDivision !== "all" && m.categories?.divisions?.id !== filterDivision) return false;
      if (filterStatus !== "all" && m.status !== filterStatus) return false;
      if (filterDate === "accumulated") {
        const today = new Date().toISOString().slice(0, 10);
        const matchDay = m.match_date ? m.match_date.slice(0, 10) : null;
        if (!matchDay || matchDay > today) return false;
      } else if (filterDate !== "all") {
        const matchDay = m.match_date ? m.match_date.slice(0, 10) : null;
        if (matchDay !== filterDate) return false;
      }
      return true;
    }).sort((a: any, b: any) => {
      // Arriba: en juego y próximos (el más cercano primero). Abajo: ya jugados (el más reciente primero).
      const played = (m: any) => (m.status === "closed" || m.status === "locked" ? 1 : 0);
      if (played(a) !== played(b)) return played(a) - played(b);
      const ta = a.match_date ? new Date(a.match_date).getTime() : Infinity;
      const tb = b.match_date ? new Date(b.match_date).getTime() : Infinity;
      if (!played(a)) {
        if ((a.status === "in_progress") !== (b.status === "in_progress")) return a.status === "in_progress" ? -1 : 1;
        return ta - tb;
      }
      return tb - ta;
    });
  }, [matches, filterDivision, filterStatus, filterDate]);

  // Secciones de la lista: En juego / Próximos / Jugados, cada una agrupada por día (hora Bogotá).
  const sections = useMemo(() => {
    const dayKey = (m: any) => (m.match_date ? formatBogota(m.match_date, "yyyy-MM-dd") : "sin-fecha");
    const time = (m: any) => (m.match_date ? new Date(m.match_date).getTime() : Infinity);
    const build = (list: any[]) => {
      const sorted = [...list].sort((a, b) => time(a) - time(b));
      const groups: { key: string; label: string; items: any[] }[] = [];
      for (const m of sorted) {
        const key = dayKey(m);
        let g = groups[groups.length - 1];
        if (!g || g.key !== key) {
          const raw = key === "sin-fecha" ? "Sin fecha asignada" : formatBogota(m.match_date, "EEEE d 'de' MMMM yyyy");
          g = { key, label: raw.charAt(0).toUpperCase() + raw.slice(1), items: [] };
          groups.push(g);
        }
        g.items.push(m);
      }
      return groups;
    };
    const isPlayed = (m: any) => m.status === "closed" || m.status === "locked";
    return [
      { id: "live", title: "En juego ahora", groups: build(filteredMatches.filter((m: any) => m.status === "in_progress")) },
      { id: "next", title: "Próximos partidos", groups: build(filteredMatches.filter((m: any) => m.status !== "in_progress" && !isPlayed(m))) },
      { id: "done", title: "Partidos jugados", groups: build(filteredMatches.filter(isPlayed)) },
    ].filter((sec) => sec.groups.length > 0);
  }, [filteredMatches]);

  const updateDateMutation = useMutation({
    mutationFn: async ({ matchId, date }: { matchId: string; date: string }) => {
      const utcDate = date ? bogotaInputToUTC(date) : null;
      const { error } = await supabase.from("matches").update({ match_date: utcDate }).eq("id", matchId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-matches"] });
      setEditingDateId(null);
      toast({ title: "Fecha actualizada" });
    },
    onError: (err: Error) => {
      toast({ title: "Error al actualizar fecha", description: err.message, variant: "destructive" });
    },
  });

  const closeMatchMutation = useMutation({
    mutationFn: async (matchId: string) => {
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
          throw new Error(`Goles registrados del local (${homeGoals}) no coinciden con el marcador (${homeTeam.score_regular})`);
        }
        if (awayGoals !== awayTeam.score_regular) {
          throw new Error(`Goles registrados del visitante (${awayGoals}) no coinciden con el marcador (${awayTeam.score_regular})`);
        }
      }

      const { error } = await supabase.from("matches").update({ status: "closed" as const }).eq("id", matchId);
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
      const { error } = await supabase.from("matches").update({ status: "locked" as const }).eq("id", matchId);
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
      const { error } = await supabase.from("matches").update({ status: "in_progress" as const }).eq("id", matchId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-matches"] });
      toast({ title: "Partido iniciado" });
    },
  });

  const deleteMatchMutation = useMutation({
    mutationFn: async (matchId: string) => {
      const { error } = await supabase.rpc("delete_match_and_recalc", { p_match_id: matchId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-matches"] });
      toast({ title: "Partido eliminado" });
    },
    onError: (err: Error) => {
      toast({ title: "Error al eliminar", description: err.message, variant: "destructive" });
    },
  });

  const startEditingDate = (matchId: string, currentDate: string | null) => {
    setEditingDateId(matchId);
    setEditDateValue(utcToBogotaInput(currentDate));
  };

  const downloadExcel = async () => {
    const matchRows = filteredMatches.map((m: any) => {
      const home = m.match_teams?.find((mt: any) => mt.side === "home");
      const away = m.match_teams?.find((mt: any) => mt.side === "away");
      return {
        Fecha: m.match_date ? formatBogota(m.match_date, "d MMM yyyy, h:mm a") : "Sin fecha",
        División: m.categories?.divisions?.name ?? "",
        Categoría: m.categories?.name ?? "",
        Local: home?.teams?.name ?? "TBD",
        "Goles Local": home?.score_regular ?? 0,
        "Goles Visitante": away?.score_regular ?? 0,
        Visitante: away?.teams?.name ?? "TBD",
        Estado: statusLabels[m.status] ?? m.status,
      };
    });

    const matchIds = filteredMatches.map((m: any) => m.id);
    if (matchIds.length === 0) return;

    const { data: goalsData } = await supabase
      .from("goal_events")
      .select(`id, period, game_time, match_id, team_id, scorer_player_id, assist_player_id,
        scorer:players_public!goal_events_scorer_player_id_fkey(first_name, last_name),
        assist:players_public!goal_events_assist_player_id_fkey(first_name, last_name)`)
      .in("match_id", matchIds)
      .order("match_id").order("period").order("game_time");

    const { data: penaltiesData } = await supabase
      .from("penalties")
      .select(`id, period, game_time, penalty_code, penalty_description, penalty_minutes, penalty_time, match_id, team_id, player_id,
        player:players_public!penalties_player_id_fkey(first_name, last_name)`)
      .in("match_id", matchIds)
      .order("match_id").order("period").order("game_time");

    // Dorsal correcto POR EDICIÓN: se busca en rosters (jugador + equipo de esta edición),
    // nunca en el catálogo global de players, que puede traer el número de otro torneo.
    const exportTeamIds = Array.from(
      new Set(
        filteredMatches.flatMap((m: any) =>
          (m.match_teams ?? []).map((mt: any) => mt.team_id).filter(Boolean),
        ),
      ),
    );

    const { data: rostersData } = exportTeamIds.length
      ? await supabase
          .from("rosters")
          .select("player_id, team_id, jersey_number")
          .in("team_id", exportTeamIds)
      : { data: [] as any[] };

    const jerseyByPlayerTeam = (playerId: string | null | undefined, teamId: string | null | undefined) => {
      if (!playerId || !rostersData) return "";
      const r = (rostersData as any[]).find(
        (x) => x.player_id === playerId && (!teamId || x.team_id === teamId),
      );
      return r?.jersey_number ?? "";
    };

    const getMatchLabel = (matchId: string) => {
      const m = filteredMatches.find((x: any) => x.id === matchId);
      if (!m) return matchId;
      const home = m.match_teams?.find((mt: any) => mt.side === "home");
      const away = m.match_teams?.find((mt: any) => mt.side === "away");
      const fecha = m.match_date ? formatBogota(m.match_date, "d MMM") : "";
      return `${fecha} ${home?.teams?.name ?? "?"} vs ${away?.teams?.name ?? "?"}`;
    };

    const getTeamName = (matchId: string, teamId: string) => {
      const m = filteredMatches.find((x: any) => x.id === matchId);
      if (!m) return "";
      const home = m.match_teams?.find((mt: any) => mt.side === "home");
      const away = m.match_teams?.find((mt: any) => mt.side === "away");
      if (home?.team_id === teamId) return home?.teams?.name ?? "";
      if (away?.team_id === teamId) return away?.teams?.name ?? "";
      return "";
    };

    const goalRows = (goalsData ?? []).map((g: any) => {
      const matchInfo = filteredMatches.find((x: any) => x.id === g.match_id);
      return {
        Partido: getMatchLabel(g.match_id),
        División: matchInfo?.categories?.divisions?.name ?? "",
        Categoría: matchInfo?.categories?.name ?? "",
        Equipo: getTeamName(g.match_id, g.team_id),
        "# Goleador": jerseyByPlayerTeam(g.scorer_player_id, g.team_id),
        Goleador: `${g.scorer?.first_name ?? ""} ${g.scorer?.last_name ?? ""}`.trim(),
        "# Asistente": jerseyByPlayerTeam(g.assist_player_id, g.team_id),
        Asistente: g.assist ? `${g.assist.first_name ?? ""} ${g.assist.last_name ?? ""}`.trim() : "",
        Periodo: g.period,
        Tiempo: g.game_time ?? "",
      };
    });

    const penaltyRows = (penaltiesData ?? []).map((p: any) => {
      const matchInfo = filteredMatches.find((x: any) => x.id === p.match_id);
      return {
        Partido: getMatchLabel(p.match_id),
        División: matchInfo?.categories?.divisions?.name ?? "",
        Categoría: matchInfo?.categories?.name ?? "",
        Equipo: getTeamName(p.match_id, p.team_id),
        "# Jugador": jerseyByPlayerTeam(p.player_id, p.team_id),
        Jugador: `${p.player?.first_name ?? ""} ${p.player?.last_name ?? ""}`.trim(),
        Código: p.penalty_code,
        Descripción: p.penalty_description ?? "",
        Minutos: p.penalty_minutes,
        Periodo: p.period,
        Tiempo: p.penalty_time ?? "",
      };
    });

    const wb = utils.book_new();
    utils.book_append_sheet(wb, utils.json_to_sheet(matchRows), "Partidos");
    utils.book_append_sheet(wb, utils.json_to_sheet(goalRows), "Goles");
    utils.book_append_sheet(wb, utils.json_to_sheet(penaltyRows), "Sanciones");

    const today = new Date().toISOString().slice(0, 10);
    writeFile(wb, `resultados_${today}.xlsx`);
  };

  const statusClass = (st: string) =>
    st === "locked" ? "bg-destructive text-destructive-foreground" :
    st === "closed" ? "bg-blue-100 text-blue-800" :
    st === "in_progress" ? "bg-yellow-100 text-yellow-800" :
    st === "postponed" ? "bg-orange-100 text-orange-800" :
    st === "to_be_defined" ? "bg-red-100 text-black" :
    st === "scheduled" ? "bg-emerald-100 text-emerald-800" : "bg-secondary text-secondary-foreground";

  const renderRow = (match: any) => {
    const home = match.match_teams?.find((mt: any) => mt.side === "home");
    const away = match.match_teams?.find((mt: any) => mt.side === "away");
    const isLocked = match.status === "locked";
    const isClosed = match.status === "closed";
    const isEditingDate = editingDateId === match.id;
    const hasScore = match.status === "closed" || match.status === "locked" || match.status === "in_progress";

    return (
      <div key={match.id} className={`border-b last:border-b-0 ${isLocked ? "opacity-70" : ""}`}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 hover:bg-muted/40 md:flex-nowrap">
          {/* Hora */}
          <div className="flex w-[84px] shrink-0 items-center gap-1">
            <span className="text-sm font-semibold tabular-nums">
              {match.match_date ? formatBogota(match.match_date, "h:mm a") : "—"}
            </span>
            {!isLocked && (
              <button
                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                title="Cambiar fecha y hora"
                aria-label="Cambiar fecha y hora"
                onClick={() => startEditingDate(match.id, match.match_date)}
              >
                <Pencil className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Categoría y división */}
          <div className="w-[130px] shrink-0 leading-tight">
            <span className="inline-block rounded bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">
              {match.categories?.name}
            </span>
            <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{match.categories?.divisions?.name}</span>
          </div>

          {/* Partido */}
          <div className="order-last w-full min-w-0 md:order-none md:w-auto md:flex-1">
            <p className="flex min-w-0 items-center gap-2 text-sm font-semibold sm:text-base">
              <span className="min-w-0 flex-1 truncate text-right">{home?.teams?.name ?? "TBD"}</span>
              <span className={`shrink-0 rounded-md px-2 py-0.5 text-center font-display text-base tabular-nums ${hasScore ? "bg-muted" : "text-muted-foreground"}`}>
                {hasScore ? `${home?.score_regular ?? 0} - ${away?.score_regular ?? 0}` : "vs"}
              </span>
              <span className="min-w-0 flex-1 truncate">{away?.teams?.name ?? "TBD"}</span>
            </p>
          </div>

          {/* Estado */}
          <span className={`shrink-0 whitespace-nowrap rounded px-2 py-0.5 text-xs ${statusClass(match.status)}`}>
            {statusLabels[match.status]}
          </span>
          {isLocked && <Lock className="h-4 w-4 shrink-0 text-destructive" />}

          {/* Acciones */}
          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            {match.status === "scheduled" && (
              <Button size="sm" className="h-8 gap-1" onClick={() => {
                startMatchMutation.mutate(match.id);
                setLiveMatchId(match.id);
              }}>
                <Play className="h-4 w-4" /> Iniciar
              </Button>
            )}

            {match.status === "in_progress" && (
              <Button size="sm" variant="secondary" className="h-8 gap-1" onClick={() => setLiveMatchId(match.id)}>
                <Play className="h-4 w-4" /> Gestionar
              </Button>
            )}

            {match.status === "in_progress" && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="outline" className="h-8 gap-1">
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
                  <Button size="sm" variant="destructive" className="h-8 gap-1">
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

            {!isLocked && (
              <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => setEditMatch(match)}>
                <Pencil className="h-4 w-4" /> <span className="hidden sm:inline">Editar</span>
              </Button>
            )}

            {!isLocked && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="outline" className="h-8 px-2 text-destructive hover:text-destructive" aria-label="Eliminar partido" title="Eliminar partido">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      Eliminar Partido
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Se eliminarán todos los goles, sanciones y datos asociados. Las estadísticas se recalcularán automáticamente. Esta acción no se puede deshacer.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => deleteMatchMutation.mutate(match.id)}
                    >
                      Eliminar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        {isEditingDate && (
          <div className="flex items-center gap-2 bg-muted/40 px-3 pb-2">
            <Input
              type="datetime-local"
              value={editDateValue}
              onChange={(e) => setEditDateValue(e.target.value)}
              className="h-8 w-auto text-xs"
            />
            <Button size="sm" className="h-8 gap-1" onClick={() => updateDateMutation.mutate({ matchId: match.id, date: editDateValue })} disabled={updateDateMutation.isPending}>
              <Save className="h-4 w-4" /> OK
            </Button>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setEditingDateId(null)}>
              <X className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground">Hora de Bogotá</span>
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-display font-bold uppercase flex items-center gap-2">
          <Calendar className="h-6 w-6 text-primary" />
          Gestión de Partidos
        </h1>
        <div className="flex items-center gap-2">
          {activeTournament && (
            <Badge variant="default" className="text-xs">
              Gestionando: {activeTournament.name}
            </Badge>
          )}
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
            className="gap-1"
          >
            <List className="h-4 w-4" /> Lista
          </Button>
          <Button
            variant={viewMode === "calendar" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("calendar")}
            className="gap-1"
          >
            <CalendarDays className="h-4 w-4" /> Calendario
          </Button>
          <Button size="sm" className="gap-1" onClick={() => setShowCreate(true)} disabled={!activeTournamentId}>
            <Plus className="h-4 w-4" /> Crear Partido
          </Button>
        </div>
      </div>

      {!activeTournamentId && (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            No hay un torneo activo. Ve a "Torneos" y marca una edición como activa antes de gestionar partidos.
          </CardContent>
        </Card>
      )}

      {activeTournamentId && (
        <>
          <div className="flex gap-3 flex-wrap items-center">
            <Select value={filterDivision} onValueChange={setFilterDivision}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="División" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las divisiones</SelectItem>
                {divisions.map((d: any) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                {Object.entries(statusLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterDate} onValueChange={setFilterDate}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Fecha" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las fechas</SelectItem>
                <SelectItem value="accumulated">Acumulado hasta hoy</SelectItem>
                {availableDates.map((d) => {
                  const label = formatBogota(d + "T12:00:00", "d MMM yyyy");
                  return <SelectItem key={d} value={d}>{label}</SelectItem>;
                })}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground self-center">
              {filteredMatches.length} partidos
            </span>
            <Button size="sm" variant="outline" className="gap-1 ml-auto" onClick={downloadExcel}>
              <Download className="h-4 w-4" /> Descargar Excel
            </Button>
          </div>

          {viewMode === "calendar" ? (
            <AdminScheduleCalendar matches={filteredMatches} />
          ) : (
            <div className="space-y-6">
              {sections.map((sec) => (
                <section key={sec.id} className="space-y-3">
                  <h2 className="flex items-center gap-2 font-display text-lg font-bold uppercase">
                    {sec.title}
                    <span className="rounded-full bg-muted px-2 py-0.5 font-sans text-xs font-medium text-muted-foreground">
                      {sec.groups.reduce((n, g) => n + g.items.length, 0)}
                    </span>
                  </h2>
                  {sec.groups.map((g) => (
                    <Card key={g.key} className={`overflow-hidden rounded-xl ${sec.id === "done" ? "opacity-90" : ""}`}>
                      <div className="flex items-center justify-between border-b bg-primary/10 px-3 py-1.5 text-sm font-bold text-primary">
                        <span>{g.label}</span>
                        <span className="text-xs font-medium">{g.items.length} {g.items.length === 1 ? "partido" : "partidos"}</span>
                      </div>
                      {g.items.map(renderRow)}
                    </Card>
                  ))}
                </section>
              ))}
              {filteredMatches.length === 0 && (
                <Card>
                  <CardContent className="py-10 text-center text-sm text-muted-foreground">
                    Sin partidos aún en esta edición.
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <MatchLivePanel
            matchId={liveMatchId}
            open={!!liveMatchId}
            onOpenChange={(open) => { if (!open) { setLiveMatchId(null); queryClient.invalidateQueries({ queryKey: ["admin-matches"] }); } }}
          />

          <CreateMatchDialog open={showCreate} onOpenChange={setShowCreate} />
          <EditMatchDialog open={!!editMatch} onOpenChange={(open) => { if (!open) setEditMatch(null); }} match={editMatch} />
        </>
      )}
    </div>
  );
}
