import { useRef, useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Plus, Pencil, Trash2, Save, X, Upload, Loader2, Users, ImageOff, Building2 } from "lucide-react";
import TeamShield from "@/components/home/TeamShield";
import { CatChip, FormCard, Field, SearchBar, Empty, StatChip } from "@/components/admin/AdminBits";
import { toast } from "@/hooks/use-toast";

const BUCKET = "club-logos";

function logoPublicUrl(fileName: string) {
  return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/club-logo?path=${encodeURIComponent(fileName)}`;
}

async function compressToWebp(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const max = 300;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo procesar la imagen");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.85));
  if (!blob) throw new Error("No se pudo convertir la imagen a WebP");
  return blob;
}

export default function AdminClubs() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [newName, setNewName] = useState("");
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showEmpty, setShowEmpty] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const targetClubId = useRef<string | null>(null);
  const teamFileInputRef = useRef<HTMLInputElement | null>(null);
  const targetTeamId = useRef<string | null>(null);

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

  const { data: clubs = [], isLoading: loadingClubs } = useQuery({
    queryKey: ["admin-clubs-crud"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clubs").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: teams = [], isLoading: loadingTeams } = useQuery({
    queryKey: ["admin-clubs-teams", activeTournamentId],
    enabled: !!activeTournamentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("id, name, club_id, logo_url, categories(name)")
        .eq("tournament_id", activeTournamentId as string)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const isLoading = loadingClubs || loadingTeams;

  const norm = (v: any) => String(v ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Todos los clubes con sus equipos de esta edición (los que no tienen equipos quedan al final)
  const allGroups = useMemo(() => {
    const byClub = new Map<string, { club: any; teams: any[] }>();
    (clubs as any[]).forEach((c) => byClub.set(c.id, { club: c, teams: [] }));
    for (const t of teams as any[]) byClub.get(t.club_id)?.teams.push(t);
    return Array.from(byClub.values()).sort((a, b) => a.club.name.localeCompare(b.club.name));
  }, [clubs, teams]);

  const withTeams = allGroups.filter((g) => g.teams.length > 0);
  const withoutTeams = allGroups.filter((g) => g.teams.length === 0);
  const missingClubLogos = withTeams.filter((g) => !g.club.logo_url).length;
  const missingTeamLogos = (teams as any[]).filter((t) => !t.logo_url && !(clubs as any[]).find((c) => c.id === t.club_id)?.logo_url).length;

  const clubGroups = useMemo(() => {
    const base = showEmpty ? allGroups : withTeams;
    const q = norm(search).trim();
    if (!q) return base;
    return base.filter((g) => norm(`${g.club.name} ${g.teams.map((t: any) => `${t.name} ${t.categories?.name ?? ""}`).join(" ")}`).includes(q));
  }, [allGroups, showEmpty, search]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("clubs").insert({ name: newName });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-clubs-crud"] });
      setSearch(newName);
      setShowEmpty(true);
      setNewName("");
      toast({ title: "Club creado", description: "Aparece abajo. Sube su logo y créale equipos en Equipos." });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from("clubs").update({ name }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-clubs-crud"] });
      setEditingId(null);
      toast({ title: "Club actualizado" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clubs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-clubs-crud"] });
      toast({ title: "Club eliminado" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const pickFile = (clubId: string) => {
    targetClubId.current = clubId;
    fileInputRef.current?.click();
  };

  const pickTeamFile = (teamId: string) => {
    targetTeamId.current = teamId;
    teamFileInputRef.current?.click();
  };

  const handleTeamFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const teamId = targetTeamId.current;
    e.target.value = "";
    if (!file || !teamId) return;
    setUploadingId(teamId);
    try {
      const blob = await compressToWebp(file);
      const fileName = `teams/${teamId}.webp`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(fileName, blob, { contentType: "image/webp", upsert: true });
      if (upErr) throw upErr;
      const url = `${logoPublicUrl(fileName)}&v=${Date.now()}`;
      const { error: dbErr } = await supabase.from("teams").update({ logo_url: url }).eq("id", teamId);
      if (dbErr) throw dbErr;
      queryClient.invalidateQueries({ queryKey: ["admin-clubs-teams"] });
      queryClient.invalidateQueries({ queryKey: ["all-teams"] });
      toast({ title: "Logo del equipo actualizado" });
    } catch (err: any) {
      toast({ title: "Error al subir el logo del equipo", description: err?.message ?? String(err), variant: "destructive" });
    } finally {
      setUploadingId(null);
      targetTeamId.current = null;
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const clubId = targetClubId.current;
    e.target.value = "";
    if (!file || !clubId) return;
    setUploadingId(clubId);
    try {
      const blob = await compressToWebp(file);
      const fileName = `${clubId}.webp`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(fileName, blob, { contentType: "image/webp", upsert: true });
      if (upErr) throw upErr;
      const url = `${logoPublicUrl(fileName)}&v=${Date.now()}`;
      const { error: dbErr } = await supabase.from("clubs").update({ logo_url: url }).eq("id", clubId);
      if (dbErr) throw dbErr;
      queryClient.invalidateQueries({ queryKey: ["admin-clubs-crud"] });
      toast({ title: "Logo actualizado" });
    } catch (err: any) {
      toast({ title: "Error al subir el logo", description: err?.message ?? String(err), variant: "destructive" });
    } finally {
      setUploadingId(null);
      targetClubId.current = null;
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-8"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-6">
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      <input ref={teamFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleTeamFile} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold uppercase">
          <Shield className="h-6 w-6 text-primary" /> Gestión de Clubes
        </h1>
        {activeTournament && <Badge className="text-xs">Mostrando equipos de: {activeTournament.name}</Badge>}
      </div>

      <div className="flex flex-wrap gap-3">
        <StatChip icon={Building2} label="Clubes con equipos" value={withTeams.length} />
        <StatChip icon={Users} label="Equipos en la edición" value={(teams as any[]).length} />
        <StatChip icon={ImageOff} label="Clubes sin logo" value={missingClubLogos} warn={missingClubLogos > 0} />
        <StatChip icon={ImageOff} label="Equipos sin ningún logo" value={missingTeamLogos} warn={missingTeamLogos > 0} />
      </div>

      <FormCard icon={Plus} title="Agregar club">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Nombre">
            <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nombre del club" className="w-[240px]" />
          </Field>
          <Button onClick={() => createMutation.mutate()} disabled={!newName.trim() || createMutation.isPending} className="gap-1">
            <Plus className="h-4 w-4" /> Agregar
          </Button>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">El logo se sube después de crear el club. Los clubes son compartidos entre todas las ediciones.</p>
      </FormCard>

      {!activeTournamentId && (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            No hay un torneo activo. Ve a "Torneos" para ver equipos agrupados por club.
          </CardContent>
        </Card>
      )}

      {activeTournamentId && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <SearchBar value={search} onChange={setSearch} placeholder="Buscar club, equipo o categoría…" shown={clubGroups.length} total={showEmpty ? allGroups.length : withTeams.length} />
            {withoutTeams.length > 0 && (
              <label className="flex cursor-pointer items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs">
                <input type="checkbox" checked={showEmpty} onChange={(e) => setShowEmpty(e.target.checked)} />
                Mostrar clubes sin equipos en esta edición ({withoutTeams.length})
              </label>
            )}
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {clubGroups.map(({ club, teams: clubTeams }) => (
              <Card key={club.id} className="overflow-hidden rounded-2xl shadow-sm">
                <div className="flex items-center gap-3 border-b bg-primary/10 px-4 py-3">
                  <TeamShield name={club.name} logo={club.logo_url} size="lg" />
                  <div className="min-w-0 flex-1 leading-tight">
                    {editingId === club.id ? (
                      <div className="flex items-center gap-1">
                        <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-8" autoFocus />
                        <Button size="sm" className="h-8 w-8 shrink-0 p-0" title="Guardar" onClick={() => updateMutation.mutate({ id: club.id, name: editName })}><Save className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 shrink-0 p-0" title="Cancelar" onClick={() => setEditingId(null)}><X className="h-4 w-4" /></Button>
                      </div>
                    ) : (
                      <p className="truncate font-display text-lg font-bold uppercase text-primary">{club.name}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {clubTeams.length} {clubTeams.length === 1 ? "equipo" : "equipos"}
                      {!club.logo_url && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-800">Sin logo</span>}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button size="sm" variant="outline" className="h-8 gap-1 bg-card px-2" disabled={uploadingId === club.id} onClick={() => pickFile(club.id)} title="Subir logo del club">
                      {uploadingId === club.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      <span className="text-xs">Logo</span>
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Cambiar nombre" onClick={() => { setEditingId(club.id); setEditName(club.name); }}><Pencil className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" title="Eliminar club" onClick={() => { if (window.confirm(`¿Eliminar el club "${club.name}"? Esta acción no se puede deshacer.`)) deleteMutation.mutate(club.id); }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>

                {clubTeams.length === 0 ? (
                  <p className="px-4 py-4 text-sm text-muted-foreground">Sin equipos en esta edición.</p>
                ) : (
                  <ul className="divide-y">
                    {clubTeams.map((t: any) => (
                      <li key={t.id} className="flex items-center gap-3 px-4 py-2 hover:bg-muted/40">
                        <TeamShield name={t.name} logo={t.logo_url ?? club.logo_url} size="md" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">{t.name}</p>
                          {!t.logo_url && <p className="text-[11px] text-muted-foreground">{club.logo_url ? "Usa el logo del club" : "Sin logo"}</p>}
                        </div>
                        <CatChip name={t.categories?.name} />
                        <Button size="sm" variant="ghost" className="h-8 gap-1 px-2" disabled={uploadingId === t.id} onClick={() => pickTeamFile(t.id)} title="Subir logo propio del equipo">
                          {uploadingId === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                          <span className="hidden text-[11px] sm:inline">Logo equipo</span>
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            ))}
          </div>
          {clubGroups.length === 0 && (
            <Card><Empty icon={Shield} text={search ? `Sin resultados para "${search}".` : "Sin equipos aún en esta edición."} /></Card>
          )}
        </>
      )}
    </div>
  );
}
