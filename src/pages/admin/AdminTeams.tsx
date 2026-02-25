import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Plus, Pencil, Trash2, Save, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function AdminTeams() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editClubId, setEditClubId] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");
  const [newName, setNewName] = useState("");
  const [newClubId, setNewClubId] = useState("");
  const [newCategoryId, setNewCategoryId] = useState("");

  const { data: clubs = [] } = useQuery({
    queryKey: ["admin-clubs-list"],
    queryFn: async () => {
      const { data } = await supabase.from("clubs").select("id, name").order("name");
      return data ?? [];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["admin-categories-list"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id, name, divisions!inner(name)").order("name");
      return data ?? [];
    },
  });

  const { data: teams = [], isLoading } = useQuery({
    queryKey: ["admin-teams-crud"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("id, name, logo_url, club_id, category_id, clubs(name), categories(name, divisions(name))")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("teams").insert({ name: newName, club_id: newClubId, category_id: newCategoryId });
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
    mutationFn: async ({ id, name, club_id, category_id }: { id: string; name: string; club_id: string; category_id: string }) => {
      const { error } = await supabase.from("teams").update({ name, club_id, category_id }).eq("id", id);
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

  if (isLoading) {
    return <div className="flex justify-center py-8"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold uppercase flex items-center gap-2">
        <Users className="h-6 w-6 text-primary" /> Gestión de Equipos
      </h1>

      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2 items-end flex-wrap">
            <div className="space-y-1">
              <label className="text-xs font-medium">Nombre</label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nombre del equipo" className="w-[180px]" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Club</label>
              <Select value={newClubId} onValueChange={setNewClubId}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Seleccionar club" /></SelectTrigger>
                <SelectContent>{clubs.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Categoría</label>
              <Select value={newCategoryId} onValueChange={setNewCategoryId}>
                <SelectTrigger className="w-[220px]"><SelectValue placeholder="Seleccionar categoría" /></SelectTrigger>
                <SelectContent>{categories.map((cat: any) => <SelectItem key={cat.id} value={cat.id}>{cat.divisions?.name} — {cat.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button onClick={() => createMutation.mutate()} disabled={!newName.trim() || !newClubId || !newCategoryId || createMutation.isPending} className="gap-1">
              <Plus className="h-4 w-4" /> Agregar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Club</TableHead>
            <TableHead>Categoría</TableHead>
            <TableHead className="w-[120px]">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {teams.map((t: any) => (
            <TableRow key={t.id}>
              {editingId === t.id ? (
                <>
                  <TableCell><Input value={editName} onChange={e => setEditName(e.target.value)} className="h-8" /></TableCell>
                  <TableCell>
                    <Select value={editClubId} onValueChange={setEditClubId}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>{clubs.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select value={editCategoryId} onValueChange={setEditCategoryId}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>{categories.map((cat: any) => <SelectItem key={cat.id} value={cat.id}>{cat.divisions?.name} — {cat.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" className="h-8 w-8 p-0" onClick={() => updateMutation.mutate({ id: t.id, name: editName, club_id: editClubId, category_id: editCategoryId })}><Save className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setEditingId(null)}><X className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </>
              ) : (
                <>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell>{t.clubs?.name}</TableCell>
                  <TableCell>{t.categories?.divisions?.name} — {t.categories?.name}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => { setEditingId(t.id); setEditName(t.name); setEditClubId(t.club_id); setEditCategoryId(t.category_id); }}><Pencil className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" onClick={() => deleteMutation.mutate(t.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
