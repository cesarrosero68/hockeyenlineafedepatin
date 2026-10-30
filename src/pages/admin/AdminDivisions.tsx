import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Plus, Pencil, Trash2, Save, X, Lock } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useTournament } from "@/contexts/TournamentContext";
import { FormCard, Field, StatChip, Empty } from "@/components/admin/AdminBits";

function Logo({ url, name }: { url?: string | null; name: string }) {
  return url ? (
    <img src={url} alt={name} className="h-10 w-10 rounded-lg border bg-white object-contain p-0.5" onError={(e) => ((e.currentTarget.style.visibility = "hidden"))} />
  ) : (
    <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary"><Trophy className="h-5 w-5" /></span>
  );
}

export default function AdminDivisions() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editLogo, setEditLogo] = useState("");
  const [newName, setNewName] = useState("");
  const [newLogo, setNewLogo] = useState("");

  const { viewedTournament, viewedTournamentId, activeTournamentId, isReadOnly } = useTournament();

  const { data: divisions = [], isLoading } = useQuery({
    queryKey: ["admin-divisions-crud", viewedTournamentId],
    enabled: !!viewedTournamentId,
    queryFn: async () => {
      const { data, error } = await supabase.from("divisions").select("*").eq("tournament_id", viewedTournamentId as string).order("name");
      if (error) throw error;
      return data;
    },
    staleTime: 30_000,
  });

  const { data: catCounts = {} as Record<string, number> } = useQuery({
    queryKey: ["admin-divisions-catcount", viewedTournamentId],
    enabled: !!viewedTournamentId,
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("division_id").eq("tournament_id", viewedTournamentId as string);
      const m: Record<string, number> = {};
      (data ?? []).forEach((c: any) => { m[c.division_id] = (m[c.division_id] ?? 0) + 1; });
      return m;
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-divisions-crud"] });
    queryClient.invalidateQueries({ queryKey: ["admin-divisions-catcount"] });
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!activeTournamentId) throw new Error("No hay una edición activa definida");
      if (isReadOnly) throw new Error("Estás viendo una edición cerrada: no se puede crear aquí");
      const { error } = await supabase.from("divisions").insert({ name: newName, tournament_id: activeTournamentId, logo_url: newLogo || null });
      if (error) throw error;
    },
    onSuccess: () => { refresh(); setNewName(""); setNewLogo(""); toast({ title: "División creada" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, name, logo_url }: { id: string; name: string; logo_url: string }) => {
      if (isReadOnly) throw new Error("Estás viendo una edición cerrada: no se puede modificar");
      const { error } = await supabase.from("divisions").update({ name, logo_url: logo_url || null }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { refresh(); setEditingId(null); toast({ title: "División actualizada" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (isReadOnly) throw new Error("Estás viendo una edición cerrada: no se puede eliminar");
      const { error } = await supabase.from("divisions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { refresh(); toast({ title: "División eliminada" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading) {
    return <div className="flex justify-center py-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold uppercase">
          <Trophy className="h-6 w-6 text-primary" /> Divisiones
        </h1>
        <Badge className="text-xs">Edición: {viewedTournament?.name ?? "—"}</Badge>
      </div>

      <div className="flex flex-wrap gap-3">
        <StatChip icon={Trophy} label="Divisiones" value={divisions.length} />
      </div>

      {!viewedTournamentId && (
        <Card className="rounded-2xl"><CardContent className="py-6 text-center text-sm text-muted-foreground">No hay ninguna edición seleccionada. Ve a "Torneos" y elige una.</CardContent></Card>
      )}

      {isReadOnly && (
        <Card className="rounded-2xl border-orange-400/50 bg-orange-50">
          <CardContent className="flex items-center gap-2 py-4 text-sm text-orange-800">
            <Lock className="h-4 w-4 shrink-0" /> Estás viendo una edición cerrada. Solo para consulta.
          </CardContent>
        </Card>
      )}

      {viewedTournamentId && !isReadOnly && (
        <FormCard icon={Plus} title="Nueva división">
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Nombre" className="w-full sm:w-[220px]">
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ej: Masculino" />
            </Field>
            <Field label="Logo (enlace, opcional)" className="w-full sm:w-[300px]">
              <Input value={newLogo} onChange={(e) => setNewLogo(e.target.value)} placeholder="https://…" />
            </Field>
            <Button onClick={() => createMutation.mutate()} disabled={!newName.trim() || createMutation.isPending} className="gap-1">
              <Plus className="h-4 w-4" /> Agregar
            </Button>
          </div>
        </FormCard>
      )}

      {divisions.length === 0 ? (
        <Card className="rounded-2xl"><Empty icon={Trophy} text="Esta edición no tiene divisiones registradas." /></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {divisions.map((d) => {
            const editing = editingId === d.id && !isReadOnly;
            return (
              <Card key={d.id} className="rounded-2xl shadow-sm">
                <CardContent className="p-4">
                  {editing ? (
                    <div className="space-y-3">
                      <Field label="Nombre"><Input value={editName} onChange={(e) => setEditName(e.target.value)} /></Field>
                      <Field label="Logo (enlace)"><Input value={editLogo} onChange={(e) => setEditLogo(e.target.value)} placeholder="https://…" /></Field>
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setEditingId(null)} className="gap-1"><X className="h-4 w-4" /> Cancelar</Button>
                        <Button size="sm" disabled={!editName.trim()} onClick={() => updateMutation.mutate({ id: d.id, name: editName, logo_url: editLogo })} className="gap-1"><Save className="h-4 w-4" /> Guardar</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <Logo url={d.logo_url} name={d.name} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-display text-lg font-bold uppercase">{d.name}</div>
                        <div className="text-xs text-muted-foreground">{catCounts[d.id] ?? 0} categorías</div>
                      </div>
                      {!isReadOnly && (
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8" title="Editar" onClick={() => { setEditingId(d.id); setEditName(d.name); setEditLogo(d.logo_url || ""); }}><Pencil className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" title="Eliminar" onClick={() => { if (window.confirm(`¿Eliminar la división "${d.name}"? Esta acción no se puede deshacer y afecta a todas las categorías, equipos y partidos asociados a ella.`)) deleteMutation.mutate(d.id); }}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
