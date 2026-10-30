import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Download, FileSpreadsheet, Calendar, Target, OctagonAlert, BarChart3, Users, UserRound,
  ClipboardList, Layers, Trophy, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useTournament } from "@/contexts/TournamentContext";
import { formatBogota } from "@/lib/timezone";
import type { ExportSheetSpec } from "@/lib/exportWorkbook";

type SheetId =
  | "partidos" | "goleadores" | "sanciones" | "posiciones" | "jugadores"
  | "staff" | "equipos" | "categorias" | "divisiones";

const SHEETS: { id: SheetId; label: string; desc: string; icon: any }[] = [
  { id: "partidos", label: "Partidos", desc: "Calendario y resultados", icon: Calendar },
  { id: "goleadores", label: "Goleadores", desc: "Cada gol y su asistencia", icon: Target },
  { id: "sanciones", label: "Sanciones", desc: "Penalidades por jugador", icon: OctagonAlert },
  { id: "posiciones", label: "Posiciones", desc: "Tabla por categoría", icon: BarChart3 },
  { id: "jugadores", label: "Jugadores", desc: "Planteles con dorsal", icon: UserRound },
  { id: "staff", label: "Cuerpo Técnico", desc: "Entrenadores y delegados", icon: ClipboardList },
  { id: "equipos", label: "Equipos", desc: "Equipos por categoría", icon: Users },
  { id: "categorias", label: "Categorías", desc: "Lista de categorías", icon: Layers },
  { id: "divisiones", label: "Divisiones", desc: "Lista de divisiones", icon: Trophy },
];

const PHASE_ES: Record<string, string> = {
  regular: "Regular", playoff: "Playoff", semifinal: "Semifinal", final: "Final",
  third_place: "Tercer puesto", ranking: "Ranking",
};
const STATUS_ES: Record<string, string> = {
  scheduled: "Programado", in_progress: "En juego", closed: "Jugado", locked: "Jugado",
  postponed: "Aplazado", to_be_defined: "Por definir",
};
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const byText = (...keys: string[]) => (a: any, b: any) => {
  for (const k of keys) {
    const c = String(a[k] ?? "").localeCompare(String(b[k] ?? ""), "es", { numeric: true });
    if (c !== 0) return c;
  }
  return 0;
};

export default function AdminExport() {
  const { current, currentId } = useTournament();
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Set<SheetId>>(new Set(SHEETS.map((s) => s.id)));

  const allSelected = selected.size === SHEETS.length;
  const toggle = (id: SheetId) =>
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const selectedList = useMemo(() => SHEETS.filter((s) => selected.has(s.id)), [selected]);

  const download = async () => {
    if (!currentId) return toast.error("Selecciona una edición primero");
    if (selected.size === 0) return toast.error("Marca al menos una pestaña");
    setBusy(true);
    try {
      const sb: any = supabase;
      const [matchesRes, goalsRes, penRes, standingsRes, rostersRes, playersRes, teamsRes, catsRes, divsRes, staffRes] = await Promise.all([
        sb.from("matches").select("*, categories(name, divisions(name)), match_teams(side, score_regular, teams(name))").eq("tournament_id", currentId),
        sb.from("goal_events").select("*, teams(name), matches(id, match_date, phase, categories(name), match_teams(side, score_regular, teams(name)))").eq("tournament_id", currentId),
        sb.from("penalties").select("*, teams(name), matches(match_date, phase, categories(name), match_teams(side, score_regular, teams(name)))").eq("tournament_id", currentId),
        sb.from("standings_aggregate").select("*, teams(name), categories(name, divisions(name))").eq("tournament_id", currentId),
        sb.from("rosters").select("*, teams(name, categories(name, divisions(name)))").eq("tournament_id", currentId),
        sb.from("players_public").select("*"),
        sb.from("teams").select("*, categories(name, divisions(name))").eq("tournament_id", currentId),
        sb.from("categories").select("*, divisions(name)").eq("tournament_id", currentId),
        sb.from("divisions").select("*").eq("tournament_id", currentId),
        sb.from("team_staff").select("*, teams!inner(name, tournament_id, categories(name, divisions(name)))").eq("teams.tournament_id", currentId),
      ]);

      const playerMap = new Map<string, any>();
      (playersRes.data ?? []).forEach((p: any) => playerMap.set(p.id, p));
      const rosterJerseyMap = new Map<string, number>();
      (rostersRes.data ?? []).forEach((r: any) => { if (r.player_id != null && r.jersey_number != null) rosterJerseyMap.set(r.player_id, r.jersey_number); });

      const matchInfo = (m: any) => {
        const home = m?.match_teams?.find((mt: any) => mt.side === "home");
        const away = m?.match_teams?.find((mt: any) => mt.side === "away");
        return {
          fecha: m?.match_date ? formatBogota(m.match_date, "dd/MM/yyyy HH:mm") : "",
          sortDate: m?.match_date ?? "",
          categoria: m?.categories?.name ?? "",
          fase: PHASE_ES[m?.phase] ?? m?.phase ?? "",
          local: home?.teams?.name ?? "",
          visitante: away?.teams?.name ?? "",
          resultado: `${home?.score_regular ?? 0} - ${away?.score_regular ?? 0}`,
        };
      };
      const fullName = (p: any) => (p ? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() : "");

      const specs: Record<SheetId, () => ExportSheetSpec> = {
        partidos: () => {
          const rows = (matchesRes.data ?? [])
            .slice()
            .sort((a: any, b: any) => String(a.match_date ?? "9999").localeCompare(String(b.match_date ?? "9999")))
            .map((m: any) => {
              const home = m.match_teams?.find((mt: any) => mt.side === "home");
              const away = m.match_teams?.find((mt: any) => mt.side === "away");
              const played = m.status === "closed" || m.status === "locked" || m.status === "in_progress";
              return {
                fecha: m.match_date ? formatBogota(m.match_date, "dd/MM/yyyy") : "Sin fecha",
                dia: m.match_date ? cap(formatBogota(m.match_date, "EEEE")) : "",
                hora: m.match_date ? formatBogota(m.match_date, "h:mm a") : "",
                categoria: m.categories?.name ?? "",
                division: m.categories?.divisions?.name ?? "",
                fase: PHASE_ES[m.phase] ?? m.phase,
                ronda: m.round_number ?? "",
                local: home?.teams?.name ?? "",
                resultado: played ? `${home?.score_regular ?? 0} - ${away?.score_regular ?? 0}` : "—",
                visitante: away?.teams?.name ?? "",
                estado: STATUS_ES[m.status] ?? m.status,
                sede: m.venue ?? "",
              };
            });
          return {
            name: "Partidos", title: "Partidos", rows, categoryKey: "categoria", statusKey: "estado", legend: true,
            columns: [
              { header: "Fecha", key: "fecha", align: "center" }, { header: "Día", key: "dia", align: "center" },
              { header: "Hora", key: "hora", align: "center" }, { header: "Categoría", key: "categoria" },
              { header: "División", key: "division" }, { header: "Fase", key: "fase", align: "center" },
              { header: "Ronda", key: "ronda", align: "center" }, { header: "Local", key: "local", bold: true },
              { header: "Resultado", key: "resultado", align: "center", bold: true }, { header: "Visitante", key: "visitante", bold: true },
              { header: "Estado", key: "estado", align: "center" }, { header: "Sede", key: "sede" },
            ],
          };
        },
        goleadores: () => {
          const rows = (goalsRes.data ?? []).map((g: any) => {
            const i = matchInfo(g.matches);
            return {
              fecha: i.fecha, sortDate: i.sortDate, categoria: i.categoria, fase: i.fase, local: i.local, visitante: i.visitante,
              resultado: i.resultado, goleador: fullName(playerMap.get(g.scorer_player_id)),
              dorsal: rosterJerseyMap.get(g.scorer_player_id) ?? "", equipo: g.teams?.name ?? "",
              asistencia: fullName(playerMap.get(g.assist_player_id)), periodo: g.period, tiempo: g.game_time ?? "",
              overtime: (g.period != null && Number(g.period) > 3) || g.is_overtime ? "Sí" : "No",
            };
          }).sort(byText("categoria", "sortDate"));
          return {
            name: "Goleadores", title: "Goleadores", rows, categoryKey: "categoria",
            columns: [
              { header: "Fecha partido", key: "fecha", align: "center" }, { header: "Categoría", key: "categoria" },
              { header: "Fase", key: "fase", align: "center" }, { header: "Local", key: "local" },
              { header: "Visitante", key: "visitante" }, { header: "Resultado", key: "resultado", align: "center" },
              { header: "Goleador", key: "goleador", bold: true }, { header: "Dorsal", key: "dorsal", align: "center" },
              { header: "Equipo", key: "equipo" }, { header: "Asistencia", key: "asistencia" },
              { header: "Periodo", key: "periodo", align: "center" }, { header: "Tiempo", key: "tiempo", align: "center" },
              { header: "Overtime", key: "overtime", align: "center" },
            ],
          };
        },
        sanciones: () => {
          const rows = (penRes.data ?? []).map((p: any) => {
            const i = matchInfo(p.matches);
            return {
              fecha: i.fecha, sortDate: i.sortDate, categoria: i.categoria, fase: i.fase, local: i.local, visitante: i.visitante,
              resultado: i.resultado, jugador: fullName(playerMap.get(p.player_id)),
              dorsal: rosterJerseyMap.get(p.player_id) ?? "", equipo: p.teams?.name ?? "",
              tipo: p.penalty_code, duracion: p.penalty_minutes, periodo: p.period, tiempo: p.penalty_time ?? "",
            };
          }).sort(byText("categoria", "sortDate"));
          return {
            name: "Sanciones", title: "Sanciones", rows, categoryKey: "categoria",
            columns: [
              { header: "Fecha partido", key: "fecha", align: "center" }, { header: "Categoría", key: "categoria" },
              { header: "Fase", key: "fase", align: "center" }, { header: "Local", key: "local" },
              { header: "Visitante", key: "visitante" }, { header: "Resultado", key: "resultado", align: "center" },
              { header: "Jugador", key: "jugador", bold: true }, { header: "Dorsal", key: "dorsal", align: "center" },
              { header: "Equipo", key: "equipo" }, { header: "Tipo sanción", key: "tipo", align: "center" },
              { header: "Duración", key: "duracion", align: "center" }, { header: "Periodo", key: "periodo", align: "center" },
              { header: "Tiempo", key: "tiempo", align: "center" },
            ],
          };
        },
        posiciones: () => {
          const rows = (standingsRes.data ?? []).map((s: any) => ({
            categoria: s.categories?.name ?? "", division: s.categories?.divisions?.name ?? "", rank: s.rank,
            equipo: s.teams?.name ?? "", pj: s.played, g: s.wins, e: s.draws, p: s.losses,
            gf: s.goals_for, gc: s.goals_against, dg: s.goal_diff, pts: s.points,
          })).sort((a: any, b: any) => byText("categoria")(a, b) || (a.rank ?? 99) - (b.rank ?? 99));
          return {
            name: "Posiciones", title: "Tabla de posiciones", rows, categoryKey: "categoria",
            columns: [
              { header: "Categoría", key: "categoria" }, { header: "División", key: "division" },
              { header: "Rank", key: "rank", align: "center" }, { header: "Equipo", key: "equipo", bold: true },
              { header: "PJ", key: "pj", align: "center" }, { header: "G", key: "g", align: "center" },
              { header: "E", key: "e", align: "center" }, { header: "P", key: "p", align: "center" },
              { header: "GF", key: "gf", align: "center" }, { header: "GC", key: "gc", align: "center" },
              { header: "DG", key: "dg", align: "center" }, { header: "Pts", key: "pts", align: "center", bold: true },
            ],
          };
        },
        jugadores: () => {
          const rows = (rostersRes.data ?? []).map((r: any) => {
            const pl: any = playerMap.get(r.player_id);
            return {
              categoria: r.teams?.categories?.name ?? "", division: r.teams?.categories?.divisions?.name ?? "",
              equipo: r.teams?.name ?? "", dorsal: r.jersey_number ?? "", nombre: pl?.first_name ?? "",
              apellido: pl?.last_name ?? "", nacimiento: pl?.date_of_birth ?? "", velopro: pl?.velopro_number ?? "",
              documento: pl?.document_number ?? pl?.cedula ?? "",
            };
          }).sort((a: any, b: any) => byText("categoria", "equipo")(a, b) || (Number(a.dorsal) || 999) - (Number(b.dorsal) || 999));
          return {
            name: "Jugadores", title: "Jugadores", rows, categoryKey: "categoria",
            columns: [
              { header: "Categoría", key: "categoria" }, { header: "División", key: "division" },
              { header: "Equipo", key: "equipo" }, { header: "Dorsal", key: "dorsal", align: "center" },
              { header: "Nombre", key: "nombre", bold: true }, { header: "Apellido", key: "apellido", bold: true },
              { header: "Fecha nacimiento", key: "nacimiento", align: "center" }, { header: "VeloPro", key: "velopro", align: "center" },
              { header: "Documento", key: "documento", align: "center" },
            ],
          };
        },
        staff: () => {
          const roleOrder: Record<string, number> = { ENTRENADOR: 0, ASISTENTE: 1, DELEGADO: 2 };
          const rows = (staffRes.data ?? []).map((st: any) => ({
            division: st.teams?.categories?.divisions?.name ?? "", categoria: st.teams?.categories?.name ?? "",
            equipo: st.teams?.name ?? "", nombre: st.first_name ?? "", apellido: st.last_name ?? "",
            rol: st.role ?? "", velopro: st.velopro_number ?? "",
          })).sort((a: any, b: any) => byText("categoria", "equipo")(a, b) || (roleOrder[a.rol] ?? 9) - (roleOrder[b.rol] ?? 9));
          return {
            name: "Cuerpo Técnico", title: "Cuerpo técnico", rows, categoryKey: "categoria",
            columns: [
              { header: "Categoría", key: "categoria" }, { header: "División", key: "division" },
              { header: "Equipo", key: "equipo" }, { header: "Nombre", key: "nombre", bold: true },
              { header: "Apellido", key: "apellido", bold: true }, { header: "Rol", key: "rol", align: "center" },
              { header: "VeloPro", key: "velopro", align: "center" },
            ],
          };
        },
        equipos: () => ({
          name: "Equipos", title: "Equipos", categoryKey: "categoria",
          rows: (teamsRes.data ?? []).map((t: any) => ({
            nombre: t.name, division: t.categories?.divisions?.name ?? "", categoria: t.categories?.name ?? "",
          })).sort(byText("categoria", "nombre")),
          columns: [
            { header: "Categoría", key: "categoria" }, { header: "Equipo", key: "nombre", bold: true },
            { header: "División", key: "division" },
          ],
        }),
        categorias: () => ({
          name: "Categorías", title: "Categorías", categoryKey: "categoria",
          rows: (catsRes.data ?? []).map((c: any) => ({ categoria: c.name, division: c.divisions?.name ?? "" })).sort(byText("categoria")),
          columns: [{ header: "Categoría", key: "categoria" }, { header: "División", key: "division" }],
        }),
        divisiones: () => ({
          name: "Divisiones", title: "Divisiones",
          rows: (divsRes.data ?? []).map((d: any) => ({ division: d.name })).sort(byText("division")),
          columns: [{ header: "División", key: "division", bold: true }],
        }),
      };

      // La librería de Excel pesa bastante: se carga solo al descargar.
      const { buildWorkbook } = await import("@/lib/exportWorkbook");
      const buffer = await buildWorkbook(
        selectedList.map((s) => specs[s.id]()),
        {
          tournamentName: current?.name ?? "Torneo",
          exportedAtLabel: formatBogota(new Date().toISOString(), "d 'de' MMMM yyyy, h:mm a"),
          categoryNames: (catsRes.data ?? []).map((c: any) => c.name),
        },
      );

      const name = (current?.name ?? "torneo").replace(/\s+/g, "_");
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `export_${name}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Exportación descargada");
    } catch (e: any) {
      toast.error("Error exportando: " + (e.message ?? "desconocido"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold uppercase">
          <FileSpreadsheet className="h-6 w-6 text-primary" /> Exportar a Excel
        </h1>
        {current && <Badge className="text-xs">Edición: {current.name}</Badge>}
      </div>

      <Card className="overflow-hidden rounded-2xl shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-primary/10 px-4 py-3">
          <div>
            <p className="font-display text-lg font-bold uppercase text-primary">¿Qué pestañas quieres descargar?</p>
            <p className="text-xs text-muted-foreground">Por defecto van todas. Desmarca las que no necesites.</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setSelected(new Set(SHEETS.map((s) => s.id)))} disabled={allSelected}>
              Marcar todas
            </Button>
            <Button size="sm" variant="outline" onClick={() => setSelected(new Set())} disabled={selected.size === 0}>
              Quitar todas
            </Button>
          </div>
        </div>
        <CardContent className="p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SHEETS.map((s) => {
              const on = selected.has(s.id);
              return (
                <label
                  key={s.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors ${
                    on ? "border-primary bg-primary/5" : "bg-card hover:bg-muted/50"
                  }`}
                >
                  <Checkbox checked={on} onCheckedChange={() => toggle(s.id)} />
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${on ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    <s.icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 leading-tight">
                    <span className="block font-semibold">{s.label}</span>
                    <span className="block truncate text-xs text-muted-foreground">{s.desc}</span>
                  </span>
                </label>
              );
            })}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <p className="text-sm text-muted-foreground">
              {selected.size === SHEETS.length
                ? "Se descargarán las 9 pestañas."
                : selected.size === 0
                ? "No hay pestañas marcadas."
                : `Se descargará${selected.size === 1 ? "" : "n"} ${selected.size} pestaña${selected.size === 1 ? "" : "s"}: ${selectedList.map((s) => s.label).join(", ")}.`}
            </p>
            <Button size="lg" onClick={download} disabled={busy || selected.size === 0}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              {busy ? "Generando…" : "Descargar Excel"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        El archivo sale ordenado: sin cuadrícula, encabezado azul, un color por categoría y filtros en cada pestaña.
      </p>
    </div>
  );
}
