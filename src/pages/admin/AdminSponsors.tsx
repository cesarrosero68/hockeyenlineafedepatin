import { useMemo, useRef, useState } from "react";
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
import { Megaphone, Trash2, Plus, ArrowUp, ArrowDown, Loader2, FileSpreadsheet, ImageIcon, BarChart3 } from "lucide-react";
import { useTournament } from "@/contexts/TournamentContext";
import type { Sponsor } from "@/components/SponsorsMarquee";
import { formatBogota } from "@/lib/timezone";

const BUCKET = "club-logos";

function logoPublicUrl(fileName: string) {
  return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/club-logo?path=${encodeURIComponent(fileName)}`;
}

async function compressToWebp(file: File, maxHeight = 300): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxHeight / bitmap.height);
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

function isoDay(d: Date) {
  return d.toISOString().slice(0, 10);
}

interface ClickRow { sponsor_id: string | null; clicked_at: string | null; device_type: string | null }
interface ViewRow { page: string; viewed_at: string | null; device_type: string | null }

export default function AdminSponsors() {
  const qc = useQueryClient();
  const { tournaments, activeTournamentId } = useTournament();
  const [tournamentId, setTournamentId] = useState<string>(activeTournamentId ?? "");
  const effectiveId = tournamentId || activeTournamentId || "";
  const tournament = tournaments.find((t) => t.id === effectiveId) as any;

  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newLogo, setNewLogo] = useState<File | null>(null);
  const [newLogoPreview, setNewLogoPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const newLogoRef = useRef<HTMLInputElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const targetId = useRef<string | null>(null);

  const today = new Date();
  const monthAgo = new Date(today.getTime() - 30 * 86400000);
  const [from, setFrom] = useState(isoDay(monthAgo));
  const [to, setTo] = useState(isoDay(today));
  const fromISO = new Date(`${from}T00:00:00-05:00`).toISOString();
  const toISO = new Date(`${to}T23:59:59-05:00`).toISOString();

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

  const sponsorIds = sponsors.map((s) => s.id);

  const { data: clicks = [] } = useQuery({
    queryKey: ["sponsor-clicks", sponsorIds.join(","), fromISO, toISO],
    enabled: sponsorIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sponsor_clicks" as any)
        .select("sponsor_id, clicked_at, device_type")
        .in("sponsor_id", sponsorIds)
        .gte("clicked_at", fromISO)
        .lte("clicked_at", toISO);
      if (error) throw error;
      return (data ?? []) as any as ClickRow[];
    },
  });

  const { data: views = [] } = useQuery({
    queryKey: ["page-views", effectiveId, fromISO, toISO],
    enabled: !!effectiveId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_views" as any)
        .select("page, viewed_at, device_type")
        .eq("tournament_id", effectiveId)
        .gte("viewed_at", fromISO)
        .lte("viewed_at", toISO);
      if (error) throw error;
      return (data ?? []) as any as ViewRow[];
    },
  });

  const sponsorStats = useMemo(() => {
    return sponsors.map((s) => {
      const rows = clicks.filter((c) => c.sponsor_id === s.id);
      const mobile = rows.filter((c) => c.device_type === "mobile").length;
      const last = rows
        .map((c) => c.clicked_at)
        .filter(Boolean)
        .sort()
        .pop();
      return {
        sponsor: s,
        total: rows.length,
        mobile,
        desktop: rows.length - mobile,
        last: last ? formatBogota(last, "dd/MM/yyyy HH:mm") : "—",
      };
    }).sort((a, b) => b.total - a.total);
  }, [sponsors, clicks]);

  const pageStats = useMemo(() => {
    const map = new Map<string, { page: string; total: number; mobile: number; desktop: number }>();
    for (const v of views) {
      const e = map.get(v.page) ?? { page: v.page, total: 0, mobile: 0, desktop: 0 };
      e.total += 1;
      if (v.device_type === "mobile") e.mobile += 1;
      else e.desktop += 1;
      map.set(v.page, e);
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [views]);

  const topPage = pageStats[0];

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

  const pickNewLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    e.target.value = "";
    setNewLogo(file);
    setNewLogoPreview(file ? URL.createObjectURL(file) : null);
  };

  const addSponsor = async () => {
    if (!effectiveId) return toast.error("Selecciona una edición");
    if (!newName.trim()) return toast.error("El nombre es obligatorio");
    setBusy(true);
    try {
      const id = crypto.randomUUID();
      let logo_url: string | null = null;
      if (newLogo) {
        const blob = await compressToWebp(newLogo, 200);
        const path = `sponsors/${id}.webp`;
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, blob, { contentType: "image/webp", upsert: true });
        if (upErr) throw upErr;
        logo_url = `${logoPublicUrl(path)}&v=${Date.now()}`;
      }
      const { error } = await supabase.from("sponsors" as any).insert({
        id,
        tournament_id: effectiveId,
        name: newName.trim(),
        website_url: newUrl.trim() || null,
        logo_url,
        display_order: sponsors.length,
        speed,
      });
      if (error) throw error;
      setNewName("");
      setNewUrl("");
      setNewLogo(null);
      setNewLogoPreview(null);
      toast.success("Patrocinador añadido");
      refresh();
    } catch (err: any) {
      toast.error("Error: " + (err?.message ?? String(err)));
    } finally {
      setBusy(false);
    }
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
      const blob = await compressToWebp(file, 200);
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
    const sponsorRows = sponsorStats.map((r) => ({
      Nombre: r.sponsor.name,
      "Sitio web": r.sponsor.website_url ?? "",
      "Clics totales": r.total,
      "Clics móvil": r.mobile,
      "Clics desktop": r.desktop,
      "Último clic": r.last,
    }));
    const viewRows = pageStats.map((p) => ({
      Página: p.page,
      "Visitas totales": p.total,
      Móvil: p.mobile,
      Desktop: p.desktop,
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sponsorRows), "Patrocinadores");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(viewRows), "Visitas");
    XLSX.writeFile(wb, `analitica_${from}_a_${to}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-display font-bold uppercase flex items-center gap-2">
        <Megaphone className="h-6 w-6 text-primary" /> Patrocinadores
      </h2>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      <input ref={newLogoRef} type="file" accept="image/*" className="hidden" onChange={pickNewLogo} />

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
        <CardContent className="grid gap-3 sm:grid-cols-[1fr_auto_1fr_auto] items-end">
          <div>
            <Label className="text-xs">Nombre</Label>
            <Input className="mt-1" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nombre del patrocinador" />
          </div>
          <div>
            <Label className="text-xs">Logo del patrocinador</Label>
            <button
              type="button"
              onClick={() => newLogoRef.current?.click()}
              className="mt-1 flex h-10 w-28 items-center justify-center gap-2 rounded border border-dashed bg-muted/40 overflow-hidden text-xs text-muted-foreground hover:bg-muted"
            >
              {newLogoPreview
                ? <img src={newLogoPreview} alt="Vista previa del logo" className="h-full w-full object-contain" />
                : <><ImageIcon className="h-4 w-4" /> Subir</>}
            </button>
          </div>
          <div>
            <Label className="text-xs">Sitio web</Label>
            <Input className="mt-1" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="https://…" />
          </div>
          <Button onClick={addSponsor} disabled={busy || !effectiveId}>
            {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />} Añadir
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
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" /> Analítica
          </CardTitle>
          <Button variant="outline" size="sm" onClick={exportAnalytics}>
            <FileSpreadsheet className="h-4 w-4 mr-1" /> Exportar Excel
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-[auto_auto_1fr] items-end">
            <div>
              <Label className="text-xs">Desde</Label>
              <Input type="date" className="mt-1" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Hasta</Label>
              <Input type="date" className="mt-1" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div className="rounded-lg border bg-muted/40 p-3">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Página más visitada</div>
              <div className="font-display text-xl font-bold">
                {topPage ? `${topPage.page} · ${topPage.total}` : "Sin datos en el rango"}
              </div>
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Clics por patrocinador</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Sitio web</TableHead>
                  <TableHead className="text-right">Clics totales</TableHead>
                  <TableHead className="text-right">Clics móvil</TableHead>
                  <TableHead className="text-right">Clics desktop</TableHead>
                  <TableHead>Último clic</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sponsorStats.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-sm text-muted-foreground">Sin datos.</TableCell></TableRow>
                ) : sponsorStats.map((r) => (
                  <TableRow key={r.sponsor.id}>
                    <TableCell>{r.sponsor.name}</TableCell>
                    <TableCell>
                      {r.sponsor.website_url ? (
                        <a href={r.sponsor.website_url} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                          {r.sponsor.website_url}
                        </a>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-right font-semibold">{r.total}</TableCell>
                    <TableCell className="text-right">{r.mobile}</TableCell>
                    <TableCell className="text-right">{r.desktop}</TableCell>
                    <TableCell>{r.last}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Visitas por página</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Página</TableHead>
                  <TableHead className="text-right">Visitas totales</TableHead>
                  <TableHead className="text-right">Móvil</TableHead>
                  <TableHead className="text-right">Desktop</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageStats.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-sm text-muted-foreground">Sin datos.</TableCell></TableRow>
                ) : pageStats.map((p) => (
                  <TableRow key={p.page}>
                    <TableCell>{p.page}</TableCell>
                    <TableCell className="text-right font-semibold">{p.total}</TableCell>
                    <TableCell className="text-right">{p.mobile}</TableCell>
                    <TableCell className="text-right">{p.desktop}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
