import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Megaphone, Trash2, Plus, ArrowUp, ArrowDown, Loader2, FileSpreadsheet, ImageIcon } from "lucide-react";
import { useTournament } from "@/contexts/TournamentContext";
import type { Sponsor } from "@/components/SponsorsMarquee";

const BUCKET = "club-logos";

function logoPublicUrl(fileName: string) {
  return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/club-logo?path=${encodeURIComponent(fileName)}`;
}

async function compressToWebp(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const max = 300;
  const scale = Math.min(1, max / bitmap.height);
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo procesar la imagen");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.85));
  if (!blob) throw new Error("No se pudo convertir la imagen a WebP");
  return blob;
}

export default function AdminSponsors() {
  const qc = useQueryClient();
  const { tournaments, activeTournamentId } = useTournament();
  const [tournamentId, setTournamentId] = useState<string>(activeTournamentId ?? "");
  const effectiveId = tournamentId || activeTournamentId || "";
  const tournament = tournaments.find((t) => t.id === effectiveId) as any;

  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const targetId = useRef<string | null>(null);

  const { data: sponsors = [], isLoading } = useQuery({
    queryKey: ["admin-sponsors", effectiveId],
    enabled: !!effectiveId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sponsors" as any)
        .select("*")
        .eq("tournament_id", effectiveId)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as any as Sponsor[];
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-sponsors", effectiveId] });
    qc.invalidateQueries({ queryKey: ["sponsors"] });
  };

  const speed = sponsors[0]?.speed ?? "medium";

  const setSpeed = async (value: string) => {
    const { error } = await supabase.from("sponsors" as any).update({ speed: value }).eq("tournament_id", effectiveId);
    if (error) return toast.error("Error: " + error.message);
    toast.success("Velocidad actualizada");
    refresh();
  };

  const toggleEnabled = async (value: boolean) => {
    const { error } = await supabase
      .from("tournaments" as any)
      .update({ sponsors_enabled: value })
      .eq("id", effectiveId);
    if (error) return toast.error("Error: " + error.message);
    toast.success(value ? "Barra de patrocinadores visible" : "Barra de patrocinadores oculta");
    qc.invalidateQueries({ queryKey: ["tournaments"] });
  };

  const addSponsor = async () => {
    if (!effectiveId) return toast.error("Selecciona una edición");
    if (!newName.trim()) return toast.error("El nombre es obligatorio");
    setBusy(true);
    const { error } = await supabase.from("sponsors" as any).insert({
      tournament_id: effectiveId,
      name: newName.trim(),
      website_url: newUrl.trim() || null,
      display_order: sponsors.length,
      speed,
    });
    setBusy(false);
    if (error) return toast.error("Error: " + error.message);
    setNewName("");
    setNewUrl("");
    toast.success("Patrocinador añadido");
    refresh();
  };

  const updateField = async (id: string, patch: Record<string, any>) => {
    const { error } = await supabase.from("sponsors" as any).update(patch).eq("id", id);
    if (error) return toast.error("Error: " + error.message);
    refresh();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("sponsors" as any).delete().eq("id", id);
    if (error) return toast.error("Error: " + error.message);
    toast.success("Patrocinador eliminado");
    refresh();
  };

  const move = async (index: number, dir: -1 | 1) => {
    const other = index + dir;
    if (other < 0 || other >= sponsors.length) return;
    const a = sponsors[index];
    const b = sponsors[other];
    await supabase.from("sponsors" as any).update({ display_order: other }).eq("id", a.id);
    await supabase.from("sponsors" as any).update({ display_order: index }).eq("id", b.id);
    refresh();
  };

  const pickLogo = (id: string) => {
    targetId.current = id;
    fileRef.current?.click();
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const id = targetId.current;
    e.target.value = "";
    if (!file || !id) return;
    setBusy(true);
    try {
      const blob = await compressToWebp(file);
      const path = `sponsors/${id}.webp`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, blob, { contentType: "image/webp", upsert: true });
      if (upErr) throw upErr;
      const url = `${logoPublicUrl(path)}&v=${Date.now()}`;
      const { error: dbErr } = await supabase.from("sponsors" as any).update({ logo_url: url }).eq("id", id);
      if (dbErr) throw dbErr;
      toast.success("Logo actualizado");
      refresh();
    } catch (err: any) {
      toast.error("Error al subir el logo: " + (err?.message ?? String(err)));
    } finally {
      setBusy(false);
      targetId.current = null;
    }
  };

  const exportAnalytics = async () => {
    const XLSX = await import("xlsx");
    const rows = sponsors.map((s) => ({
      Nombre: s.name,
      URL: s.website_url ?? "",
      "Clics totales": s.click_count ?? 0,
      "Fecha creación": s.created_at ? new Date(s.created_at).toLocaleDateString("es-CO") : "",
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Patrocinadores");
    XLSX.writeFile(wb, "patrocinadores.xlsx");
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-display font-bold uppercase flex items-center gap-2">
        <Megaphone className="h-6 w-6 text-primary" /> Patrocinadores
      </h2>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

      <Card>
        <CardHeader><CardTitle className="text-base">Configuración</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label className="text-xs">Edición</Label>
            <Select value={effectiveId} onValueChange={setTournamentId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Selecciona" /></SelectTrigger>
              <SelectContent>
                {tournaments.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Velocidad</Label>
            <Select value={speed} onValueChange={setSpeed}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="slow">Lento</SelectItem>
                <SelectItem value="medium">Medio</SelectItem>
                <SelectItem value="fast">Rápido</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-3">
            <Switch
              checked={tournament?.sponsors_enabled !== false}
              onCheckedChange={toggleEnabled}
              disabled={!effectiveId}
            />
            <span className="text-sm">Mostrar barra de patrocinadores</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Añadir patrocinador</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] items-end">
          <div>
            <Label className="text-xs">Nombre</Label>
            <Input className="mt-1" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nombre del patrocinador" />
          </div>
          <div>
            <Label className="text-xs">Sitio web</Label>
            <Input className="mt-1" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="https://…" />
          </div>
          <Button onClick={addSponsor} disabled={busy || !effectiveId}>
            <Plus className="h-4 w-4 mr-1" /> Añadir
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Patrocinadores ({sponsors.length})</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : sponsors.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no hay patrocinadores en esta edición.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Logo</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Sitio web</TableHead>
                  <TableHead className="w-24">Activo</TableHead>
                  <TableHead className="w-32">Orden</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sponsors.map((s, i) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <button onClick={() => pickLogo(s.id)} className="flex h-10 w-16 items-center justify-center rounded border bg-muted/40 overflow-hidden">
                        {s.logo_url
                          ? <img src={s.logo_url} alt={`Logo de ${s.name}`} className="h-full w-full object-contain" />
                          : <ImageIcon className="h-4 w-4 text-muted-foreground" />}
                      </button>
                    </TableCell>
                    <TableCell>
                      <Input defaultValue={s.name} onBlur={(e) => e.target.value !== s.name && updateField(s.id, { name: e.target.value })} />
                    </TableCell>
                    <TableCell>
                      <Input defaultValue={s.website_url ?? ""} placeholder="https://…"
                        onBlur={(e) => e.target.value !== (s.website_url ?? "") && updateField(s.id, { website_url: e.target.value || null })} />
                    </TableCell>
                    <TableCell>
                      <Switch checked={!!s.active} onCheckedChange={(v) => updateField(s.id, { active: v })} />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="outline" onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp className="h-4 w-4" /></Button>
                        <Button size="icon" variant="outline" onClick={() => move(i, 1)} disabled={i === sponsors.length - 1}><ArrowDown className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => remove(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Analítica de clics</CardTitle>
          <Button variant="outline" size="sm" onClick={exportAnalytics} disabled={sponsors.length === 0}>
            <FileSpreadsheet className="h-4 w-4 mr-1" /> Exportar Excel
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Logo</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead className="text-right">Clics</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sponsors.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    {s.logo_url
                      ? <img src={s.logo_url} alt={`Logo de ${s.name}`} className="h-8 w-16 object-contain" />
                      : <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>{s.name}</TableCell>
                  <TableCell className="text-right font-semibold">{s.click_count ?? 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}