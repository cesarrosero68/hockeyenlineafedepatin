import { supabase } from "@/integrations/supabase/client";
import { formatBogota } from "@/lib/timezone";
import { sortChronological } from "./matchEvents";
import { buildDisciplinePdf, type DisciplineReportData, type DisciplineSanction } from "./disciplinePdf";
export type { DisciplineReportData };

const PERIOD_TXT: Record<number, string> = { 1: "1T", 2: "2T", 3: "OT" };
const STATUS_TXT: Record<string, string> = {
  scheduled: "Programado",
  in_progress: "En juego",
  closed: "Finalizado",
  locked: "Cerrado",
  postponed: "Aplazado",
  to_be_defined: "Por definir",
};

const fullName = (p: { first_name?: string | null; last_name?: string | null } | null | undefined) =>
  `${p?.first_name ?? ""} ${p?.last_name ?? ""}`.trim();

/** Lee de la base de datos (solo lectura) todo lo que lleva el reporte de un partido. */
export async function loadDisciplineData(matchId: string): Promise<DisciplineReportData> {
  const { data: match, error } = await supabase
    .from("matches")
    .select(
      `id, match_date, notes, venue, phase, round_number, status,
       categories!inner(name, divisions!inner(name)),
       match_teams(side, team_id, score_regular, score_extra, teams!inner(name))`,
    )
    .eq("id", matchId)
    .single();
  if (error || !match) throw error ?? new Error("Partido no encontrado");

  const m: any = match;
  const home = m.match_teams?.find((t: any) => t.side === "home");
  const away = m.match_teams?.find((t: any) => t.side === "away");
  const teamIds = [home?.team_id, away?.team_id].filter(Boolean) as string[];

  const [{ data: pens }, { data: staff }, { data: rosters }] = await Promise.all([
    supabase
      .from("penalties")
      .select("*, player:players!penalties_player_id_fkey(first_name, last_name)")
      .eq("match_id", matchId)
      .order("created_at"),
    supabase.from("team_staff").select("first_name, last_name, role, team_id").in("team_id", teamIds),
    supabase.from("rosters").select("player_id, team_id, jersey_number").in("team_id", teamIds),
  ]);

  const staffName = (teamId: string | undefined, role: string) => {
    const s = (staff ?? []).find((x: any) => x.team_id === teamId && (x.role ?? "").toUpperCase() === role);
    return s ? fullName(s as any) : "";
  };
  // Número de camiseta de ESTA edición (rosters), no del catálogo global de jugadores.
  const jersey = (playerId: string | null, teamId: string) =>
    (rosters ?? []).find((r: any) => r.player_id === playerId && r.team_id === teamId)?.jersey_number ?? null;

  const sanctions: DisciplineSanction[] = sortChronological(pens as any[], "penalty_time").map((p: any) => ({
    player: fullName(p.player) || "—",
    jersey: jersey(p.player_id, p.team_id),
    side: p.team_id === home?.team_id ? "LOC" : "VIS",
    period: PERIOD_TXT[p.period] ?? `P${p.period}`,
    time: p.penalty_time ?? "",
    sanction: `${p.penalty_description ?? ""}${p.penalty_minutes ? ` (${p.penalty_minutes} min)` : ""}`.trim(),
    rule: p.penalty_code ?? "",
  }));

  const phase = [m.phase, m.round_number ? `J${m.round_number}` : ""].filter(Boolean).join(" ");
  const closed = m.status === "closed" || m.status === "locked" || m.status === "in_progress";

  return {
    dateText: formatBogota(m.match_date, "dd/MM/yyyy"),
    timeText: formatBogota(m.match_date, "h:mm a"),
    league: m.categories?.divisions?.name ?? "",
    division: m.categories?.name ?? "",
    venue: m.venue ?? "",
    phase,
    statusText: STATUS_TXT[m.status] ?? "",
    homeTeam: home?.teams?.name ?? "",
    awayTeam: away?.teams?.name ?? "",
    homeScore: closed ? home?.score_regular ?? null : null,
    awayScore: closed ? away?.score_regular ?? null : null,
    homeScoreExtra: closed ? home?.score_extra ?? null : null,
    awayScoreExtra: closed ? away?.score_extra ?? null : null,
    homeCoach: staffName(home?.team_id, "ENTRENADOR"),
    awayCoach: staffName(away?.team_id, "ENTRENADOR"),
    homeDelegate: staffName(home?.team_id, "DELEGADO"),
    awayDelegate: staffName(away?.team_id, "DELEGADO"),
    sanctions,
    notes: m.notes ?? "",
  };
}

/** Genera y descarga el PDF con los datos ya revisados/completados en la ventana. */
export function downloadDisciplinePdf(data: DisciplineReportData): void {
  const safe = (s: string) => s.replace(/[^\p{L}\p{N}]+/gu, "_").replace(/^_|_$/g, "");
  const name = `Reporte_Disciplina_${safe(data.homeTeam)}_vs_${safe(data.awayTeam)}_${data.dateText.replace(/\//g, "-")}.pdf`;
  buildDisciplinePdf(data).save(name);
}
