import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { FileText, Loader2, AlertTriangle } from "lucide-react";

interface Props {
  matchId: string | null;
  /** Texto actual de la casilla Notas (aunque no se haya guardado todavía). */
  notesOverride?: string;
  onClose: () => void;
}

const EMPTY_REFS = [
  { label: "Referee 1", name: "", phone: "", registry: "" },
  { label: "Referee 2", name: "", phone: "", registry: "" },
  { label: "Ref. Mesa 1", name: "", phone: "", registry: "" },
  { label: "Ref. Mesa 2", name: "", phone: "", registry: "" },
];

/**
 * Ventana del reporte de disciplina. Carga los datos del partido (solo lectura), deja completar lo que
 * no está en la plataforma (referees, lesiones, staff faltante, notas) y genera el PDF.
 * Lo que se escribe aquí NO se guarda en la base de datos: solo sale en el PDF.
 */
export default function DisciplineReportDialog({ matchId, notesOverride, onClose }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [refs, setRefs] = useState(EMPTY_REFS);
  const [injuries, setInjuries] = useState("");

  useEffect(() => {
    if (!matchId) return;
    let cancelled = false;
    setData(null);
    setRefs(EMPTY_REFS);
    setInjuries("");
    setLoading(true);
    import("@/lib/disciplineReport")
      .then((m) => m.loadDisciplineData(matchId))
      .then((d) => !cancelled && setData(notesOverride !== undefined ? { ...d, notes: notesOverride } : d))
      .catch((e) => {
        toast({ title: "No se pudieron cargar los datos", description: e?.message ?? String(e), variant: "destructive" });
        onClose();
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  const set = (k: string, v: string) => setData((d: any) => ({ ...d, [k]: v }));
  const setRef = (i: number, k: "name" | "phone" | "registry", v: string) =>
    setRefs((r) => r.map((x, j) => (j === i ? { ...x, [k]: v } : x)));

  const generate = async () => {
    try {
      const { downloadDisciplinePdf } = await import("@/lib/disciplineReport");
      downloadDisciplinePdf({ ...data, referees: refs, injuries });
      onClose();
    } catch (e: any) {
      toast({ title: "No se pudo generar el PDF", description: e?.message ?? String(e), variant: "destructive" });
    }
  };

  return (
    <Dialog open={!!matchId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" /> Reporte de disciplina
          </DialogTitle>
          <DialogDescription>
            Revisa y completa lo que falte. Lo que escribas aquí solo sale en el PDF, no se guarda en la plataforma.
          </DialogDescription>
        </DialogHeader>

        {loading || !data ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando datos del partido...
          </div>
        ) : (
          <div className="space-y-5">
            <div className="rounded-md bg-muted/50 p-3 text-sm space-y-1">
              <div className="font-semibold">
                {data.homeTeam} vs {data.awayTeam}
              </div>
              <div className="text-muted-foreground">
                {data.league} · {data.division} · {data.dateText} {data.timeText}
                {data.venue ? ` · ${data.venue}` : ""}
              </div>
              <div className="text-muted-foreground">
                Sanciones registradas: {data.sanctions.length}
                {data.homeScore !== null ? ` · Marcador: ${data.homeScore} - ${data.awayScore}` : ""}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-semibold">Referees (obligatorio llenar cada vez)</Label>
              {refs.map((r, i) => (
                <div key={r.label} className="grid grid-cols-12 gap-2 items-center">
                  <span className="col-span-12 sm:col-span-2 text-xs text-muted-foreground">{r.label}</span>
                  <Input className="col-span-12 sm:col-span-5" placeholder="Nombre" value={r.name} onChange={(e) => setRef(i, "name", e.target.value)} />
                  <Input className="col-span-6 sm:col-span-3" placeholder="Celular" value={r.phone} onChange={(e) => setRef(i, "phone", e.target.value)} />
                  <Input className="col-span-6 sm:col-span-2" placeholder="Registro #" value={r.registry} onChange={(e) => setRef(i, "registry", e.target.value)} />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(
                [
                  ["homeCoach", "Coach local"],
                  ["awayCoach", "Coach visitante"],
                  ["homeDelegate", "Delegado local"],
                  ["awayDelegate", "Delegado visitante"],
                ] as const
              ).map(([k, label]) => (
                <div key={k} className="space-y-1">
                  <Label className="text-xs">
                    {label}
                    {!data[k] && <span className="text-amber-600 ml-1">(no está en la plataforma)</span>}
                  </Label>
                  <Input value={data[k]} onChange={(e) => set(k, e.target.value)} />
                </div>
              ))}
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Lesiones (opcional)</Label>
              <Input placeholder="Ej: #10 Juan Pérez, golpe en la rodilla" value={injuries} onChange={(e) => setInjuries(e.target.value)} />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Notas del partido (informe del referee)</Label>
              {!data.notes?.trim() && (
                <div className="flex items-center gap-1 text-xs text-amber-600">
                  <AlertTriangle className="h-3 w-3" /> Este partido no tiene notas. Puedes escribirlas aquí (solo para este PDF).
                </div>
              )}
              <Textarea rows={5} value={data.notes} onChange={(e) => set("notes", e.target.value)} />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button className="gap-1" onClick={generate}>
                <FileText className="h-4 w-4" /> Generar PDF
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
