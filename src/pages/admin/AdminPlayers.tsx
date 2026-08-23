import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Pencil, Trash2, Save, X, Download, Check, ChevronsUpDown } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { utils, writeFile } from "xlsx";

export default function AdminPlayers() {
  const queryClient = useQueryClient();

  // Export filters
  const [exportDivisionId, setExportDivisionId] = useState<string>("all");
  const [exportCategoryId, setExportCategoryId] = useState<string>("all");

  // Player form
  const [newFirst, setNewFirst] = useState("");
  const [newLast, setNewLast] = useState("");
  const [newJersey, setNewJersey] = useState("");
  const [newDob, setNewDob] = useState("");
  const [newDocNumber, setNewDocNumber] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFirst, setEditFirst] = useState("");
  const [editLast, setEditLast] = useState("");
  const [editJersey, setEditJersey] = useState("");
  const [editDob, setEditDob] = useState("");
  const [editVelopro, setEditVelopro] = useState("");

  // Roster form
  const [searchPlayers, setSearchPlayers] = useState("");
  const [searchRosters, setSearchRosters] = useState("");
  const [searchStaff, setSearchStaff] = useState("");
  const [rosterPlayerId, setRosterPlayerId] = useState("");
  const [rosterPlayerOpen, setRosterPlayerOpen] = useState(false);
  const [rosterTeamId, setRosterTeamId] = useState("");
  const [staffTeamId, setStaffTeamId] = useState("");
  const [staffFirst, setStaffFirst] = useState("");
  const [staffLast, setStaffLast] = useState("");
  const [staffRole, setStaffRole] = useState("ENTRENADOR");
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [editStaffFirst, setEditStaffFirst] = useState("");
  const [editStaffLast, setEditStaffLast] = useState("");
  const [editStaffRole, setEditStaffRole] = useState("ENTRENADOR");
  const [editStaffVelopro, setEditStaffVelopro] = useState("");
  const [rosterJersey, setRosterJersey] = useState("");
  const [rosterPosition, setRosterPosition] = useState("");
  const [editingRosterId, setEditingRosterId] = useState<string | null>(null);
  const [editRosterTeamId, setEditRosterTeamId] = useState("");
  const [editRosterJersey, setEditRosterJersey] = useState("");
  const [editRosterPosition, setEditRosterPosition] = useState("NONE");

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

  const { data: players = [], isLoading } = useQuery({
    queryKey: ["admin-players", activeTournamentId],
    enabled: !!activeTournamentId,
    queryFn: async () => {
      // Jugadores con roster en la edición activa
      const { data: inEdition, error: e1 } = await supabase
        .from("rosters")
        .select("player_id, teams!inner(tournament_id)")
        .eq("teams.tournament_id", activeTournamentId as string);
      if (e1) throw e1;

      // Jugadores con roster en cualquier edición
      const { data: anyRoster, error: e2 } = await supabase
        .from("rosters")
        .select("player_id");
      if (e2) throw e2;

      const idsEdition = new Set((inEdition ?? []).map((r: any) => r.player_id));
      const idsAny = new Set((anyRoster ?? []).map((r: any) => r.player_id));

      const { data, error } = await supabase
        .from("players")
        .select("*")
        .order("last_name");
      if (error) throw error;

      // Muestra los de esta edición + los recién creados que aún no tienen roster
      return (data ?? []).filter(
        (p: any) => idsEdition.has(p.id) || !idsAny.has(p.id)
      );
    },
    staleTime: 30_000,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ["admin-teams", activeTournamentId],
    enabled: !!activeTournamentId,
    queryFn: async () => {
      if (!activeTournamentId) return [];
      const { data } = await supabase
        .from("teams")
        .select("id, name, categories(id, name, divisions(name))")
        .eq("tournament_id", activeTournamentId as string)
        .order("name");
      return data ?? [];
    },
    staleTime: 0,
  });

  const { data: rosters = [] } = useQuery({
    queryKey: ["admin-rosters", activeTournamentId],
    enabled: !!activeTournamentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rosters")
        .select("id, jersey_number, position, team_id, player_id, teams!inner(name, tournament_id, categories(name)), players!rosters_player_id_fkey(first_name, last_name)")
        .eq("teams.tournament_id", activeTournamentId as string)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    staleTime: 30_000,
  });

  const { data: divisions = [] } = useQuery({
    queryKey: ["admin-divisions-export"],
    queryFn: async () => {
      const { data } = await supabase.from("divisions").select("id, name").order("name");
      return data ?? [];
    },
    staleTime: 60_000,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["admin-categories-export"],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("id, name, division_id, sort_order")
        .order("sort_order");
      return data ?? [];
    },
    staleTime: 60_000,
  });

  const filteredCategories = useMemo(
    () => (exportDivisionId === "all" ? categories : categories.filter((c: any) => c.division_id === exportDivisionId)),
    [categories, exportDivisionId],
  );


  const handleExportExcel = async () => {
    try {
      if (!activeTournamentId) {
        toast({ title: "No hay torneo activo", variant: "destructive" });
        return;
      }
      // Build category filter
      let categoryIds: string[] = filteredCategories.map((c: any) => c.id);
      if (exportCategoryId !== "all") categoryIds = [exportCategoryId];
      if (categoryIds.length === 0) {
        toast({ title: "Sin categorías para exportar", variant: "destructive" });
        return;
      }

      // Teams in scope — filtered to active tournament
      const { data: teamsData, error: teamsErr } = await supabase
        .from("teams")
        .select("id, name, category_id, tournament_id, categories(id, name, division_id, sort_order, divisions(id, name))")
        .in("category_id", categoryIds)
        .eq("tournament_id", activeTournamentId);
      if (teamsErr) throw teamsErr;
      const teamIds = (teamsData ?? []).map((t: any) => t.id);
      if (teamIds.length === 0) {
        toast({ title: "Sin equipos para exportar", variant: "destructive" });
        return;
      }

      // Paginado: Supabase corta en 1000 filas por defecto
      const rostersData: any[] = [];
      const PAGE = 1000;
      for (let from = 0; ; from += PAGE) {
        const { data: page, error: rostersErr } = await supabase
          .from("rosters")
          .select("jersey_number, position, team_id, players!rosters_player_id_fkey(first_name, last_name, date_of_birth, document_number, velopro_number)")
          .in("team_id", teamIds)
          .range(from, from + PAGE - 1);
        if (rostersErr) throw rostersErr;
        rostersData.push(...(page ?? []));
        if (!page || page.length < PAGE) break;
      }

      const teamById = new Map<string, any>((teamsData ?? []).map((t: any) => [t.id, t]));

      // Group rows by category
      const byCategory = new Map<string, { catName: string; divName: string; sortOrder: number; rows: any[] }>();
      (rostersData ?? []).forEach((r: any) => {
        const t = teamById.get(r.team_id);
        if (!t) return;
        const cat = t.categories;
        const div = cat?.divisions;
        const key = cat?.id ?? "unknown";
        if (!byCategory.has(key)) {
          byCategory.set(key, {
            catName: cat?.name ?? "Sin categoría",
            divName: div?.name ?? "Sin división",
            sortOrder: cat?.sort_order ?? 999,
            rows: [],
          });
        }
        byCategory.get(key)!.rows.push({
          Division: div?.name ?? "",
          Categoria: cat?.name ?? "",
          Equipo: t.name ?? "",
          Dorsal: r.jersey_number ?? "",
          Nombre: r.players?.first_name ?? "",
          Apellido: r.players?.last_name ?? "",
          Posicion: r.position ?? "",
          Nacimiento: r.players?.date_of_birth ?? "",
          VeloPro: r.players?.velopro_number ?? "",
          Documento: r.players?.document_number ?? "",
        });
      });

      if (byCategory.size === 0) {
        toast({ title: "Sin jugadores para exportar", variant: "destructive" });
        return;
      }

      const wb = utils.book_new();
      const sortedCats = Array.from(byCategory.entries()).sort(
        (a, b) => a[1].sortOrder - b[1].sortOrder || a[1].catName.localeCompare(b[1].catName),
      );
      const usedNames = new Set<string>();
      sortedCats.forEach(([, group]) => {
        // Sort rows: ARQUERO first by jersey, then others by jersey asc
        group.rows.sort((a, b) => {
          const aGk = (a.Posicion || "").toString().toUpperCase() === "ARQUERO";
          const bGk = (b.Posicion || "").toString().toUpperCase() === "ARQUERO";
          if (aGk !== bGk) return aGk ? -1 : 1;
          const aj = typeof a.Dorsal === "number" ? a.Dorsal : 9999;
          const bj = typeof b.Dorsal === "number" ? b.Dorsal : 9999;
          return aj - bj;
        });
        const ws = utils.json_to_sheet(group.rows);
        // Sanitize sheet name (max 31, no : \ / ? * [ ])
        let base = `${group.divName} - ${group.catName}`.replace(/[:\\/?*\[\]]/g, "-").slice(0, 31);
        let name = base;
        let i = 2;
        while (usedNames.has(name)) {
          const suffix = ` (${i++})`;
          name = base.slice(0, 31 - suffix.length) + suffix;
        }
        usedNames.add(name);
        utils.book_append_sheet(wb, ws, name);
      });

      // Hoja adicional con el cuerpo tecnico de los equipos exportados
      const { data: staffData, error: staffErr } = await supabase
        .from("team_staff")
        .select("first_name, last_name, role, velopro_number, team_id")
        .in("team_id", teamIds)
        .range(0, 4999);
      if (staffErr) throw staffErr;
      const staffRows = (staffData ?? []).map((sfr: any) => {
        const t = teamById.get(sfr.team_id);
        const cat = t?.categories;
        return {
          Division: cat?.divisions?.name ?? "",
          Categoria: cat?.name ?? "",
          Equipo: t?.name ?? "",
          Nombre: sfr.first_name ?? "",
          Apellido: sfr.last_name ?? "",
          Rol: sfr.role ?? "",
          VeloPro: sfr.velopro_number ?? "",
        };
      });
      if (staffRows.length > 0) {
        staffRows.sort(
          (a: any, b: any) =>
            a.Categoria.localeCompare(b.Categoria) ||
            a.Equipo.localeCompare(b.Equipo) ||
            a.Rol.localeCompare(b.Rol),
        );
        utils.book_append_sheet(wb, utils.json_to_sheet(staffRows), "Cuerpo Tecnico");
      }

      const today = new Date().toISOString().slice(0, 10);
      writeFile(wb, `jugadores_${today}.xlsx`);
      toast({ title: "Exportación lista" });
    } catch (e: any) {
      toast({ title: "Error al exportar", description: e.message, variant: "destructive" });
    }
  };

  const createPlayerMutation = useMutation({
    mutationFn: async () => {
      if (!activeTournamentId) throw new Error("No hay un torneo activo definido");
      const { error } = await supabase.from("players").insert({
        first_name: newFirst, last_name: newLast,
        jersey_number: newJersey ? parseInt(newJersey) : null,
        date_of_birth: newDob || null,
        document_number: newDocNumber || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-players"] });
      setNewFirst(""); setNewLast(""); setNewJersey(""); setNewDob(""); setNewDocNumber("");
      toast({ title: "Jugador creado" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updatePlayerMutation = useMutation({
    mutationFn: async ({ id, first_name, last_name, jersey_number, date_of_birth, velopro_number }: any) => {
      const { error } = await supabase.from("players").update({
        first_name,
        last_name,
        jersey_number: jersey_number ? parseInt(jersey_number) : null,
        date_of_birth: date_of_birth || null,
        velopro_number: velopro_number || null,
      }).eq("id", id);
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

  const { data: staff = [] } = useQuery({
    queryKey: ["admin-staff", activeTournamentId],
    enabled: !!activeTournamentId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("team_staff")
        .select("id, first_name, last_name, role, velopro_number, team_id, teams!inner(name, tournament_id)")
        .eq("teams.tournament_id", activeTournamentId as string);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    staleTime: 30_000,
  });

  // Normaliza texto: minúsculas y sin tildes, para que "JERÓNIMO" y "jeronimo" coincidan
  const norm = (s: any) =>
    String(s ?? "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const visiblePlayers = useMemo(() => {
    const q = norm(searchPlayers).trim();
    if (!q) return players;
    return (players as any[]).filter((p: any) =>
      norm(`${p.first_name} ${p.last_name} ${p.velopro_number ?? ""} ${p.document_number ?? ""} ${p.jersey_number ?? ""} ${p.date_of_birth ?? ""}`).includes(q),
    );
  }, [players, searchPlayers]);

  const visibleRosters = useMemo(() => {
    const q = norm(searchRosters).trim();
    if (!q) return rosters;
    return (rosters as any[]).filter((r: any) =>
      norm(`${r.players?.first_name ?? ""} ${r.players?.last_name ?? ""} ${r.teams?.name ?? ""} ${r.teams?.categories?.name ?? ""} ${r.jersey_number ?? ""} ${r.position ?? ""}`).includes(q),
    );
  }, [rosters, searchRosters]);

  const visibleStaff = useMemo(() => {
    const q = norm(searchStaff).trim();
    if (!q) return staff;
    return (staff as any[]).filter((st: any) =>
      norm(`${st.first_name ?? ""} ${st.last_name ?? ""} ${st.teams?.name ?? ""} ${st.role ?? ""} ${st.velopro_number ?? ""}`).includes(q),
    );
  }, [staff, searchStaff]);

  const createStaffMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("team_staff").insert({
        team_id: staffTeamId,
        first_name: staffFirst.trim(),
        last_name: staffLast.trim(),
        role: staffRole,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-staff"] });
      setStaffFirst(""); setStaffLast("");
      toast({ title: "Cuerpo técnico agregado" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateStaffMutation = useMutation({
    mutationFn: async ({ id, first_name, last_name, role, velopro_number }: any) => {
      const { error } = await (supabase as any).from("team_staff").update({
        first_name, last_name, role, velopro_number: velopro_number || null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-staff"] });
      setEditingStaffId(null);
      toast({ title: "Cuerpo técnico actualizado" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteStaffMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("team_staff").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-staff"] });
      toast({ title: "Registro eliminado" });
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
      queryClient.invalidateQueries({ queryKey: ["admin-players"] });
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
      queryClient.invalidateQueries({ queryKey: ["admin-players"] });
      toast({ title: "Asignación eliminada" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateRosterPositionMutation = useMutation({
    mutationFn: async ({ id, position }: { id: string; position: string }) => {
      const { error } = await supabase
        .from("rosters")
        .update({ position: position || null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-rosters"] });
      toast({ title: "Posición actualizada" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateRosterMutation = useMutation({
    mutationFn: async ({ id, team_id, jersey_number, position }: { id: string; team_id: string; jersey_number: string; position: string }) => {
      const { error } = await supabase
        .from("rosters")
        .update({
          team_id,
          jersey_number: jersey_number ? parseInt(jersey_number) : null,
          position: position === "NONE" ? null : position || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-rosters"] });
      setEditingRosterId(null);
      toast({ title: "Nómina actualizada" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading) {
    return <div className="flex justify-center py-8"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-display font-bold uppercase flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" /> Gestión de Jugadores
        </h1>
        {activeTournament && (
          <Badge variant="default" className="text-xs">
            Gestionando: {activeTournament.name}
          </Badge>
        )}
      </div>

      {!activeTournamentId && (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            No hay un torneo activo. Ve a "Torneos" y marca una edición como activa antes de gestionar jugadores.
          </CardContent>
        </Card>
      )}

      {activeTournamentId && (
        <>
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-2 items-end flex-wrap">
                <div className="space-y-1">
                  <label className="text-xs font-medium">División</label>
                  <Select
                    value={exportDivisionId}
                    onValueChange={(v) => {
                      setExportDivisionId(v);
                      setExportCategoryId("all");
                    }}
                  >
                    <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las divisiones</SelectItem>
                      {divisions.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Categoría</label>
                  <Select value={exportCategoryId} onValueChange={setExportCategoryId}>
                    <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las categorías</SelectItem>
                      {filteredCategories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleExportExcel} className="gap-1">
                  <Download className="h-4 w-4" /> Descargar Excel
                </Button>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="players">
            <TabsList>
              <TabsTrigger value="players">Jugadores</TabsTrigger>
              <TabsTrigger value="rosters">Nóminas</TabsTrigger>
              <TabsTrigger value="staff">Cuerpo Técnico</TabsTrigger>
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
                    <div className="space-y-1">
                      <label className="text-xs font-medium">Documento / ID Jugador</label>
                      <Input value={newDocNumber} onChange={e => setNewDocNumber(e.target.value)} placeholder="Opcional" className="w-[150px]" />
                    </div>
                    <Button onClick={() => createPlayerMutation.mutate()} disabled={!newFirst.trim() || !newLast.trim() || createPlayerMutation.isPending} className="gap-1">
                      <Plus className="h-4 w-4" /> Agregar
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="flex items-center gap-2">
                <Input
                  value={searchPlayers}
                  onChange={e => setSearchPlayers(e.target.value)}
                  placeholder="Buscar por nombre, apellido, VeloPro, documento, # o fecha…"
                  className="max-w-[420px]"
                />
                {searchPlayers && (
                  <Button variant="ghost" size="sm" onClick={() => setSearchPlayers("")} className="gap-1">
                    <X className="h-4 w-4" /> Limpiar
                  </Button>
                )}
                <span className="text-xs text-muted-foreground">
                  {visiblePlayers.length} de {players.length}
                </span>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Apellido</TableHead>
                    <TableHead>Nacimiento</TableHead>
                    <TableHead>VeloPro</TableHead>
                    <TableHead className="w-[120px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visiblePlayers.map((p: any) => (
                    <TableRow key={p.id}>
                      {editingId === p.id ? (
                        <>
                          <TableCell><Input value={editJersey} onChange={e => setEditJersey(e.target.value)} className="h-8 w-[60px]" type="number" /></TableCell>
                          <TableCell><Input value={editFirst} onChange={e => setEditFirst(e.target.value)} className="h-8" /></TableCell>
                          <TableCell><Input value={editLast} onChange={e => setEditLast(e.target.value)} className="h-8" /></TableCell>
                          <TableCell><Input value={editDob} onChange={e => setEditDob(e.target.value)} className="h-8 w-[140px]" type="date" /></TableCell>
                          <TableCell><Input value={editVelopro} onChange={e => setEditVelopro(e.target.value)} className="h-8 w-[110px]" placeholder="VeloPro" /></TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="sm" className="h-8 w-8 p-0" onClick={() => updatePlayerMutation.mutate({ id: p.id, first_name: editFirst, last_name: editLast, jersey_number: editJersey, date_of_birth: editDob, velopro_number: editVelopro })}><Save className="h-4 w-4" /></Button>
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setEditingId(null)}><X className="h-4 w-4" /></Button>
                            </div>
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell>{p.jersey_number ?? "—"}</TableCell>
                          <TableCell>{p.first_name}</TableCell>
                          <TableCell>{p.last_name}</TableCell>
                          <TableCell>{p.date_of_birth ?? "—"}</TableCell>
                          <TableCell>{p.velopro_number ?? "—"}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => { setEditingId(p.id); setEditFirst(p.first_name); setEditLast(p.last_name); setEditJersey(String(p.jersey_number ?? "")); setEditDob(p.date_of_birth ?? ""); setEditVelopro(p.velopro_number ?? ""); }}><Pencil className="h-4 w-4" /></Button>
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" onClick={() => { if (window.confirm(`¿Eliminar a ${p.first_name} ${p.last_name}? Esta acción no se puede deshacer y también eliminará sus nóminas asociadas.`)) deletePlayerMutation.mutate(p.id); }}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                  {visiblePlayers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-6">
                        {searchPlayers ? `Sin resultados para "${searchPlayers}".` : "Sin jugadores aún en esta edición."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="rosters" className="space-y-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex gap-2 items-end flex-wrap">
                    <div className="space-y-1">
                      <label className="text-xs font-medium">Jugador</label>
                      <Popover open={rosterPlayerOpen} onOpenChange={setRosterPlayerOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={rosterPlayerOpen}
                            className="w-[220px] justify-between font-normal"
                          >
                            <span className="truncate">
                              {rosterPlayerId
                                ? (() => {
                                    const sel = players.find((p: any) => p.id === rosterPlayerId);
                                    return sel ? `${sel.first_name} ${sel.last_name}` : "Seleccionar jugador";
                                  })()
                                : "Seleccionar jugador"}
                            </span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[280px] p-0">
                          <Command
                            filter={(value, search) => {
                              const target = norm(value);
                              const query = norm(search);
                              return target.includes(query) ? 1 : 0;
                            }}
                          >
                            <CommandInput placeholder="Buscar jugador…" />
                            <CommandList>
                              <CommandEmpty>Sin resultados.</CommandEmpty>
                              <CommandGroup>
                                {players.map((p: any) => (
                                  <CommandItem
                                    key={p.id}
                                    value={`${p.first_name} ${p.last_name} ${p.velopro_number ?? ""} ${p.document_number ?? ""}`}
                                    onSelect={() => {
                                      setRosterPlayerId(p.id);
                                      setRosterPlayerOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={`mr-2 h-4 w-4 ${rosterPlayerId === p.id ? "opacity-100" : "opacity-0"}`}
                                    />
                                    {p.first_name} {p.last_name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium">Equipo</label>
                      <Select value={rosterTeamId} onValueChange={setRosterTeamId}>
                        <SelectTrigger className="w-[220px]"><SelectValue placeholder="Seleccionar equipo" /></SelectTrigger>
                        <SelectContent>{teams.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name} — {(t.categories as any)?.name}</SelectItem>)}</SelectContent>
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

              <div className="flex items-center gap-2">
                <Input
                  value={searchRosters}
                  onChange={e => setSearchRosters(e.target.value)}
                  placeholder="Buscar por jugador, equipo, # o posición…"
                  className="max-w-[420px]"
                />
                {searchRosters && (
                  <Button variant="ghost" size="sm" onClick={() => setSearchRosters("")} className="gap-1">
                    <X className="h-4 w-4" /> Limpiar
                  </Button>
                )}
                <span className="text-xs text-muted-foreground">
                  {visibleRosters.length} de {rosters.length}
                </span>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Jugador</TableHead>
                    <TableHead>Equipo</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>#</TableHead>
                    <TableHead>Posición</TableHead>
                    <TableHead className="w-[90px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleRosters.map((r: any) => (
                    <TableRow key={r.id}>
                      {editingRosterId === r.id ? (
                        <>
                          <TableCell>{r.players?.first_name} {r.players?.last_name}</TableCell>
                          <TableCell>
                            <Select value={editRosterTeamId} onValueChange={setEditRosterTeamId}>
                              <SelectTrigger className="h-8 w-[180px] text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>{teams.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name} — {(t.categories as any)?.name}</SelectItem>)}</SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{(r.teams as any)?.categories?.name ?? "—"}</TableCell>
                          <TableCell>
                            <Input value={editRosterJersey} onChange={e => setEditRosterJersey(e.target.value)} className="h-8 w-[60px]" type="number" />
                          </TableCell>
                          <TableCell>
                            <Select value={editRosterPosition} onValueChange={setEditRosterPosition}>
                              <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="NONE">—</SelectItem>
                                <SelectItem value="ARQUERO">Arquero</SelectItem>
                                <SelectItem value="DEFENSA">Defensa</SelectItem>
                                <SelectItem value="DELANTERO">Delantero</SelectItem>
                                <SelectItem value="JUGADOR">Jugador</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => updateRosterMutation.mutate({ id: r.id, team_id: editRosterTeamId, jersey_number: editRosterJersey, position: editRosterPosition })}
                                disabled={!editRosterTeamId || updateRosterMutation.isPending}
                              >
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setEditingRosterId(null)}><X className="h-4 w-4" /></Button>
                            </div>
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell>{r.players?.first_name} {r.players?.last_name}</TableCell>
                          <TableCell>{r.teams?.name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{(r.teams as any)?.categories?.name ?? "—"}</TableCell>
                          <TableCell>{r.jersey_number ?? "—"}</TableCell>
                          <TableCell>
                            <Select
                              value={r.position ?? "NONE"}
                              onValueChange={(v) =>
                                updateRosterPositionMutation.mutate({ id: r.id, position: v === "NONE" ? "" : v })
                              }
                            >
                              <SelectTrigger className="w-[130px] h-8 text-xs">
                                <SelectValue placeholder="—" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="NONE">—</SelectItem>
                                <SelectItem value="ARQUERO">Arquero</SelectItem>
                                <SelectItem value="DEFENSA">Defensa</SelectItem>
                                <SelectItem value="DELANTERO">Delantero</SelectItem>
                                <SelectItem value="JUGADOR">Jugador</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={() => {
                                  setEditingRosterId(r.id);
                                  setEditRosterTeamId(r.team_id ?? "");
                                  setEditRosterJersey(String(r.jersey_number ?? ""));
                                  setEditRosterPosition(r.position ?? "NONE");
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" onClick={() => { if (window.confirm(`¿Quitar a ${r.players?.first_name} ${r.players?.last_name} del equipo ${r.teams?.name}? Esta acción no se puede deshacer.`)) deleteRosterMutation.mutate(r.id); }}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                  {visibleRosters.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-6">
                        {searchRosters ? `Sin resultados para "${searchRosters}".` : "Sin nóminas aún en esta edición."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="staff" className="space-y-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex gap-2 items-end flex-wrap">
                    <div className="space-y-1">
                      <label className="text-xs font-medium">Equipo</label>
                      <Select value={staffTeamId} onValueChange={setStaffTeamId}>
                        <SelectTrigger className="w-[220px]"><SelectValue placeholder="Seleccionar equipo" /></SelectTrigger>
                        <SelectContent>{teams.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name} — {(t.categories as any)?.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium">Nombre</label>
                      <Input value={staffFirst} onChange={e => setStaffFirst(e.target.value)} placeholder="Nombre" className="w-[160px]" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium">Apellido</label>
                      <Input value={staffLast} onChange={e => setStaffLast(e.target.value)} placeholder="Apellido" className="w-[160px]" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium">Rol</label>
                      <Select value={staffRole} onValueChange={setStaffRole}>
                        <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ENTRENADOR">Entrenador</SelectItem>
                          <SelectItem value="ASISTENTE">Asistente</SelectItem>
                          <SelectItem value="DELEGADO">Delegado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={() => createStaffMutation.mutate()} disabled={!staffTeamId || !staffFirst || !staffLast || createStaffMutation.isPending} className="gap-1">
                      <Plus className="h-4 w-4" /> Agregar
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="flex items-center gap-2">
                <Input
                  value={searchStaff}
                  onChange={e => setSearchStaff(e.target.value)}
                  placeholder="Buscar por nombre, apellido, equipo, rol o VeloPro…"
                  className="max-w-[420px]"
                />
                {searchStaff && (
                  <Button variant="ghost" size="sm" onClick={() => setSearchStaff("")} className="gap-1">
                    <X className="h-4 w-4" /> Limpiar
                  </Button>
                )}
                <span className="text-xs text-muted-foreground">
                  {visibleStaff.length} de {staff.length}
                </span>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Equipo</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>VeloPro</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleStaff.map((st: any) => (
                    <TableRow key={st.id}>
                      {editingStaffId === st.id ? (
                        <>
                          <TableCell className="flex gap-1">
                            <Input value={editStaffFirst} onChange={e => setEditStaffFirst(e.target.value)} className="h-8 w-[110px]" placeholder="Nombre" />
                            <Input value={editStaffLast} onChange={e => setEditStaffLast(e.target.value)} className="h-8 w-[110px]" placeholder="Apellido" />
                          </TableCell>
                          <TableCell>{st.teams?.name}</TableCell>
                          <TableCell>
                            <Select value={editStaffRole} onValueChange={setEditStaffRole}>
                              <SelectTrigger className="h-8 w-[120px]"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ENTRENADOR">Entrenador</SelectItem>
                                <SelectItem value="ASISTENTE">Asistente</SelectItem>
                                <SelectItem value="DELEGADO">Delegado</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell><Input value={editStaffVelopro} onChange={e => setEditStaffVelopro(e.target.value)} className="h-8 w-[110px]" placeholder="VeloPro" /></TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="sm" className="h-8 w-8 p-0" onClick={() => updateStaffMutation.mutate({ id: st.id, first_name: editStaffFirst, last_name: editStaffLast, role: editStaffRole, velopro_number: editStaffVelopro })}><Save className="h-4 w-4" /></Button>
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setEditingStaffId(null)}><X className="h-4 w-4" /></Button>
                            </div>
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell>{st.first_name} {st.last_name}</TableCell>
                          <TableCell>{st.teams?.name}</TableCell>
                          <TableCell>{st.role}</TableCell>
                          <TableCell>{st.velopro_number ?? "—"}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => { setEditingStaffId(st.id); setEditStaffFirst(st.first_name); setEditStaffLast(st.last_name); setEditStaffRole(st.role); setEditStaffVelopro(st.velopro_number ?? ""); }}><Pencil className="h-4 w-4" /></Button>
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" onClick={() => { if (window.confirm(`¿Eliminar a ${st.first_name} ${st.last_name} (${st.role}) de ${st.teams?.name}? Esta acción no se puede deshacer.`)) deleteStaffMutation.mutate(st.id); }}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                  {visibleStaff.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">
                        {searchStaff ? `Sin resultados para "${searchStaff}".` : "Sin cuerpo técnico aún en esta edición."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
