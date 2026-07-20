import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Database, Pencil, Plus, Power } from "lucide-react";
import { toast } from "sonner";

type T = { id: string; name: string; year: number | null; semester: string | null; season: string | null; status: string };

export default function AdminTournaments() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const empty = { name: "", year: new Date().getFullYear(), semester: "", season: "", status: "active" };
  const [form, setForm] = useState<any>(empty);

  const { data: tournaments = [] } = useQuery({
    queryKey: ["tournaments"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("tournaments").select("*").order("year", { ascending: false });
      return (data ?? []) as T[];
    },
  });

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (t: T) => { setEditing(t); setForm({ name: t.name, year: t.year ?? "", semester: t.semester ?? "", season: t.season ?? "", status: t.status }); setOpen(true); };

  const save = async () => {
    if (!form.name) return toast.error("Nombre requerido");
    const payload = { name: form.name, year: form.year ? Number(form.year) : null, semester: form.semester || null, season: form.season || null, status: form.status };
    try {
      if (editing) {
        const { error } = await (supabase as any).from("tournaments").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("tournaments").insert(payload);
        if (error) throw error;
      }
      // If active, set all others to finished
      if (form.status === "active") {
        const query = (supabase as any).from("tournaments").update({ status: "finished" }).neq("status", "finished");
        if (editing) await query.neq("id", editing.id);
        else await query.neq("name", form.name);
      }
      toast.success(editing ? "Torneo actualizado" : "Torneo creado");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["tournaments"] });
    } catch (e: any) {
      toast.error(e.message ?? "Error");
    }
  };

  const activate = async (t: T) => {
    try {
      const { error: e1 } = await (supabase as any).from("tournaments").update({ status: "finished" }).neq("id", t.id);
      if (e1) throw e1;
      const { error: e2 } = await (supabase as any).from("tournaments").update({ status: "active" }).eq("id", t.id);
      if (e2) throw e2;
      toast.success(`"${t.name}" es ahora la edición activa`);
      qc.invalidateQueries({ queryKey: ["tournaments"] });
    } catch (e: any) {
      toast.error(e.message ?? "Error");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display font-bold uppercase flex items-center gap-2">
          <Database className="h-6 w-6 text-primary" /> Torneos
        </h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" />Nuevo</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Editar" : "Nuevo"} torneo</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nombre</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Año</Label><Input type="number" value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} /></div>
                <div><Label>Semestre</Label><Input value={form.semester} onChange={e => setForm({ ...form, semester: e.target.value })} /></div>
              </div>
              <div><Label>Temporada</Label><Input value={form.season} onChange={e => setForm({ ...form, season: e.target.value })} /></div>
              <div>
                <Label>Estado</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="finished">Finalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter><Button onClick={save}>Guardar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tournaments.map(t => (
          <Card key={t.id}>
            <CardHeader className="flex flex-row items-start justify-between pb-2">
              <div>
                <CardTitle className="text-base">{t.name}</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">{t.year} · {t.semester || t.season || ""}</p>
              </div>
              <Badge variant={t.status === "active" ? "default" : "secondary"}>
                {t.status === "active" ? "Activo" : "Finalizado"}
              </Badge>
            </CardHeader>
            <CardContent className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => openEdit(t)}>
                <Pencil className="h-3 w-3 mr-1" />Editar
              </Button>
              {t.status !== "active" && (
                <Button variant="default" size="sm" onClick={() => activate(t)}>
                  <Power className="h-3 w-3 mr-1" />Activar
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}