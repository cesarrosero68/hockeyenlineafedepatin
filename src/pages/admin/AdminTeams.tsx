import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Pencil, Trash2, Save, X, Shield, Layers } from "lucide-react";
import TeamShield from "@/components/home/TeamShield";
import { CatChip, FormCard, Field, SearchBar, Empty, StatChip, catStyle } from "@/components/admin/AdminBits";
import { toast } from "@/hooks/use-toast";

export default function AdminTeams() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editClubId, setEditClubId] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");
  const [editGroup, setEditGroup] = useState("none");
  const [newName, setNewName] = useState("");
  const [newClubId, setNewClubId] = useState("");
  const [newCategoryId, setNewCategoryId] = useState("");
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<string>("all");

  // Active tournament being managed
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

  const { data: clubs = [] } = useQuery({
    queryKey: ["admin-clubs-list"],
    queryFn: async () => {
      const { data } = await supabase.from("clubs").select("id, name").order("name");
      return data ?? [];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["admin-categories-list", activeTournamentId],
    queryFn: async () => {
      let q: any = supabase.from("categories").select("id, name, divisions!inner(name)").order("name");
      if (activeTournamentId) q = q.eq("tournament_id", activeTournamentId);
      const { data } = await q;
      return data ?? [];
    },
  });

  const { data: teams = [], isLoading } = useQuery({
    queryKey: ["admin-teams-crud", activeTournamentId],
    enabled: !!activeTournamentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("id, name, logo_url, club_id, category_id, group_name, tournament_id, clubs(name, logo_url), categories(name, divisions(name))")
        .eq("tournament_id", activeTournamentId as string)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!activeTournamentId) throw new Error("No hay un torneo activo definido");
      const { error } = await supabase.from("teams").insert({
        name: newName,
        club_id: newClubId,
        category_id: newCategoryId,
        tournament_id: activeTournamentId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-teams-crud"] });
      setNewName(""); setNewClubId(""); setNewCategoryId("");
      toast({ title: "Equipo creado" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, name, club_id, category_id, group_name }: { id: string; name: string; club_id: string; category_id: string; group_name: string | null }) => {
      const { error } = await (supabase as any).from("teams").update({ name, club_id, category_id, group_name }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-teams-crud"] });
      setEditingId(null);
      toast({ title: "Equipo actualizado" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("teams").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-teams-crud"] });
      toast({ title: "Equipo eliminado" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const norm = (v: any) => String(v ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Conteo por categoría para los filtros rápidos
  const catCounts = useMemo(() => {
    const m = new Map<string, { id: string; name: string; n: number }>();
    (teams as any[]).forEach((t) => {
      const id = t.category_id;
      const cur = m.get(id) ?? { id, name: t.categories?.name ?? "—", n: 0 };
      cur.n++;
      m.set(id, cur);
    });
    return Array.from(m.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [teams]);

  const visibleTeams = useMemo(() => {
    const q = norm(search).trim();
    return (teams as any[])
      .filter((t) => catFilter === "all" || t.category_id === catFilter)
      .filter((t) => !q || norm(`${t.name} ${t.clubs?.name ?? ""} ${t.categories?.name ?? ""} ${t.categories?.divisions?.name ?? ""} ${t.group_name ? "grupo " + t.group_name : ""}`).includes(q))
      .sort((a, b) => String(a.categories?.name ?? "").localeCompare(String(b.categories?.name ?? "")) || a.name.localeCompare(b.name));
  }, [teams, search, catFilter]);

  if (isLoading) {
    return <div className="flex justify-center py-8"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  const HEAD = "bg-primary/10 text-xs font-bold uppercase tracking-wide text-primary";
  const clubOptions = clubs.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>);
  const categoryOptions = categories.map((cat: any) => <SelectItem key={cat.id} value={cat.id}>{cat.divisions?.name} — {cat.name}</SelectItem>);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold uppercase">
          <Users className="h-6 w-6 text-primary" /> Gestión de Equipos
        </h1>
        {activeTournament && <Badge className="text-xs">Gestionando: {activeTournament.name}</Badge>}
      </div>

      {!activeTournamentId && (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            No hay un torneo activo. Ve a "Torneos" y marca una edición como activa antes de gestionar equipos.
          </CardContent>
        </Card>
      )}

      {activeTournamentId && (
        <>
          <div className="flex flex-wrap gap-3">
            <StatChip icon={Users} label="Equipos" value={(teams as any[]).length} />
            <StatChip icon={Layers} label="Categorías" value={catCounts.length} />
            <StatChip icon={Shield} label="Clubes participando" value={new Set((teams as any[]).map((t) => t.club_id)).size} />
          </div>

          <FormCard icon={Plus} title="Agregar equipo">
            <div className="flex flex-wrap items-end gap-3">
              <Field label="Nombre"><Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nombre del equipo" className="w-[200px]" /></Field>
              <Field label="Club">
                <Select value={newClubId} onValueChange={setNewClubId}>
                  <SelectTrigger className="w-[200px]"><SelectValue placeholder="Seleccionar club" /></SelectTrigger>
                  <SelectContent>{clubOptions}</SelectContent>
                </Select>
              </Field>
              <Field label="Categoría">
                <Select value={newCategoryId} onValueChange={setNewCategoryId}>
                  <SelectTrigger className="w-[240px]"><SelectValue placeholder="Seleccionar categoría" /></SelectTrigger>
                  <SelectContent>{categoryOptions}</SelectContent>
                </Select>
              </Field>
              <Button onClick={() => createMutation.mutate()} disabled={!newName.trim() || !newClubId || !newCategoryId || createMutation.isPending} className="gap-1">
                <Plus className="h-4 w-4" /> Agregar
              </Button>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">El logo del equipo se sube en la pantalla Clubes.</p>
          </FormCard>

          {/* Filtros rápidos por categoría */}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setCatFilter("all")}
              className={`rounded-full border px-3 py-1 text-sm transition-colors ${catFilter === "all" ? "border-primary bg-primary text-primary-foreground font-semibold" : "bg-card hover:bg-muted"}`}>
              Todas ({(teams as any[]).length})
            </button>
            {catCounts.map((c) => {
              const on = catFilter === c.id;
              return (
                <button key={c.id} type="button" onClick={() => setCatFilter(on ? "all" : c.id)}
                  className={`rounded-full border px-3 py-1 text-sm font-semibold transition-shadow ${on ? "ring-2 ring-primary" : "hover:shadow-sm"}`}
                  style={catStyle(c.name)}>
                  {c.name} ({c.n})
                </button>
              );
            })}
          </div>

          <SearchBar value={search} onChange={setSearch} placeholder="Buscar equipo, club o grupo…" shown={visibleTeams.length} total={(teams as any[]).length} />

          <Card className="overflow-hidden rounded-2xl shadow-sm">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className={HEAD}>Equipo</TableHead>
                    <TableHead className={HEAD}>Club</TableHead>
                    <TableHead className={HEAD}>Categoría</TableHead>
                    <TableHead className={HEAD}>Grupo</TableHead>
                    <TableHead className={`w-[110px] ${HEAD}`}>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleTeams.map((t: any) => (
                    <TableRow key={t.id} className="odd:bg-muted/30">
                      {editingId === t.id ? (
                        <>
                          <TableCell><Input value={editName} onChange={e => setEditName(e.target.value)} className="h-8 min-w-[150px]" /></TableCell>
                          <TableCell>
                            <Select value={editClubId} onValueChange={setEditClubId}>
                              <SelectTrigger className="h-8 min-w-[150px]"><SelectValue /></SelectTrigger>
                              <SelectContent>{clubOptions}</SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Select value={editCategoryId} onValueChange={setEditCategoryId}>
                              <SelectTrigger className="h-8 min-w-[200px]"><SelectValue /></SelectTrigger>
                              <SelectContent>{categoryOptions}</SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Select value={editGroup} onValueChange={setEditGroup}>
                              <SelectTrigger className="h-8 w-[120px]"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Sin grupo</SelectItem>
                                <SelectItem value="A">A</SelectItem>
                                <SelectItem value="B">B</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="sm" className="h-8 w-8 p-0" title="Guardar" onClick={() => updateMutation.mutate({ id: t.id, name: editName, club_id: editClubId, category_id: editCategoryId, group_name: editGroup === "none" ? null : editGroup })}><Save className="h-4 w-4" /></Button>
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Cancelar" onClick={() => setEditingId(null)}><X className="h-4 w-4" /></Button>
                            </div>
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <TeamShield name={t.name} logo={t.logo_url ?? t.clubs?.logo_url} size="md" />
                              <span className="font-semibold">{t.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{t.clubs?.name}</TableCell>
                          <TableCell>
                            <CatChip name={t.categories?.name} />
                            <span className="mt-0.5 block text-[11px] text-muted-foreground">{t.categories?.divisions?.name}</span>
                          </TableCell>
                          <TableCell>
                            {t.group_name ? <Badge variant="secondary" className="text-xs">Grupo {t.group_name}</Badge> : <span className="text-xs text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Editar" onClick={() => { setEditingId(t.id); setEditName(t.name); setEditClubId(t.club_id); setEditCategoryId(t.category_id); setEditGroup(t.group_name ?? "none"); }}><Pencil className="h-4 w-4" /></Button>
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" title="Eliminar" onClick={() => { if (window.confirm(`¿Eliminar el equipo "${t.name}" de ${t.categories?.name}? Esta acción no se puede deshacer y también eliminará sus nóminas y cuerpo técnico asociados.`)) deleteMutation.mutate(t.id); }}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {visibleTeams.length === 0 && (
              <Empty icon={Users} text={search || catFilter !== "all" ? "Sin equipos con este filtro." : "Sin equipos aún en esta edición."} />
            )}
          </Card>
        </>
      )}
    </div>
  );
}
