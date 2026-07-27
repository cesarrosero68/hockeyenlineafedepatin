import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, Plus, Pencil, Trash2, Save, X, Upload, ImageIcon, Loader2 } from "lucide-react";
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const targetClubId = useRef<string | null>(null);

  const { data: clubs = [], isLoading } = useQuery({
    queryKey: ["admin-clubs-crud"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clubs").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("clubs").insert({ name: newName });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-clubs-crud"] });
      setNewName("");
      toast({ title: "Club creado" });
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
      <h1 className="text-2xl font-display font-bold uppercase flex items-center gap-2">
        <Shield className="h-6 w-6 text-primary" /> Gestión de Clubes
      </h1>

      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2 items-end flex-wrap">
            <div className="space-y-1">
              <label className="text-xs font-medium">Nombre</label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nombre del club" className="w-[200px]" />
            </div>
            <Button onClick={() => createMutation.mutate()} disabled={!newName.trim() || createMutation.isPending} className="gap-1">
              <Plus className="h-4 w-4" /> Agregar
            </Button>
            <p className="text-xs text-muted-foreground">El logo se sube después de crear el club.</p>
          </div>
        </CardContent>
      </Card>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[60px]">Logo</TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead className="w-[170px]">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clubs.map((c) => (
            <TableRow key={c.id}>
              <TableCell>
                {c.logo_url ? (
                  <img src={c.logo_url} alt={`Logo ${c.name}`} className="h-10 w-10 object-contain rounded border bg-muted" loading="lazy" />
                ) : (
                  <div className="h-10 w-10 rounded border bg-muted flex items-center justify-center text-muted-foreground">
                    <ImageIcon className="h-4 w-4" />
                  </div>
                )}
              </TableCell>
              {editingId === c.id ? (
                <>
                  <TableCell><Input value={editName} onChange={e => setEditName(e.target.value)} className="h-8" /></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" className="h-8 w-8 p-0" onClick={() => updateMutation.mutate({ id: c.id, name: editName })}><Save className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setEditingId(null)}><X className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </>
              ) : (
                <>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" className="h-8 gap-1 px-2" disabled={uploadingId === c.id} onClick={() => pickFile(c.id)}>
                        {uploadingId === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        <span className="text-xs">Logo</span>
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => { setEditingId(c.id); setEditName(c.name); }}><Pencil className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" onClick={() => deleteMutation.mutate(c.id)}><Trash2 className="h-4 w-4" /></Button>
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
