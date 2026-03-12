import { useState, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, FileText, CheckCircle, AlertTriangle, Download, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";

// ---- CSV parser (simple, handles quoted fields) ----
function parseCSV(text: string): string[][] {
  const clean = text.replace(/^\uFEFF/, "");
  const lines = clean.split(/\r?\n/).filter((l) => l.trim() !== "");
  return lines.map((line) => {
    const cells: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
        else if (ch === '"') inQuotes = false;
        else current += ch;
      } else {
        if (ch === '"') inQuotes = true;
        else if (ch === "," || ch === ";") { cells.push(current.trim()); current = ""; }
        else current += ch;
      }
    }
    cells.push(current.trim());
    return cells;
  });
}

// ---- helpers ----
function normalize(s: string): string {
  return s.trim()
    .replace(/[\u00A0\u200B\u200C\u200D\uFEFF]/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeStripped(s: string): string {
  return normalize(s).replace(/[-\s]/g, '');
}

/**
 * Parse a date string flexibly and return an ISO string in UTC
 * representing the correct Bogotá time.
 *
 * Supported formats:
 *   YYYY-MM-DD           → midnight Bogotá
 *   YYYY-MM-DDTHH:mm     → that hour in Bogotá
 *   YYYY-MM-DDTHH:mm:ss  → that time in Bogotá
 *   M/D/YYYY             → midnight Bogotá
 *   MM/DD/YYYY           → midnight Bogotá
 *   DD/MM/YYYY           → midnight Bogotá (if day > 12)
 */
function parseDateBogota(raw: string): string | null {
  if (!raw || !raw.trim()) return null;
  const s = raw.trim();

  // ISO-like: YYYY-MM-DD or YYYY-MM-DDTHH:mm(:ss)
  const isoMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:T(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (isoMatch) {
    const [, y, mo, d, hh, mm, ss] = isoMatch;
    const dateStr = `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}T${(hh ?? '00').padStart(2, '0')}:${mm ?? '00'}:${ss ?? '00'}-05:00`;
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date.toISOString();
  }

  // Slash format: could be M/D/YYYY or D/M/YYYY
  const slashMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    let [, a, b, y] = slashMatch;
    let month: string, day: string;
    // If first number > 12, it must be the day (DD/MM/YYYY)
    if (parseInt(a) > 12) {
      day = a; month = b;
    } else {
      // Default: M/D/YYYY (US format, common in spreadsheets)
      month = a; day = b;
    }
    const dateStr = `${y}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00-05:00`;
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date.toISOString();
  }

  return null;
}

function parseFlexDate(raw: string): string | null {
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parts = raw.split("/");
  if (parts.length === 3) {
    const [m, d, y] = parts;
    const mm = m.padStart(2, "0");
    const dd = d.padStart(2, "0");
    if (y.length === 4) return `${y}-${mm}-${dd}`;
  }
  return null;
}

const isPlaceholder = (name: string) => /^(seed|winner|loser|win\s|winnersub)/i.test(name.trim());

// ---- Schedule upload ----
const SCHEDULE_HEADERS = ["division", "categoria", "equipo_local", "equipo_visitante", "fecha", "fase", "ronda"];

function ScheduleUpload() {
  const [rows, setRows] = useState<string[][]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [purgeFirst, setPurgeFirst] = useState(false);
  const [skipDuplicates, setSkipDuplicates] = useState(true);

  const { data: divisions } = useQuery({
    queryKey: ["upload-divisions"],
    queryFn: async () => {
      const { data } = await supabase.from("divisions").select("id, name");
      return data ?? [];
    },
  });
  const { data: categories } = useQuery({
    queryKey: ["upload-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id, name, division_id");
      return data ?? [];
    },
  });
  const { data: teams } = useQuery({
    queryKey: ["upload-teams"],
    queryFn: async () => {
      const { data } = await supabase.from("teams").select("id, name, category_id");
      return data ?? [];
    },
  });

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length < 2) {
        setErrors(["El archivo debe tener al menos un encabezado y una fila de datos."]);
        setRows([]);
        return;
      }
      const header = parsed[0].map((h) => h.toLowerCase().replace(/\s+/g, "_"));
      const missing = SCHEDULE_HEADERS.filter((h) => !header.includes(h));
      if (missing.length > 0) {
        setErrors([`Columnas faltantes: ${missing.join(", ")}`]);
        setRows([]);
        return;
      }
      setErrors([]);
      setRows(parsed);
    };
    reader.readAsText(file);
    e.target.value = "";
  }, []);

  const confirmMutation = useMutation({
    mutationFn: async () => {
      if (rows.length < 2) throw new Error("Sin datos");
      const header = rows[0].map((h) => h.toLowerCase().replace(/\s+/g, "_"));
      const dataRows = rows.slice(1);
      const errs: string[] = [];
      const inserts: { category_id: string; match_date: string | null; phase: string; round_number: number | null; home_team_id: string | null; away_team_id: string | null; notes: string | null }[] = [];

      // Collect category IDs that appear in the CSV (for purge)
      const categoryIdsInCsv = new Set<string>();

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const get = (col: string) => row[header.indexOf(col)] ?? "";
        const divName = get("division");
        const catName = get("categoria");
        const homeName = get("equipo_local");
        const awayName = get("equipo_visitante");
        const fecha = get("fecha");
        const fase = (get("fase") || "regular").toLowerCase();
        const ronda = get("ronda");

        const div = divisions?.find((d) => normalize(d.name) === normalize(divName));
        if (!div) { errs.push(`Fila ${i + 2}: división "${divName}" no encontrada`); continue; }
        const cat = categories?.find((c) => normalize(c.name) === normalize(catName) && c.division_id === div.id);
        if (!cat) { errs.push(`Fila ${i + 2}: categoría "${catName}" no encontrada en división "${divName}"`); continue; }

        categoryIdsInCsv.add(cat.id);

        const homePlaceholder = isPlaceholder(homeName);
        const awayPlaceholder = isPlaceholder(awayName);

        let homeTeamId: string | null = null;
        let awayTeamId: string | null = null;

        if (!homePlaceholder) {
          const home = teams?.find((t) => normalizeStripped(t.name) === normalizeStripped(homeName) && t.category_id === cat.id);
          if (!home) { errs.push(`Fila ${i + 2}: equipo local "${homeName}" no encontrado en categoría "${catName}"`); continue; }
          homeTeamId = home.id;
        }
        if (!awayPlaceholder) {
          const away = teams?.find((t) => normalizeStripped(t.name) === normalizeStripped(awayName) && t.category_id === cat.id);
          if (!away) { errs.push(`Fila ${i + 2}: equipo visitante "${awayName}" no encontrado en categoría "${catName}"`); continue; }
          awayTeamId = away.id;
        }

        // Use robust date parser
        const matchDate = parseDateBogota(fecha);
        if (fecha && !matchDate) {
          errs.push(`Fila ${i + 2}: fecha inválida "${fecha}" — use YYYY-MM-DD, YYYY-MM-DDTHH:mm, o M/D/YYYY`);
          continue;
        }

        const noteParts: string[] = [];
        if (homePlaceholder) noteParts.push(`Local: ${homeName.trim()}`);
        if (awayPlaceholder) noteParts.push(`Visitante: ${awayName.trim()}`);

        const roundNum = (ronda && ronda.toUpperCase() !== "NULL") ? parseInt(ronda) || null : null;

        inserts.push({
          category_id: cat.id,
          match_date: matchDate,
          phase: fase,
          round_number: roundNum,
          home_team_id: homeTeamId,
          away_team_id: awayTeamId,
          notes: noteParts.length > 0 ? noteParts.join(" | ") : null,
        });
      }

      if (errs.length > 0) throw new Error(errs.join("\n"));

      // --- PURGE: delete existing 'scheduled' matches in affected categories ---
      if (purgeFirst && categoryIdsInCsv.size > 0) {
        for (const catId of categoryIdsInCsv) {
          // Only delete matches with status='scheduled' to avoid removing played matches
          const { data: scheduledMatches } = await supabase
            .from("matches")
            .select("id")
            .eq("category_id", catId)
            .eq("status", "scheduled");

          if (scheduledMatches && scheduledMatches.length > 0) {
            const matchIds = scheduledMatches.map((m) => m.id);
            // Delete match_teams first
            await supabase.from("match_teams").delete().in("match_id", matchIds);
            // Delete matches
            await supabase.from("matches").delete().in("id", matchIds);
          }
        }
      }

      // --- DUPLICATE CHECK ---
      let skippedCount = 0;

      // Insert matches + match_teams
      for (const ins of inserts) {
        // If skipDuplicates is on, check if a match with same category+teams+date+phase already exists
        if (skipDuplicates && !purgeFirst) {
          let query = supabase
            .from("matches")
            .select("id, match_teams(team_id, side)")
            .eq("category_id", ins.category_id)
            .eq("phase", ins.phase as any);

          if (ins.match_date) {
            query = query.eq("match_date", ins.match_date);
          } else {
            query = query.is("match_date", null);
          }

          const { data: existing } = await query;

          if (existing && existing.length > 0) {
            // Check if any existing match has the same teams
            const isDuplicate = existing.some((m: any) => {
              const existingHome = m.match_teams?.find((mt: any) => mt.side === "home")?.team_id ?? null;
              const existingAway = m.match_teams?.find((mt: any) => mt.side === "away")?.team_id ?? null;
              return existingHome === ins.home_team_id && existingAway === ins.away_team_id;
            });
            if (isDuplicate) {
              skippedCount++;
              continue;
            }
          }
        }

        const { data: match, error: mErr } = await supabase
          .from("matches")
          .insert({
            category_id: ins.category_id,
            match_date: ins.match_date,
            phase: ins.phase as any,
            round_number: ins.round_number,
            status: "scheduled" as const,
            notes: ins.notes,
          })
          .select("id")
          .single();
        if (mErr) throw mErr;

        const teamInserts: { match_id: string; team_id: string; side: string; score_regular: number }[] = [];
        if (ins.home_team_id) teamInserts.push({ match_id: match.id, team_id: ins.home_team_id, side: "home", score_regular: 0 });
        if (ins.away_team_id) teamInserts.push({ match_id: match.id, team_id: ins.away_team_id, side: "away", score_regular: 0 });
        if (teamInserts.length > 0) {
          const { error: mtErr } = await supabase.from("match_teams").insert(teamInserts);
          if (mtErr) throw mtErr;
        }
      }

      return { inserted: inserts.length - skippedCount, skipped: skippedCount };
    },
    onSuccess: (result) => {
      let msg = `${result?.inserted ?? 0} partidos cargados exitosamente`;
      if (result?.skipped) msg += ` (${result.skipped} duplicados omitidos)`;
      toast({ title: msg });
      setRows([]);
      setFileName("");
    },
    onError: (err: Error) => {
      setErrors(err.message.split("\n"));
      toast({ title: "Error en el cargue", description: "Revise los errores señalados.", variant: "destructive" });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="cursor-pointer">
          <input type="file" accept=".csv" className="hidden" onChange={handleFile} />
          <Button asChild variant="outline" className="gap-2">
            <span><Upload className="h-4 w-4" /> Seleccionar archivo CSV</span>
          </Button>
        </label>
        {fileName && <span className="text-sm text-muted-foreground">{fileName}</span>}
      </div>

      {errors.length > 0 && (
        <Card className="border-destructive">
          <CardContent className="p-4 space-y-1">
            {errors.map((e, i) => (
              <p key={i} className="text-sm text-destructive flex items-start gap-1">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" /> {e}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      {rows.length > 1 && errors.length === 0 && (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Vista previa — {rows.length - 1} partidos</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-auto max-h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {rows[0].map((h, i) => (
                        <TableHead key={i} className="text-xs whitespace-nowrap">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.slice(1, 51).map((row, ri) => (
                      <TableRow key={ri}>
                        {row.map((cell, ci) => (
                          <TableCell key={ci} className="text-xs py-2">{cell}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {rows.length > 51 && (
                <p className="text-xs text-muted-foreground p-3">Mostrando las primeras 50 filas de {rows.length - 1} totales.</p>
              )}
            </CardContent>
          </Card>

          {/* Duplicate / purge options */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-sm font-medium">Opciones de re-cargue</p>
              <div className="flex items-start gap-2">
                <Checkbox
                  id="purge-first"
                  checked={purgeFirst}
                  onCheckedChange={(v) => setPurgeFirst(!!v)}
                />
                <Label htmlFor="purge-first" className="text-sm leading-tight cursor-pointer">
                  <span className="font-medium flex items-center gap-1">
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    Borrar partidos "Programados" existentes
                  </span>
                  <span className="text-muted-foreground block text-xs mt-0.5">
                    Elimina todos los partidos con estado "Programado" en las categorías del CSV antes de insertar. 
                    Los partidos iniciados, cerrados o bloqueados NO se eliminan.
                  </span>
                </Label>
              </div>
              {!purgeFirst && (
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="skip-duplicates"
                    checked={skipDuplicates}
                    onCheckedChange={(v) => setSkipDuplicates(!!v)}
                  />
                  <Label htmlFor="skip-duplicates" className="text-sm leading-tight cursor-pointer">
                    <span className="font-medium">Omitir duplicados</span>
                    <span className="text-muted-foreground block text-xs mt-0.5">
                      Si ya existe un partido con los mismos equipos, fecha, fase y categoría, no lo vuelve a crear.
                    </span>
                  </Label>
                </div>
              )}
            </CardContent>
          </Card>

          <Button
            className="gap-2"
            onClick={() => confirmMutation.mutate()}
            disabled={confirmMutation.isPending}
          >
            <CheckCircle className="h-4 w-4" />
            {confirmMutation.isPending ? "Cargando..." : `Confirmar cargue de ${rows.length - 1} partidos`}
          </Button>
        </>
      )}
    </div>
  );
}

// ---- Players/Roster upload ----
const ROSTER_HEADERS = ["nombre", "apellido", "dorsal", "equipo", "categoria", "division"];

const HEADER_ALIASES: Record<string, string> = {
  fecha_de_nacimiento: "fecha_nacimiento",
  observacion: "observacion",
};

function RosterUpload() {
  const [rows, setRows] = useState<string[][]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");

  const { data: divisions } = useQuery({
    queryKey: ["upload-divisions"],
    queryFn: async () => {
      const { data } = await supabase.from("divisions").select("id, name");
      return data ?? [];
    },
  });
  const { data: categories } = useQuery({
    queryKey: ["upload-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id, name, division_id");
      return data ?? [];
    },
  });
  const { data: teams } = useQuery({
    queryKey: ["upload-teams"],
    queryFn: async () => {
      const { data } = await supabase.from("teams").select("id, name, category_id");
      return data ?? [];
    },
  });

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length < 2) {
        setErrors(["El archivo debe tener al menos un encabezado y una fila de datos."]);
        setRows([]);
        return;
      }
      const header = parsed[0].map((h) => {
        let key = h.toLowerCase().replace(/\s+/g, "_").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (HEADER_ALIASES[key]) key = HEADER_ALIASES[key];
        return key;
      });
      const missing = ROSTER_HEADERS.filter((h) => !header.includes(h));
      if (missing.length > 0) {
        setErrors([`Columnas faltantes: ${missing.join(", ")}`]);
        setRows([]);
        return;
      }
      setErrors([]);
      setRows(parsed);
    };
    reader.readAsText(file);
    e.target.value = "";
  }, []);

  const confirmMutation = useMutation({
    mutationFn: async () => {
      if (rows.length < 2) throw new Error("Sin datos");
      const header = rows[0].map((h) => {
        let key = h.toLowerCase().replace(/\s+/g, "_").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (HEADER_ALIASES[key]) key = HEADER_ALIASES[key];
        return key;
      });
      const dataRows = rows.slice(1);
      const errs: string[] = [];
      let count = 0;

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const get = (col: string) => row[header.indexOf(col)]?.trim() ?? "";
        const firstName = get("nombre");
        const lastName = get("apellido");
        const jersey = get("dorsal");
        const teamName = get("equipo");
        const catName = get("categoria");
        const divName = get("division");
        const position = header.includes("posicion") ? get("posicion") : null;
        const dobRaw = header.includes("fecha_nacimiento") ? get("fecha_nacimiento") : "";
        const dob = parseFlexDate(dobRaw);

        if (!firstName || !lastName) { errs.push(`Fila ${i + 2}: nombre o apellido vacío`); continue; }

        const div = divisions?.find((d) => normalize(d.name) === normalize(divName));
        if (!div) { errs.push(`Fila ${i + 2}: división "${divName}" no encontrada (disponibles: ${divisions?.map(d=>d.name).join(", ") ?? "cargando..."})`); continue; }
        const cat = categories?.find((c) => normalize(c.name) === normalize(catName) && c.division_id === div.id);
        if (!cat) { errs.push(`Fila ${i + 2}: categoría "${catName}" no encontrada`); continue; }
        const team = teams?.find((t) => normalize(t.name) === normalize(teamName) && t.category_id === cat.id);
        if (!team) { errs.push(`Fila ${i + 2}: equipo "${teamName}" no encontrado en categoría "${catName}"`); continue; }

        const { data: existingRosters } = await supabase
          .from("rosters")
          .select("id, player_id, players_public!inner(first_name, last_name)")
          .eq("team_id", team.id)
          .eq("season", "2026");

        const alreadyExists = existingRosters?.some((r: any) => {
          const fn = r.players_public?.first_name ?? "";
          const ln = r.players_public?.last_name ?? "";
          return normalize(fn) === normalize(firstName) && normalize(ln) === normalize(lastName);
        });

        if (alreadyExists) {
          errs.push(`Fila ${i + 2}: jugador "${firstName} ${lastName}" ya existe en el roster de "${teamName}" — omitido`);
          continue;
        }

        const { data: player, error: pErr } = await supabase
          .from("players")
          .insert({
            first_name: firstName,
            last_name: lastName,
            jersey_number: jersey ? parseInt(jersey) || null : null,
            date_of_birth: dob,
          })
          .select("id")
          .single();
        if (pErr) { errs.push(`Fila ${i + 2}: error insertando jugador — ${pErr.message}`); continue; }

        const { error: rErr } = await supabase.from("rosters").insert({
          player_id: player.id,
          team_id: team.id,
          jersey_number: jersey ? parseInt(jersey) || null : null,
          position: position || null,
          season: "2026",
        });
        if (rErr) { errs.push(`Fila ${i + 2}: error insertando roster — ${rErr.message}`); continue; }

        count++;
      }

      if (errs.length > 0 && count === 0) throw new Error(errs.join("\n"));
      if (errs.length > 0) {
        toast({ title: `${count} jugadores cargados con ${errs.length} errores`, variant: "destructive" });
        setErrors(errs);
      }
      return count;
    },
    onSuccess: (count) => {
      if (count && count > 0) {
        toast({ title: `${count} jugadores cargados exitosamente` });
        setRows([]);
        setFileName("");
      }
    },
    onError: (err: Error) => {
      setErrors(err.message.split("\n"));
      toast({ title: "Error en el cargue", description: "Revise los errores señalados.", variant: "destructive" });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="cursor-pointer">
          <input type="file" accept=".csv" className="hidden" onChange={handleFile} />
          <Button asChild variant="outline" className="gap-2">
            <span><Upload className="h-4 w-4" /> Seleccionar archivo CSV</span>
          </Button>
        </label>
        {fileName && <span className="text-sm text-muted-foreground">{fileName}</span>}
      </div>

      {errors.length > 0 && (
        <Card className="border-destructive">
          <CardContent className="p-4 space-y-1">
            {errors.map((e, i) => (
              <p key={i} className="text-sm text-destructive flex items-start gap-1">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" /> {e}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      {rows.length > 1 && errors.length === 0 && (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Vista previa — {rows.length - 1} jugadores</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-auto max-h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {rows[0].map((h, i) => (
                        <TableHead key={i} className="text-xs whitespace-nowrap">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.slice(1, 51).map((row, ri) => (
                      <TableRow key={ri}>
                        {row.map((cell, ci) => (
                          <TableCell key={ci} className="text-xs py-2">{cell}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {rows.length > 51 && (
                <p className="text-xs text-muted-foreground p-3">Mostrando las primeras 50 filas de {rows.length - 1} totales.</p>
              )}
            </CardContent>
          </Card>

          <Button
            className="gap-2"
            onClick={() => confirmMutation.mutate()}
            disabled={confirmMutation.isPending}
          >
            <CheckCircle className="h-4 w-4" />
            {confirmMutation.isPending ? "Cargando..." : `Confirmar cargue de ${rows.length - 1} jugadores`}
          </Button>
        </>
      )}
    </div>
  );
}

// ---- Main page ----
export default function AdminUpload() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold uppercase flex items-center gap-2">
          <Upload className="h-6 w-6 text-primary" />
          Cargue Masivo
        </h1>
        <a href="/manual-cargue-csv.txt" download className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
          <Download className="h-4 w-4" /> Descargar manual de cargue
        </a>
      </div>

      <Tabs defaultValue="schedule">
        <TabsList>
          <TabsTrigger value="schedule" className="gap-1">
            <FileText className="h-4 w-4" /> Programación
          </TabsTrigger>
          <TabsTrigger value="roster" className="gap-1">
            <FileText className="h-4 w-4" /> Jugadores / Roster
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Cargar Programación de Partidos</CardTitle>
              <CardDescription>
                Suba un archivo .csv con las columnas: <code className="text-xs bg-muted px-1 rounded">division, categoria, equipo_local, equipo_visitante, fecha, fase, ronda</code>.
                Formatos de fecha aceptados: <code className="text-xs bg-muted px-1 rounded">YYYY-MM-DD</code>, <code className="text-xs bg-muted px-1 rounded">YYYY-MM-DDTHH:mm</code>, o <code className="text-xs bg-muted px-1 rounded">M/D/YYYY</code> (hora Bogotá).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScheduleUpload />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roster" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Cargar Jugadores y Roster</CardTitle>
              <CardDescription>
                Suba un archivo .csv con las columnas: <code className="text-xs bg-muted px-1 rounded">nombre, apellido, dorsal, equipo, categoria, division</code>.
                Columnas opcionales: <code className="text-xs bg-muted px-1 rounded">posicion, fecha_nacimiento</code>.
                Los equipos, categorías y divisiones deben existir previamente.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RosterUpload />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
