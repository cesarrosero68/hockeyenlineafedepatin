import { useState, useEffect, useMemo, type CSSProperties } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Palette, RotateCcw, Check, Type, ImageIcon, PenLine, Eye, Lock, Save, Undo2 } from "lucide-react";
import { useTournament } from "@/contexts/TournamentContext";
import { BACKGROUND_PRESETS } from "@/lib/backgrounds";

// Solo se muestran los ajustes que realmente cambian el sitio público.
const DEFAULT_PRIMARY = "#08459B"; // azul Fedepatín (valor original del sitio)
const COLOR_PRESETS = [
  { name: "Azul Fedepatín", hex: DEFAULT_PRIMARY },
  { name: "Rojo", hex: "#C62828" },
  { name: "Verde", hex: "#2E7D32" },
  { name: "Naranja", hex: "#E65100" },
  { name: "Morado", hex: "#6A1B9A" },
  { name: "Turquesa", hex: "#00838F" },
  { name: "Guinda", hex: "#AD1457" },
  { name: "Grafito", hex: "#263238" },
];
// En el sitio solo están cargadas estas dos fuentes; las otras no se verían.
const FONTS = [
  { name: "Inter", hint: "Limpia y moderna (actual)" },
  { name: "Oswald", hint: "Deportiva, más condensada" },
];

const KEYS = ["primary_color", "font_family", "background_style", "background_url", "home_title", "home_subtitle", "footer_text"] as const;
type Values = Record<(typeof KEYS)[number], string>;
const EMPTY: Values = { primary_color: "", font_family: "Inter", background_style: "default", background_url: "", home_title: "", home_subtitle: "", footer_text: "" };

const isHex = (v: string) => /^#[0-9a-f]{6}$/i.test(v.trim());
function hexToHsl(hex: string): string | null {
  if (!isHex(hex)) return null;
  const num = parseInt(hex.trim().slice(1), 16);
  const r = (num >> 16) / 255, g = ((num >> 8) & 0xff) / 255, b = (num & 0xff) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}
const DEFAULT_MESH = "radial-gradient(circle at 20% 15%, hsl(var(--primary) / 0.14), transparent 55%), radial-gradient(circle at 85% 10%, hsl(var(--secondary) / 0.14), transparent 50%)";

function SectionCard({ icon: Icon, title, hint, children }: { icon: any; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <Card className="overflow-hidden rounded-2xl shadow-sm">
      <div className="flex items-center gap-3 border-b bg-primary/10 px-4 py-3">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground"><Icon className="h-5 w-5" /></span>
        <div className="leading-tight">
          <p className="font-display text-lg font-bold uppercase text-primary">{title}</p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
      </div>
      <div className="space-y-4 p-4">{children}</div>
    </Card>
  );
}

export default function AdminAppearance() {
  const { tournaments, currentId, setCurrentId } = useTournament();
  const [selectedId, setSelectedId] = useState<string>(currentId ?? "");
  const [saved, setSaved] = useState<Values>(EMPTY);
  const [values, setValues] = useState<Values>(EMPTY);
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();

  useEffect(() => { if (!selectedId && currentId) setSelectedId(currentId); }, [currentId]);

  useEffect(() => {
    const t: any = tournaments.find((x) => x.id === selectedId);
    if (!t) return;
    const v: Values = {
      primary_color: t.primary_color ?? "",
      font_family: t.font_family ?? "Inter",
      background_style: t.background_style ?? "default",
      background_url: t.background_url ?? "",
      home_title: t.home_title ?? "",
      home_subtitle: t.home_subtitle ?? "",
      footer_text: t.footer_text ?? "",
    };
    setSaved(v);
    setValues(v);
  }, [selectedId, tournaments]);

  const selectedTournament = tournaments.find((x) => x.id === selectedId);
  const textsEditable = selectedTournament?.status === "active";
  const dirty = useMemo(() => KEYS.some((k) => values[k] !== saved[k]), [values, saved]);
  const set = (k: keyof Values, v: string) => setValues((x) => ({ ...x, [k]: v }));

  const changeEdition = (id: string) => {
    if (dirty && !window.confirm("Tienes cambios sin guardar en esta edición. ¿Cambiar de edición y descartarlos?")) return;
    setSelectedId(id);
  };

  const save = async () => {
    if (!selectedId) return;
    if (values.primary_color && !isHex(values.primary_color)) return toast.error("El color debe ser un código como #08459B");
    setSaving(true);
    const payload: Record<string, any> = {};
    KEYS.forEach((k) => { payload[k] = values[k] === "" ? null : values[k]; });
    const { error } = await supabase.from("tournaments" as any).update(payload).eq("id", selectedId);
    setSaving(false);
    if (error) return toast.error("Error al guardar: " + error.message);
    setSaved(values);
    toast.success("Apariencia guardada");
    qc.invalidateQueries({ queryKey: ["tournaments"] });
  };

  const resetDefaults = async () => {
    if (!selectedId) return;
    setSaving(true);
    const { error } = await supabase.from("tournaments" as any).update({
      primary_color: null, font_family: null, background_style: null, background_url: null,
    }).eq("id", selectedId);
    setSaving(false);
    if (error) return toast.error("Error: " + error.message);
    const root = document.documentElement;
    ["--primary", "--tournament-font", "--page-bg-image", "--page-bg-size", "--page-bg-photo"].forEach((p) => root.style.removeProperty(p));
    document.body.style.fontFamily = "";
    const v = { ...values, primary_color: "", font_family: "Inter", background_style: "default", background_url: "" };
    setValues(v);
    setSaved(v);
    toast.success("Colores, fuente y fondo restablecidos");
    qc.invalidateQueries({ queryKey: ["tournaments"] });
  };

  // ---- Vista previa en vivo ----
  const effHex = isHex(values.primary_color) ? values.primary_color : DEFAULT_PRIMARY;
  const previewVars = { "--primary": hexToHsl(effHex) } as CSSProperties;
  const preset = BACKGROUND_PRESETS.find((p) => p.key === values.background_style) ?? BACKGROUND_PRESETS[0];
  const previewBg = preset.key === "default" ? DEFAULT_MESH : preset.image ?? "none";
  const previewBgSize = preset.key === "default" ? "auto" : preset.size ?? "auto";
  const fontList = FONTS.some((f) => f.name === values.font_family) ? FONTS : [...FONTS, { name: values.font_family, hint: "Fuente guardada anteriormente" }];

  const preview = (
    <div className="overflow-hidden rounded-xl border bg-background shadow-md" style={{ ...previewVars, fontFamily: `${values.font_family}, sans-serif` }}>
      <div className="relative">
        <div className="absolute inset-0" style={{ backgroundImage: previewBg, backgroundSize: previewBgSize }} />
        {values.background_url && <div className="absolute inset-0 opacity-15" style={{ backgroundImage: `url("${values.background_url}")`, backgroundSize: "cover" }} />}
        <div className="relative">
          <div className="flex items-center justify-between border-b bg-card/95 px-3 py-2">
            <span className="font-display text-xs font-bold tracking-wide text-foreground">FEDEPATÍN</span>
            <span className="flex gap-1.5">{[0, 1, 2].map((i) => <span key={i} className="h-1.5 w-8 rounded-full bg-muted-foreground/30" />)}</span>
          </div>
          <div className="px-3 py-4 text-white" style={{ backgroundImage: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))" }}>
            <p className="font-display text-lg font-bold uppercase leading-tight">{values.home_title || "Fedepatín - Hockey en Línea"}</p>
            <p className="mt-1 text-[11px] leading-snug opacity-90">{values.home_subtitle || "Programación, resultados, posiciones y estadísticas en tiempo real"}</p>
            <span className="mt-2 inline-block rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold">{selectedTournament?.name ?? "Torneo"}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 p-3">
            {["Copa A", "Copa B"].map((n) => (
              <div key={n} className="overflow-hidden rounded-lg border bg-card">
                <div className="px-2 py-1 text-[10px] font-bold text-white" style={{ backgroundColor: "hsl(var(--primary))" }}>{n}</div>
                <div className="space-y-1 p-2">
                  <div className="h-1.5 w-full rounded bg-muted" /><div className="h-1.5 w-3/4 rounded bg-muted" />
                  <span className="mt-1 inline-block rounded px-2 py-0.5 text-[9px] font-semibold text-white" style={{ backgroundColor: "hsl(var(--primary))" }}>Ver más</span>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t bg-card/95 px-3 py-2 text-center text-[9px] text-muted-foreground">
            {values.footer_text || "© 2026 Fedepatin - Hockey en Línea. Todos los derechos reservados."}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold uppercase">
          <Palette className="h-6 w-6 text-primary" /> Apariencia del torneo
        </h1>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Edición</span>
          <Select value={selectedId} onValueChange={changeEdition}>
            <SelectTrigger className="w-[220px] bg-card"><SelectValue placeholder="Selecciona una edición" /></SelectTrigger>
            <SelectContent>
              {tournaments.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}{t.status === "active" ? " (activa)" : ""}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <SectionCard icon={Palette} title="Color principal" hint="Cambia botones, encabezados, tarjetas y el menú del sitio.">
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map((c) => {
                const on = effHex.toLowerCase() === c.hex.toLowerCase();
                return (
                  <button key={c.hex} type="button" onClick={() => set("primary_color", c.hex === DEFAULT_PRIMARY ? "" : c.hex)}
                    className={`flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-sm transition-colors ${on ? "border-primary bg-primary/10 font-semibold" : "bg-card hover:bg-muted"}`}>
                    <span className="grid h-7 w-7 place-items-center rounded-full text-white" style={{ backgroundColor: c.hex }}>{on && <Check className="h-4 w-4" />}</span>
                    {c.name}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <Label className="text-xs">Otro color</Label>
                <Input type="color" value={effHex} onChange={(e) => set("primary_color", e.target.value.toUpperCase())} className="mt-1 h-10 w-20 cursor-pointer p-1" />
              </div>
              <div>
                <Label className="text-xs">Código</Label>
                <Input value={values.primary_color} onChange={(e) => set("primary_color", e.target.value)} placeholder={DEFAULT_PRIMARY} className="mt-1 w-44 font-mono" />
              </div>
              {values.primary_color && !isHex(values.primary_color) && <p className="pb-2 text-xs text-destructive">Usa el formato #RRGGBB, por ejemplo #08459B.</p>}
              {!values.primary_color && <p className="pb-2 text-xs text-muted-foreground">Usando el azul original del sitio.</p>}
            </div>
          </SectionCard>

          <SectionCard icon={ImageIcon} title="Fondo de las páginas" hint="Haz clic en el estilo que prefieras.">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4" style={previewVars}>
              {BACKGROUND_PRESETS.map((p) => {
                const on = (values.background_style || "default") === p.key;
                const img = p.key === "default" ? DEFAULT_MESH : p.image ?? "none";
                return (
                  <button key={p.key} type="button" onClick={() => set("background_style", p.key)}
                    className={`overflow-hidden rounded-xl border text-left transition-shadow hover:shadow-md ${on ? "ring-2 ring-primary" : ""}`}>
                    <div className="relative h-16 bg-background" style={{ backgroundImage: img, backgroundSize: p.key === "default" ? "auto" : p.size ?? "auto" }}>
                      {on && <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-primary text-primary-foreground"><Check className="h-3 w-3" /></span>}
                    </div>
                    <p className="truncate px-2 py-1.5 text-xs font-medium">{p.label.replace(/\s*\(.*\)/, "")}</p>
                  </button>
                );
              })}
            </div>
            <div>
              <Label className="text-xs">Imagen de fondo propia (opcional)</Label>
              <Input className="mt-1" value={values.background_url} onChange={(e) => set("background_url", e.target.value)} placeholder="https://… (enlace a una imagen)" />
              <p className="mt-1 text-[11px] text-muted-foreground">Se muestra muy tenue detrás del contenido. Déjalo vacío para no usar imagen.</p>
            </div>
          </SectionCard>

          <SectionCard icon={Type} title="Tipografía" hint="Letra del texto general del sitio.">
            <div className="grid gap-3 sm:grid-cols-2">
              {fontList.map((f) => {
                const on = values.font_family === f.name;
                return (
                  <button key={f.name} type="button" onClick={() => set("font_family", f.name)}
                    className={`rounded-xl border p-3 text-left transition-colors ${on ? "border-primary bg-primary/5 ring-1 ring-primary" : "bg-card hover:bg-muted/50"}`}>
                    <p className="text-2xl font-semibold" style={{ fontFamily: `${f.name}, sans-serif` }}>Aa Gol 123</p>
                    <p className="mt-1 text-sm font-semibold">{f.name} {on && <Check className="ml-1 inline h-4 w-4 text-primary" />}</p>
                    <p className="text-xs text-muted-foreground">{f.hint}</p>
                  </button>
                );
              })}
            </div>
          </SectionCard>

          <SectionCard icon={PenLine} title="Textos de la página de inicio" hint="Lo que se lee en el encabezado azul y al pie del sitio.">
            {!textsEditable && (
              <p className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                <Lock className="h-3.5 w-3.5" /> Estos textos solo se pueden editar en la edición activa.
              </p>
            )}
            <div>
              <Label className="text-xs">Título principal</Label>
              <Input className="mt-1" disabled={!textsEditable} value={values.home_title} onChange={(e) => set("home_title", e.target.value)} placeholder="Fedepatín - Hockey en Línea" />
            </div>
            <div>
              <Label className="text-xs">Subtítulo</Label>
              <Textarea className="mt-1" rows={2} disabled={!textsEditable} value={values.home_subtitle} onChange={(e) => set("home_subtitle", e.target.value)} placeholder="Programación, resultados, posiciones y estadísticas en tiempo real" />
            </div>
            <div>
              <Label className="text-xs">Texto del pie de página</Label>
              <Input className="mt-1" disabled={!textsEditable} value={values.footer_text} onChange={(e) => set("footer_text", e.target.value)} placeholder="© 2026 Fedepatin - Hockey en Línea. Todos los derechos reservados." />
            </div>
          </SectionCard>
        </div>

        <aside className="lg:sticky lg:top-[105px] lg:self-start">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><Eye className="h-4 w-4 text-primary" /> Vista previa en vivo</div>
          {preview}
          <p className="mt-2 text-[11px] text-muted-foreground">Así se vería el sitio con tus cambios. Nada se publica hasta que presiones Guardar.</p>
        </aside>
      </div>

      {/* Barra de acciones fija */}
      <div className="sticky bottom-0 z-20 -mx-4 flex flex-wrap items-center gap-2 border-t bg-card/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6">
        {dirty ? <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Cambios sin guardar</Badge> : <span className="text-xs text-muted-foreground">Todo guardado</span>}
        <div className="ml-auto flex flex-wrap gap-2">
          {selectedId && selectedId !== currentId && (
            <Button variant="outline" onClick={() => setCurrentId(selectedId)}>Ver esta edición</Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" disabled={saving || !selectedId}><RotateCcw className="mr-1 h-4 w-4" /> Valores originales</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Volver a los valores originales?</AlertDialogTitle>
                <AlertDialogDescription>Se restablecen el color, la fuente y el fondo de esta edición. Los textos no se tocan.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={resetDefaults}>Restablecer</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button variant="outline" onClick={() => setValues(saved)} disabled={!dirty || saving}><Undo2 className="mr-1 h-4 w-4" /> Descartar</Button>
          <Button onClick={save} disabled={!dirty || saving || !selectedId}><Save className="mr-1 h-4 w-4" />{saving ? "Guardando…" : "Guardar cambios"}</Button>
        </div>
      </div>
    </div>
  );
}
