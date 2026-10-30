import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Database, Pencil, Plus, Power, CalendarDays, CheckCircle2 } from "lucide-react";
import { StatChip } from "@/components/admin/AdminBits";
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

  const activeOne = tournaments.find((t) => t.status === "active");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold uppercase">
          <Database className="h-6 w-6 text-primary" /> Torneos
        </h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="gap-1"><Plus className="h-4 w-4" />Nuevo torneo</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display uppercase text-primary">{editing ? "Editar" : "Nuevo"} torneo</DialogTitle></DialogHeader>
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
              {form.status === "active" && (
                <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-900">Solo puede haber un torneo activo: al guardar, los demás pasan a "Finalizado".</p>
              )}
            </div>
            <DialogFooter><Button onClick={save}>Guardar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap gap-3">
        <StatChip icon={Database} label="Torneos" value={tournaments.length} />
        <StatChip icon={CheckCircle2} label="Edición activa" value={activeOne?.name ?? "Ninguna"} warn={!activeOne} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tournaments.map(t => {
          const isActive = t.status === "active";
          return (
            <Card key={t.id} className={`overflow-hidden rounded-2xl shadow-sm ${isActive ? "border-primary/50" : ""}`}>
              <div className={`flex items-center justify-between border-b px-4 py-2.5 ${isActive ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}>
                <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide">
                  {isActive ? <CheckCircle2 className="h-4 w-4" /> : <CalendarDays className="h-4 w-4" />}
                  {isActive ? "Edición activa" : "Finalizado"}
                </span>
                <span className="text-xs font-semibold">{t.year ?? ""}</span>
              </div>
              <CardContent className="space-y-3 p-4">
                <div>
                  <div className="font-display text-lg font-bold uppercase leading-tight">{t.name}</div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{[t.semester, t.season].filter(Boolean).join(" · ") || "Sin semestre/temporada"}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(t)} className="gap-1"><Pencil className="h-3.5 w-3.5" />Editar</Button>
                  {!isActive && (
                    <Button size="sm" onClick={() => { if (window.confirm(`¿Poner "${t.name}" como edición activa? La edición actual pasará a Finalizado.`)) activate(t); }} className="gap-1"><Power className="h-3.5 w-3.5" />Activar</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
