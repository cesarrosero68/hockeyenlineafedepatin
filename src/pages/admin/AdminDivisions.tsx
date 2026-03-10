import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy, Plus, Pencil, Trash2, Save, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function AdminDivisions() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editLogo, setEditLogo] = useState("");
  const [newName, setNewName] = useState("");
  const [newLogo, setNewLogo] = useState("");

  const { data: divisions = [], isLoading } = useQuery({
    queryKey: ["admin-divisions-crud"],
    queryFn: async () => {
      const { data, error } = await supabase.from("divisions").select("*").order("name");
      if (error) throw error;
      return data;
    },
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("divisions").insert({ name: newName, logo_url: newLogo || null });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-divisions-crud"] });
      setNewName(""); setNewLogo("");
      toast({ title: "División creada" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, name, logo_url }: { id: string; name: string; logo_url: string }) => {
      const { error } = await supabase.from("divisions").update({ name, logo_url: logo_url || null }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-divisions-crud"] });
      setEditingId(null);
      toast({ title: "División actualizada" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("divisions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-divisions-crud"] });
      toast({ title: "División eliminada" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading) {
    return <div className="flex justify-center py-8"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold uppercase flex items-center gap-2">
        <Trophy className="h-6 w-6 text-primary" /> Gestión de Divisiones
      </h1>

      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2 items-end flex-wrap">
            <div className="space-y-1">
              <label className="text-xs font-medium">Nombre</label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nombre de división" className="w-[200px]" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Logo URL</label>
              <Input value={newLogo} onChange={e => setNewLogo(e.target.value)} placeholder="URL del logo (opcional)" className="w-[250px]" />
            </div>
            <Button onClick={() => createMutation.mutate()} disabled={!newName.trim() || createMutation.isPending} className="gap-1">
              <Plus className="h-4 w-4" /> Agregar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Logo URL</TableHead>
            <TableHead className="w-[120px]">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {divisions.map((d) => (
            <TableRow key={d.id}>
              {editingId === d.id ? (
                <>
                  <TableCell><Input value={editName} onChange={e => setEditName(e.target.value)} className="h-8" /></TableCell>
                  <TableCell><Input value={editLogo} onChange={e => setEditLogo(e.target.value)} className="h-8" /></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" className="h-8 w-8 p-0" onClick={() => updateMutation.mutate({ id: d.id, name: editName, logo_url: editLogo })}><Save className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setEditingId(null)}><X className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </>
              ) : (
                <>
                  <TableCell className="font-medium">{d.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground truncate max-w-[200px]">{d.logo_url || "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => { setEditingId(d.id); setEditName(d.name); setEditLogo(d.logo_url || ""); }}><Pencil className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" onClick={() => deleteMutation.mutate(d.id)}><Trash2 className="h-4 w-4" /></Button>
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
