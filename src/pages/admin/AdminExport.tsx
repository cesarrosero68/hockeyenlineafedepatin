import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { useTournament } from "@/contexts/TournamentContext";
import { formatBogota } from "@/lib/timezone";

export default function AdminExport() {
  const { current, currentId } = useTournament();
  const [busy, setBusy] = useState(false);

  const download = async () => {
    if (!currentId) return toast.error("Selecciona una edición primero");
    setBusy(true);
    try {
      const [matchesRes, goalsRes, penaltiesRes, standingsRes, rostersRes, playersRes, teamsRes, catsRes, divsRes] = await Promise.all([
        supabase.from("matches").select("*, categories(name, divisions(name)), match_teams(side, score_regular, teams(name))").eq("tournament_id" as any, currentId),
        supabase.from("goal_events").select("*, matches(id), teams(name)").eq("tournament_id" as any, currentId),
        supabase.from("penalties").select("*, teams(name)").eq("tournament_id" as any, currentId),
        supabase.from("standings_aggregate").select("*, teams(name), categories(name, divisions(name))").eq("tournament_id" as any, currentId),
        supabase.from("rosters").select("*, teams(name, categories(name, divisions(name)))").eq("tournament_id" as any, currentId),
        supabase.from("players_public").select("*"),
        supabase.from("teams").select("*, categories(name, divisions(name))").eq("tournament_id" as any, currentId),
        supabase.from("categories").select("*, divisions(name)").eq("tournament_id" as any, currentId),
        supabase.from("divisions").select("*").eq("tournament_id" as any, currentId),
      ]);

      const playerMap = new Map<string, any>();
      (playersRes.data ?? []).forEach((p: any) => playerMap.set(p.id, p));

      const wb = XLSX.utils.book_new();

      // Matches
      const matchRows = (matchesRes.data ?? []).map((m: any) => {
        const home = m.match_teams?.find((mt: any) => mt.side === "home");
        const away = m.match_teams?.find((mt: any) => mt.side === "away");
        return {
          "Fecha": m.match_date ? formatBogota(m.match_date, "yyyy-MM-dd HH:mm") : "",
          "División": m.categories?.divisions?.name ?? "",
          "Categoría": m.categories?.name ?? "",
          "Fase": m.phase, "Ronda": m.round_number ?? "",
          "Local": home?.teams?.name ?? "", "GL": home?.score_regular ?? "",
          "Visitante": away?.teams?.name ?? "", "GV": away?.score_regular ?? "",
          "Estado": m.status, "Sede": m.venue ?? "",
        };
      });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(matchRows), "Partidos");

      // Goles
      const goalRows = (goalsRes.data ?? []).map((g: any) => {
        const scorer = playerMap.get(g.scorer_player_id);
        const assist = playerMap.get(g.assist_player_id);
        return {
          "Partido ID": g.match_id, "Equipo": g.teams?.name ?? "", "Periodo": g.period,
          "Tiempo": g.game_time ?? "",
          "Goleador": scorer ? `${scorer.first_name} ${scorer.last_name}` : "",
          "Asistencia": assist ? `${assist.first_name} ${assist.last_name}` : "",
        };
      });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(goalRows), "Goles");

      // Sanciones
      const penRows = (penaltiesRes.data ?? []).map((p: any) => {
        const pl = playerMap.get(p.player_id);
        return {
          "Partido ID": p.match_id, "Equipo": p.teams?.name ?? "",
          "Jugador": pl ? `${pl.first_name} ${pl.last_name}` : "",
          "Código": p.penalty_code, "Minutos": p.penalty_minutes,
          "Periodo": p.period, "Tiempo": p.penalty_time ?? "",
        };
      });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(penRows), "Sanciones");

      // Posiciones
      const stRows = (standingsRes.data ?? []).map((s: any) => ({
        "División": s.categories?.divisions?.name ?? "", "Categoría": s.categories?.name ?? "",
        "Equipo": s.teams?.name ?? "", "PJ": s.played, "G": s.wins, "E": s.draws, "P": s.losses,
        "GF": s.goals_for, "GC": s.goals_against, "DG": s.goal_diff, "Pts": s.points, "Rank": s.rank,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(stRows), "Posiciones");

      // Jugadores (rosters)
      const rosterRows = (rostersRes.data ?? []).map((r: any) => {
        const pl = playerMap.get(r.player_id);
        return {
          "División": r.teams?.categories?.divisions?.name ?? "",
          "Categoría": r.teams?.categories?.name ?? "",
          "Equipo": r.teams?.name ?? "",
          "Dorsal": r.jersey_number ?? "",
          "Nombre": pl?.first_name ?? "", "Apellido": pl?.last_name ?? "",
          "Posición": r.position ?? "",
        };
      });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rosterRows), "Jugadores");

      // Equipos
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet((teamsRes.data ?? []).map((t: any) => ({
        "Nombre": t.name, "División": t.categories?.divisions?.name ?? "", "Categoría": t.categories?.name ?? "",
      }))), "Equipos");

      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet((catsRes.data ?? []).map((c: any) => ({
        "Categoría": c.name, "División": c.divisions?.name ?? "",
      }))), "Categorías");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet((divsRes.data ?? []).map((d: any) => ({ "División": d.name }))), "Divisiones");

      const name = (current?.name ?? "torneo").replace(/\s+/g, "_");
      XLSX.writeFile(wb, `export_${name}.xlsx`);
      toast.success("Exportación descargada");
    } catch (e: any) {
      toast.error("Error exportando: " + (e.message ?? "desconocido"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-display font-bold uppercase flex items-center gap-2">
        <FileSpreadsheet className="h-6 w-6 text-primary" /> Exportación completa
      </h2>
      <Card>
        <CardHeader><CardTitle className="text-base">Descargar todo</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Descarga un archivo Excel con todas las hojas de datos de la edición actual: partidos, goles, sanciones, posiciones, jugadores, equipos, categorías y divisiones.
          </p>
          {current && <p className="text-sm">Edición actual: <strong>{current.name}</strong></p>}
          <Button onClick={download} disabled={busy}>
            <Download className="h-4 w-4 mr-2" />
            {busy ? "Generando…" : "Descargar Excel"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
