import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Palette } from "lucide-react";
import { useTournament } from "@/contexts/TournamentContext";

const FIELDS: { key: string; label: string; type: "color" | "text" }[] = [
  { key: "primary_color", label: "Color primario", type: "color" },
  { key: "header_color", label: "Color del encabezado", type: "color" },
  { key: "footer_color", label: "Color del pie de página", type: "color" },
  { key: "bg_color", label: "Color de fondo", type: "color" },
  { key: "title_color", label: "Color de títulos", type: "color" },
  { key: "text_color", label: "Color del texto", type: "color" },
];

const FONTS = ["Inter", "Oswald", "Roboto", "Poppins", "Montserrat", "Lato", "Open Sans"];
const SIZES = ["14px", "15px", "16px", "17px", "18px"];

export default function AdminAppearance() {
  const { tournaments, currentId, setCurrentId } = useTournament();
  const [selectedId, setSelectedId] = useState<string>(currentId ?? "");
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();

  useEffect(() => { if (!selectedId && currentId) setSelectedId(currentId); }, [currentId]);

  useEffect(() => {
    const t = tournaments.find((x) => x.id === selectedId);
    if (!t) return;
    const v: Record<string, string> = {};
    FIELDS.forEach(f => { v[f.key] = (t as any)[f.key] ?? ""; });
    v.font_family = t.font_family ?? "Inter";
    v.font_size = t.font_size ?? "16px";
    setValues(v);
  }, [selectedId, tournaments]);

  const save = async () => {
    if (!selectedId) return;
    setSaving(true);
    const { error } = await supabase.from("tournaments" as any).update(values).eq("id", selectedId);
    setSaving(false);
    if (error) return toast.error("Error al guardar: " + error.message);
    toast.success("Apariencia guardada");
    qc.invalidateQueries({ queryKey: ["tournaments"] });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-display font-bold uppercase flex items-center gap-2">
        <Palette className="h-6 w-6 text-primary" /> Apariencia del torneo
      </h2>

      <Card>
        <CardHeader><CardTitle className="text-base">Edición</CardTitle></CardHeader>
        <CardContent>
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger className="max-w-sm"><SelectValue placeholder="Selecciona una edición" /></SelectTrigger>
            <SelectContent>
              {tournaments.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Colores</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {FIELDS.map(f => (
            <div key={f.key}>
              <Label className="text-xs">{f.label}</Label>
              <div className="flex gap-2 items-center mt-1">
                <Input
                  type="color"
                  value={values[f.key] || "#000000"}
                  onChange={(e) => setValues(v => ({ ...v, [f.key]: e.target.value }))}
                  className="w-16 h-9 p-1"
                />
                <Input
                  value={values[f.key] || ""}
                  onChange={(e) => setValues(v => ({ ...v, [f.key]: e.target.value }))}
                  placeholder="#000000"
                  className="flex-1"
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Tipografía</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Fuente</Label>
            <Select value={values.font_family || "Inter"} onValueChange={(v) => setValues(x => ({ ...x, font_family: v }))}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FONTS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Tamaño base</Label>
            <Select value={values.font_size || "16px"} onValueChange={(v) => setValues(x => ({ ...x, font_size: v }))}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SIZES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button onClick={save} disabled={saving || !selectedId}>{saving ? "Guardando…" : "Guardar cambios"}</Button>
        {selectedId && selectedId !== currentId && (
          <Button variant="outline" onClick={() => setCurrentId(selectedId)}>Ver esta edición</Button>
        )}
      </div>
    </div>
  );
}
