import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Plus, Pencil, Trash2, Save, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function AdminPlayers() {
  const queryClient = useQueryClient();

  // Player form
  const [newFirst, setNewFirst] = useState("");
  const [newLast, setNewLast] = useState("");
  const [newJersey, setNewJersey] = useState("");
  const [newDob, setNewDob] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFirst, setEditFirst] = useState("");
  const [editLast, setEditLast] = useState("");
  const [editJersey, setEditJersey] = useState("");

  // Roster form
  const [rosterPlayerId, setRosterPlayerId] = useState("");
  const [rosterTeamId, setRosterTeamId] = useState("");
  const [rosterJersey, setRosterJersey] = useState("");
  const [rosterPosition, setRosterPosition] = useState("");

  const { data: players = [], isLoading } = useQuery({
    queryKey: ["admin-players"],
    queryFn: async () => {
      const { data, error } = await supabase.from("players").select("*").order("last_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: teams = [] } = useQuery({
    queryKey: ["admin-teams"],
    queryFn: async () => {
      const { data } = await supabase.from("teams").select("id, name, categories(name, divisions(name))").order("name");
      return data ?? [];
    },
  });

  const { data: rosters = [] } = useQuery({
    queryKey: ["admin-rosters"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rosters")
        .select("id, jersey_number, position, team_id, player_id, teams(name), players!rosters_player_id_fkey(first_name, last_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createPlayerMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("players").insert({
        first_name: newFirst, last_name: newLast,
        jersey_number: newJersey ? parseInt(newJersey) : null,
        date_of_birth: newDob || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-players"] });
      setNewFirst(""); setNewLast(""); setNewJersey(""); setNewDob("");
      toast({ title: "Jugador creado" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updatePlayerMutation = useMutation({
    mutationFn: async ({ id, first_name, last_name, jersey_number }: any) => {
      const { error } = await supabase.from("players").update({ first_name, last_name, jersey_number: jersey_number ? parseInt(jersey_number) : null }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-players"] });
      setEditingId(null);
      toast({ title: "Jugador actualizado" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deletePlayerMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("players").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-players"] });
      toast({ title: "Jugador eliminado" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const createRosterMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("rosters").insert({
        player_id: rosterPlayerId, team_id: rosterTeamId,
        jersey_number: rosterJersey ? parseInt(rosterJersey) : null,
        position: rosterPosition || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-rosters"] });
      setRosterPlayerId(""); setRosterTeamId(""); setRosterJersey(""); setRosterPosition("");
      toast({ title: "Jugador asignado al equipo" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteRosterMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("rosters").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-rosters"] });
      toast({ title: "Asignación eliminada" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading) {
    return <div className="flex justify-center py-8"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold uppercase flex items-center gap-2">
        <Users className="h-6 w-6 text-primary" /> Gestión de Jugadores
      </h1>

      <Tabs defaultValue="players">
        <TabsList>
          <TabsTrigger value="players">Jugadores</TabsTrigger>
          <TabsTrigger value="rosters">Nóminas</TabsTrigger>
        </TabsList>

        <TabsContent value="players" className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-2 items-end flex-wrap">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Nombre</label>
                  <Input value={newFirst} onChange={e => setNewFirst(e.target.value)} placeholder="Nombre" className="w-[150px]" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Apellido</label>
                  <Input value={newLast} onChange={e => setNewLast(e.target.value)} placeholder="Apellido" className="w-[150px]" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">#</label>
                  <Input value={newJersey} onChange={e => setNewJersey(e.target.value)} placeholder="#" className="w-[60px]" type="number" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Nacimiento</label>
                  <Input value={newDob} onChange={e => setNewDob(e.target.value)} type="date" className="w-[150px]" />
                </div>
                <Button onClick={() => createPlayerMutation.mutate()} disabled={!newFirst.trim() || !newLast.trim() || createPlayerMutation.isPending} className="gap-1">
                  <Plus className="h-4 w-4" /> Agregar
                </Button>
              </div>
            </CardContent>
          </Card>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Apellido</TableHead>
                <TableHead className="w-[120px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {players.map((p) => (
                <TableRow key={p.id}>
                  {editingId === p.id ? (
                    <>
                      <TableCell><Input value={editJersey} onChange={e => setEditJersey(e.target.value)} className="h-8 w-[60px]" type="number" /></TableCell>
                      <TableCell><Input value={editFirst} onChange={e => setEditFirst(e.target.value)} className="h-8" /></TableCell>
                      <TableCell><Input value={editLast} onChange={e => setEditLast(e.target.value)} className="h-8" /></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" className="h-8 w-8 p-0" onClick={() => updatePlayerMutation.mutate({ id: p.id, first_name: editFirst, last_name: editLast, jersey_number: editJersey })}><Save className="h-4 w-4" /></Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setEditingId(null)}><X className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell>{p.jersey_number ?? "—"}</TableCell>
                      <TableCell>{p.first_name}</TableCell>
                      <TableCell>{p.last_name}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => { setEditingId(p.id); setEditFirst(p.first_name); setEditLast(p.last_name); setEditJersey(String(p.jersey_number ?? "")); }}><Pencil className="h-4 w-4" /></Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" onClick={() => deletePlayerMutation.mutate(p.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="rosters" className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-2 items-end flex-wrap">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Jugador</label>
                  <Select value={rosterPlayerId} onValueChange={setRosterPlayerId}>
                    <SelectTrigger className="w-[200px]"><SelectValue placeholder="Seleccionar jugador" /></SelectTrigger>
                    <SelectContent>{players.map(p => <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Equipo</label>
                  <Select value={rosterTeamId} onValueChange={setRosterTeamId}>
                    <SelectTrigger className="w-[220px]"><SelectValue placeholder="Seleccionar equipo" /></SelectTrigger>
                    <SelectContent>{teams.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium"># Camiseta</label>
                  <Input value={rosterJersey} onChange={e => setRosterJersey(e.target.value)} placeholder="#" className="w-[60px]" type="number" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Posición</label>
                  <Input value={rosterPosition} onChange={e => setRosterPosition(e.target.value)} placeholder="Posición" className="w-[120px]" />
                </div>
                <Button onClick={() => createRosterMutation.mutate()} disabled={!rosterPlayerId || !rosterTeamId || createRosterMutation.isPending} className="gap-1">
                  <Plus className="h-4 w-4" /> Asignar
                </Button>
              </div>
            </CardContent>
          </Card>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Jugador</TableHead>
                <TableHead>Equipo</TableHead>
                <TableHead>#</TableHead>
                <TableHead>Posición</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rosters.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell>{r.players?.first_name} {r.players?.last_name}</TableCell>
                  <TableCell>{r.teams?.name}</TableCell>
                  <TableCell>{r.jersey_number ?? "—"}</TableCell>
                  <TableCell>{r.position ?? "—"}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" onClick={() => deleteRosterMutation.mutate(r.id)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>
    </div>
  );
}
