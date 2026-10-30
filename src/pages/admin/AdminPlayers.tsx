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
import { Users, Plus, Pencil, Trash2, Save, X, Download, Check, ChevronsUpDown, Search, UserRound, ClipboardList, Shirt, FilterX, TriangleAlert } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { utils, writeFile } from "xlsx";

const TAB_ACTIVE = "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow";
const PAGE_STEP = 50;

// Color estable por categoría (mismo criterio que la Programación).
function catStyle(name?: string | null) {
  const n = name ?? "";
  let h = 0;
  for (let i = 0; i < n.length; i++) h = (h * 17 + n.charCodeAt(i)) % 360;
  return { color: `hsl(${h} 60% 36%)`, backgroundColor: `hsl(${h} 60% 42% / 0.12)` };
}
function CatChip({ name }: { name?: string | null }) {
  if (!name) return <span className="text-muted-foreground">—</span>;
  return <span className="inline-block rounded-md px-2 py-0.5 text-xs font-bold" style={catStyle(name)}>{name}</span>;
}
function Jersey({ n }: { n: any }) {
  return n != null && n !== "" ? (
    <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary font-display text-sm font-bold text-primary-foreground">{n}</span>
  ) : (
    <span className="grid h-8 w-8 place-items-center rounded-lg bg-muted text-xs text-muted-foreground">—</span>
  );
}
const ROLE_STYLE: Record<string, string> = {
  ENTRENADOR: "bg-primary/10 text-primary",
  ASISTENTE: "bg-secondary/40 text-secondary-foreground",
  DELEGADO: "bg-muted text-muted-foreground",
};
function FormCard({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <Card className="overflow-hidden rounded-2xl shadow-sm">
      <div className="flex items-center gap-2 border-b bg-primary/10 px-4 py-2.5 font-display text-base font-bold uppercase text-primary">
        <Icon className="h-4 w-4" /> {title}
      </div>
      <CardContent className="p-4">{children}</CardContent>
    </Card>
  );
}
function SearchBar({ value, onChange, placeholder, shown, total }: { value: string; onChange: (v: string) => void; placeholder: string; shown: number; total: number }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative w-full max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="bg-card pl-9 pr-9" />
        {value && (
          <button type="button" aria-label="Limpiar búsqueda" onClick={() => onChange("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">{shown} de {total}</span>
    </div>
  );
}
function TableShell({ children, remaining, onMore }: { children: React.ReactNode; remaining: number; onMore: () => void }) {
  return (
    <Card className="overflow-hidden rounded-2xl shadow-sm">
      <div className="overflow-x-auto">{children}</div>
      {remaining > 0 && (
        <div className="border-t bg-muted/30 p-3 text-center">
          <Button variant="outline" size="sm" onClick={onMore}>Mostrar {Math.min(PAGE_STEP, remaining)} más ({remaining} restantes)</Button>
        </div>
      )}
    </Card>
  );
}
function Empty({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-sm text-muted-foreground">
      <Icon className="h-8 w-8 opacity-40" /> {text}
    </div>
  );
}
function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1 ${className ?? ""}`}>
      <label className="text-xs font-medium">{label}</label>
      {children}
    </div>
  );
}
const HEAD = "bg-primary/10 text-xs font-bold uppercase tracking-wide text-primary";

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

  const [shown, setShown] = useState({ players: PAGE_STEP, rosters: PAGE_STEP, staff: PAGE_STEP });
  const more = (k: "players" | "rosters" | "staff") => setShown((x) => ({ ...x, [k]: x[k] + PAGE_STEP }));

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
        .select("id, jersey_number, position, team_id, player_id, teams!inner(name, tournament_id, category_id, categories(name)), players!rosters_player_id_fkey(first_name, last_name)")
        .eq("teams.tournament_id", activeTournamentId as string)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    staleTime: 30_000,
  });

  const { data: divisions = [] } = useQuery({
    queryKey: ["admin-divisions-export", activeTournamentId],
    queryFn: async () => {
      let q: any = supabase.from("divisions").select("id, name").order("name");
      if (activeTournamentId) q = q.eq("tournament_id", activeTournamentId);
      const { data } = await q;
      return data ?? [];
    },
    staleTime: 60_000,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["admin-categories-export", activeTournamentId],
    queryFn: async () => {
      let q: any = supabase
        .from("categories")
        .select("id, name, division_id, sort_order")
        .order("sort_order");
      if (activeTournamentId) q = q.eq("tournament_id", activeTournamentId);
      const { data } = await q;
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
        .select("id, first_name, last_name, role, velopro_number, team_id, teams!inner(name, tournament_id, category_id, categories(name, divisions(name)))")
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

  // Los filtros de División / Categoría de arriba también filtran las listas.
  const scopeCatIds = useMemo<Set<string> | null>(() => {
    if (exportCategoryId !== "all") return new Set([exportCategoryId]);
    if (exportDivisionId !== "all") return new Set(filteredCategories.map((c: any) => c.id));
    return null;
  }, [exportCategoryId, exportDivisionId, filteredCategories]);

  // Equipo(s) y categoría de cada jugador, según sus nóminas
  const playerTeams = useMemo(() => {
    const m = new Map<string, { team: string; cat: string; catId: string }[]>();
    (rosters as any[]).forEach((r: any) => {
      const arr = m.get(r.player_id) ?? [];
      arr.push({ team: r.teams?.name ?? "", cat: r.teams?.categories?.name ?? "", catId: r.teams?.category_id ?? "" });
      m.set(r.player_id, arr);
    });
    return m;
  }, [rosters]);

  const visiblePlayers = useMemo(() => {
    const q = norm(searchPlayers).trim();
    let base = players as any[];
    if (scopeCatIds) base = base.filter((p: any) => (playerTeams.get(p.id) ?? []).some((t) => scopeCatIds.has(t.catId)));
    if (!q) return base;
    return base.filter((p: any) =>
      norm(`${p.first_name} ${p.last_name} ${p.velopro_number ?? ""} ${p.document_number ?? ""} ${p.jersey_number ?? ""} ${p.date_of_birth ?? ""} ${(playerTeams.get(p.id) ?? []).map((t) => t.team + " " + t.cat).join(" ")}`).includes(q),
    );
  }, [players, searchPlayers, scopeCatIds, playerTeams]);

  const visibleRosters = useMemo(() => {
    const q = norm(searchRosters).trim();
    let base = rosters as any[];
    if (scopeCatIds) base = base.filter((r: any) => scopeCatIds.has(r.teams?.category_id));
    if (!q) return base;
    return base.filter((r: any) =>
      norm(`${r.players?.first_name ?? ""} ${r.players?.last_name ?? ""} ${r.teams?.name ?? ""} ${r.teams?.categories?.name ?? ""} ${r.jersey_number ?? ""} ${r.position ?? ""}`).includes(q),
    );
  }, [rosters, searchRosters, scopeCatIds]);

  const visibleStaff = useMemo(() => {
    const q = norm(searchStaff).trim();
    let pre = staff as any[];
    if (scopeCatIds) pre = pre.filter((st: any) => scopeCatIds.has(st.teams?.category_id));
    const base = !q
      ? pre
      : pre.filter((st: any) =>
          norm(`${st.first_name ?? ""} ${st.last_name ?? ""} ${st.teams?.name ?? ""} ${st.teams?.categories?.name ?? ""} ${st.teams?.categories?.divisions?.name ?? ""} ${st.role ?? ""} ${st.velopro_number ?? ""}`).includes(q),
        );
    // Ordena por categoría > equipo > rol > apellido, para que los homónimos
    // de distintas categorías no queden mezclados en la lista.
    return [...base].sort((a: any, b: any) =>
      String(a.teams?.categories?.name ?? "").localeCompare(String(b.teams?.categories?.name ?? "")) ||
      String(a.teams?.name ?? "").localeCompare(String(b.teams?.name ?? "")) ||
      String(a.role ?? "").localeCompare(String(b.role ?? "")) ||
      String(a.last_name ?? "").localeCompare(String(b.last_name ?? "")),
    );
  }, [staff, searchStaff, scopeCatIds]);

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
      if (!activeTournamentId) throw new Error("No hay edición activa seleccionada");
      const { error } = await supabase.from("rosters").insert({
        player_id: rosterPlayerId, team_id: rosterTeamId,
        tournament_id: activeTournamentId,
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

  const POSITIONS = (
    <>
      <SelectItem value="NONE">—</SelectItem>
      <SelectItem value="ARQUERO">Arquero</SelectItem>
      <SelectItem value="DEFENSA">Defensa</SelectItem>
      <SelectItem value="DELANTERO">Delantero</SelectItem>
      <SelectItem value="JUGADOR">Jugador</SelectItem>
    </>
  );
  const teamOptions = teams.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name} — {(t.categories as any)?.name}</SelectItem>);
  const filterActive = exportDivisionId !== "all" || exportCategoryId !== "all";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold uppercase">
          <Users className="h-6 w-6 text-primary" /> Gestión de Jugadores
        </h1>
        {activeTournament && <Badge className="text-xs">Gestionando: {activeTournament.name}</Badge>}
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
          {/* Filtro y exportación */}
          <Card className="overflow-hidden rounded-2xl shadow-sm">
            <CardContent className="flex flex-wrap items-end gap-3 p-4">
              <Field label="División">
                <Select value={exportDivisionId} onValueChange={(v) => { setExportDivisionId(v); setExportCategoryId("all"); }}>
                  <SelectTrigger className="w-[200px] bg-card"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las divisiones</SelectItem>
                    {divisions.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Categoría">
                <Select value={exportCategoryId} onValueChange={setExportCategoryId}>
                  <SelectTrigger className="w-[200px] bg-card"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las categorías</SelectItem>
                    {filteredCategories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              {filterActive && (
                <Button variant="ghost" size="sm" className="gap-1" onClick={() => { setExportDivisionId("all"); setExportCategoryId("all"); }}>
                  <FilterX className="h-4 w-4" /> Quitar filtro
                </Button>
              )}
              <div className="ml-auto flex flex-col items-end gap-1">
                <Button onClick={handleExportExcel} className="gap-1"><Download className="h-4 w-4" /> Descargar Excel</Button>
                <span className="text-[11px] text-muted-foreground">El filtro aplica a las listas y al Excel</span>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="players" className="space-y-4">
            <TabsList className="grid h-auto w-full grid-cols-3 gap-1 rounded-xl p-1 sm:inline-grid sm:w-auto">
              <TabsTrigger value="players" className={`gap-2 px-4 py-2 ${TAB_ACTIVE}`}>
                <UserRound className="h-4 w-4" /> <span>Jugadores</span>
                <span className="rounded-full bg-black/10 px-1.5 text-[11px]">{visiblePlayers.length}</span>
              </TabsTrigger>
              <TabsTrigger value="rosters" className={`gap-2 px-4 py-2 ${TAB_ACTIVE}`}>
                <Shirt className="h-4 w-4" /> <span>Nóminas</span>
                <span className="rounded-full bg-black/10 px-1.5 text-[11px]">{visibleRosters.length}</span>
              </TabsTrigger>
              <TabsTrigger value="staff" className={`gap-2 px-4 py-2 ${TAB_ACTIVE}`}>
                <ClipboardList className="h-4 w-4" /> <span className="hidden sm:inline">Cuerpo Técnico</span><span className="sm:hidden">Staff</span>
                <span className="rounded-full bg-black/10 px-1.5 text-[11px]">{visibleStaff.length}</span>
              </TabsTrigger>
            </TabsList>

            {/* ---------------- JUGADORES ---------------- */}
            <TabsContent value="players" className="space-y-4">
              <FormCard icon={Plus} title="Agregar jugador">
                <div className="flex flex-wrap items-end gap-3">
                  <Field label="Nombre"><Input value={newFirst} onChange={e => setNewFirst(e.target.value)} placeholder="Nombre" className="w-[150px]" /></Field>
                  <Field label="Apellido"><Input value={newLast} onChange={e => setNewLast(e.target.value)} placeholder="Apellido" className="w-[150px]" /></Field>
                  <Field label="#"><Input value={newJersey} onChange={e => setNewJersey(e.target.value)} placeholder="#" className="w-[70px]" type="number" /></Field>
                  <Field label="Nacimiento"><Input value={newDob} onChange={e => setNewDob(e.target.value)} type="date" className="w-[150px]" /></Field>
                  <Field label="Documento / ID Jugador"><Input value={newDocNumber} onChange={e => setNewDocNumber(e.target.value)} placeholder="Opcional" className="w-[170px]" /></Field>
                  <Button onClick={() => createPlayerMutation.mutate()} disabled={!newFirst.trim() || !newLast.trim() || createPlayerMutation.isPending} className="gap-1">
                    <Plus className="h-4 w-4" /> Agregar
                  </Button>
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">Después de crearlo, asígnalo a un equipo en la pestaña Nóminas.</p>
              </FormCard>

              <SearchBar value={searchPlayers} onChange={setSearchPlayers} placeholder="Buscar por nombre, equipo, VeloPro, documento, # o fecha…" shown={visiblePlayers.length} total={players.length} />

              <TableShell remaining={visiblePlayers.length - shown.players} onMore={() => more("players")}>
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className={`w-[60px] ${HEAD}`}>#</TableHead>
                      <TableHead className={HEAD}>Jugador</TableHead>
                      <TableHead className={HEAD}>Equipo y categoría</TableHead>
                      <TableHead className={HEAD}>Nacimiento</TableHead>
                      <TableHead className={HEAD}>VeloPro</TableHead>
                      <TableHead className={`w-[110px] ${HEAD}`}>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visiblePlayers.slice(0, shown.players).map((p: any) => {
                      const pt = playerTeams.get(p.id) ?? [];
                      return (
                        <TableRow key={p.id} className="odd:bg-muted/30">
                          {editingId === p.id ? (
                            <>
                              <TableCell><Input value={editJersey} onChange={e => setEditJersey(e.target.value)} className="h-8 w-[64px]" type="number" /></TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Input value={editFirst} onChange={e => setEditFirst(e.target.value)} className="h-8 min-w-[110px]" placeholder="Nombre" />
                                  <Input value={editLast} onChange={e => setEditLast(e.target.value)} className="h-8 min-w-[110px]" placeholder="Apellido" />
                                </div>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">{pt.length ? pt.map((t) => t.team).join(", ") : "Sin equipo"}</TableCell>
                              <TableCell><Input value={editDob} onChange={e => setEditDob(e.target.value)} className="h-8 w-[140px]" type="date" /></TableCell>
                              <TableCell><Input value={editVelopro} onChange={e => setEditVelopro(e.target.value)} className="h-8 w-[110px]" placeholder="VeloPro" /></TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button size="sm" className="h-8 w-8 p-0" title="Guardar" onClick={() => updatePlayerMutation.mutate({ id: p.id, first_name: editFirst, last_name: editLast, jersey_number: editJersey, date_of_birth: editDob, velopro_number: editVelopro })}><Save className="h-4 w-4" /></Button>
                                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Cancelar" onClick={() => setEditingId(null)}><X className="h-4 w-4" /></Button>
                                </div>
                              </TableCell>
                            </>
                          ) : (
                            <>
                              <TableCell><Jersey n={p.jersey_number} /></TableCell>
                              <TableCell className="leading-tight">
                                <span className="block font-semibold">{p.last_name}</span>
                                <span className="block text-sm text-muted-foreground">{p.first_name}</span>
                              </TableCell>
                              <TableCell>
                                {pt.length === 0 ? (
                                  <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">Sin equipo</span>
                                ) : (
                                  <div className="space-y-1">
                                    {pt.map((t, i) => (
                                      <div key={i} className="flex flex-wrap items-center gap-2">
                                        <span className="text-sm font-medium">{t.team}</span>
                                        <CatChip name={t.cat} />
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="whitespace-nowrap text-sm">{p.date_of_birth ?? "—"}</TableCell>
                              <TableCell>
                                {p.velopro_number ? (
                                  <span className="font-mono text-sm">{p.velopro_number}</span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800"><TriangleAlert className="h-3 w-3" /> Falta</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Editar" onClick={() => { setEditingId(p.id); setEditFirst(p.first_name); setEditLast(p.last_name); setEditJersey(String(p.jersey_number ?? "")); setEditDob(p.date_of_birth ?? ""); setEditVelopro(p.velopro_number ?? ""); }}><Pencil className="h-4 w-4" /></Button>
                                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" title="Eliminar" onClick={() => { if (window.confirm(`¿Eliminar a ${p.first_name} ${p.last_name}? Esta acción no se puede deshacer y también eliminará sus nóminas asociadas.`)) deletePlayerMutation.mutate(p.id); }}><Trash2 className="h-4 w-4" /></Button>
                                </div>
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                {visiblePlayers.length === 0 && (
                  <Empty icon={UserRound} text={searchPlayers ? `Sin resultados para "${searchPlayers}".` : filterActive ? "No hay jugadores con este filtro." : "Sin jugadores aún en esta edición."} />
                )}
              </TableShell>
            </TabsContent>

            {/* ---------------- NÓMINAS ---------------- */}
            <TabsContent value="rosters" className="space-y-4">
              <FormCard icon={Plus} title="Asignar jugador a un equipo">
                <div className="flex flex-wrap items-end gap-3">
                  <Field label="Jugador">
                    <Popover open={rosterPlayerOpen} onOpenChange={setRosterPlayerOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" aria-expanded={rosterPlayerOpen} className="w-[230px] justify-between font-normal">
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
                      <PopoverContent className="w-[300px] p-0">
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
                                  onSelect={() => { setRosterPlayerId(p.id); setRosterPlayerOpen(false); }}
                                >
                                  <Check className={`mr-2 h-4 w-4 ${rosterPlayerId === p.id ? "opacity-100" : "opacity-0"}`} />
                                  {p.first_name} {p.last_name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </Field>
                  <Field label="Equipo">
                    <Select value={rosterTeamId} onValueChange={setRosterTeamId}>
                      <SelectTrigger className="w-[230px]"><SelectValue placeholder="Seleccionar equipo" /></SelectTrigger>
                      <SelectContent>{teamOptions}</SelectContent>
                    </Select>
                  </Field>
                  <Field label="# Camiseta"><Input value={rosterJersey} onChange={e => setRosterJersey(e.target.value)} placeholder="#" className="w-[80px]" type="number" /></Field>
                  <Field label="Posición"><Input value={rosterPosition} onChange={e => setRosterPosition(e.target.value)} placeholder="Posición" className="w-[130px]" /></Field>
                  <Button onClick={() => createRosterMutation.mutate()} disabled={!rosterPlayerId || !rosterTeamId || createRosterMutation.isPending} className="gap-1">
                    <Plus className="h-4 w-4" /> Asignar
                  </Button>
                </div>
              </FormCard>

              <SearchBar value={searchRosters} onChange={setSearchRosters} placeholder="Buscar por jugador, equipo, # o posición…" shown={visibleRosters.length} total={rosters.length} />

              <TableShell remaining={visibleRosters.length - shown.rosters} onMore={() => more("rosters")}>
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className={`w-[60px] ${HEAD}`}>#</TableHead>
                      <TableHead className={HEAD}>Jugador</TableHead>
                      <TableHead className={HEAD}>Equipo</TableHead>
                      <TableHead className={HEAD}>Categoría</TableHead>
                      <TableHead className={HEAD}>Posición</TableHead>
                      <TableHead className={`w-[100px] ${HEAD}`}>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleRosters.slice(0, shown.rosters).map((r: any) => (
                      <TableRow key={r.id} className="odd:bg-muted/30">
                        {editingRosterId === r.id ? (
                          <>
                            <TableCell><Input value={editRosterJersey} onChange={e => setEditRosterJersey(e.target.value)} className="h-8 w-[64px]" type="number" /></TableCell>
                            <TableCell className="font-semibold">{r.players?.last_name} <span className="font-normal text-muted-foreground">{r.players?.first_name}</span></TableCell>
                            <TableCell>
                              <Select value={editRosterTeamId} onValueChange={setEditRosterTeamId}>
                                <SelectTrigger className="h-8 w-[200px] text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>{teamOptions}</SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell><CatChip name={(r.teams as any)?.categories?.name} /></TableCell>
                            <TableCell>
                              <Select value={editRosterPosition} onValueChange={setEditRosterPosition}>
                                <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                                <SelectContent>{POSITIONS}</SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button size="sm" className="h-8 w-8 p-0" title="Guardar" onClick={() => updateRosterMutation.mutate({ id: r.id, team_id: editRosterTeamId, jersey_number: editRosterJersey, position: editRosterPosition })} disabled={!editRosterTeamId || updateRosterMutation.isPending}><Save className="h-4 w-4" /></Button>
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Cancelar" onClick={() => setEditingRosterId(null)}><X className="h-4 w-4" /></Button>
                              </div>
                            </TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell><Jersey n={r.jersey_number} /></TableCell>
                            <TableCell className="leading-tight">
                              <span className="block font-semibold">{r.players?.last_name}</span>
                              <span className="block text-sm text-muted-foreground">{r.players?.first_name}</span>
                            </TableCell>
                            <TableCell className="text-sm font-medium">{r.teams?.name}</TableCell>
                            <TableCell><CatChip name={(r.teams as any)?.categories?.name} /></TableCell>
                            <TableCell>
                              <Select value={r.position ?? "NONE"} onValueChange={(v) => updateRosterPositionMutation.mutate({ id: r.id, position: v === "NONE" ? "" : v })}>
                                <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                                <SelectContent>{POSITIONS}</SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Editar" onClick={() => { setEditingRosterId(r.id); setEditRosterTeamId(r.team_id ?? ""); setEditRosterJersey(String(r.jersey_number ?? "")); setEditRosterPosition(r.position ?? "NONE"); }}><Pencil className="h-4 w-4" /></Button>
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" title="Quitar del equipo" onClick={() => { if (window.confirm(`¿Quitar a ${r.players?.first_name} ${r.players?.last_name} del equipo ${r.teams?.name}? Esta acción no se puede deshacer.`)) deleteRosterMutation.mutate(r.id); }}><Trash2 className="h-4 w-4" /></Button>
                              </div>
                            </TableCell>
                          </>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {visibleRosters.length === 0 && (
                  <Empty icon={Shirt} text={searchRosters ? `Sin resultados para "${searchRosters}".` : filterActive ? "No hay nóminas con este filtro." : "Sin nóminas aún en esta edición."} />
                )}
              </TableShell>
            </TabsContent>

            {/* ---------------- CUERPO TÉCNICO ---------------- */}
            <TabsContent value="staff" className="space-y-4">
              <FormCard icon={Plus} title="Agregar cuerpo técnico">
                <div className="flex flex-wrap items-end gap-3">
                  <Field label="Equipo">
                    <Select value={staffTeamId} onValueChange={setStaffTeamId}>
                      <SelectTrigger className="w-[300px]"><SelectValue placeholder="Seleccionar equipo" /></SelectTrigger>
                      <SelectContent>{teamOptions}</SelectContent>
                    </Select>
                  </Field>
                  <Field label="Nombre"><Input value={staffFirst} onChange={e => setStaffFirst(e.target.value)} placeholder="Nombre" className="w-[160px]" /></Field>
                  <Field label="Apellido"><Input value={staffLast} onChange={e => setStaffLast(e.target.value)} placeholder="Apellido" className="w-[160px]" /></Field>
                  <Field label="Rol">
                    <Select value={staffRole} onValueChange={setStaffRole}>
                      <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ENTRENADOR">Entrenador</SelectItem>
                        <SelectItem value="ASISTENTE">Asistente</SelectItem>
                        <SelectItem value="DELEGADO">Delegado</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Button onClick={() => createStaffMutation.mutate()} disabled={!staffTeamId || !staffFirst || !staffLast || createStaffMutation.isPending} className="gap-1">
                    <Plus className="h-4 w-4" /> Agregar
                  </Button>
                </div>
              </FormCard>

              <SearchBar value={searchStaff} onChange={setSearchStaff} placeholder="Buscar por nombre, equipo, rol o VeloPro…" shown={visibleStaff.length} total={staff.length} />

              <TableShell remaining={visibleStaff.length - shown.staff} onMore={() => more("staff")}>
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className={HEAD}>Nombre</TableHead>
                      <TableHead className={HEAD}>Categoría</TableHead>
                      <TableHead className={HEAD}>Equipo</TableHead>
                      <TableHead className={HEAD}>Rol</TableHead>
                      <TableHead className={HEAD}>VeloPro</TableHead>
                      <TableHead className={`w-[100px] ${HEAD}`}>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleStaff.slice(0, shown.staff).map((st: any) => (
                      <TableRow key={st.id} className="odd:bg-muted/30">
                        {editingStaffId === st.id ? (
                          <>
                            <TableCell>
                              <div className="flex gap-1">
                                <Input value={editStaffFirst} onChange={e => setEditStaffFirst(e.target.value)} className="h-8 min-w-[110px]" placeholder="Nombre" />
                                <Input value={editStaffLast} onChange={e => setEditStaffLast(e.target.value)} className="h-8 min-w-[110px]" placeholder="Apellido" />
                              </div>
                            </TableCell>
                            <TableCell><CatChip name={st.teams?.categories?.name} /></TableCell>
                            <TableCell className="text-sm font-medium">{st.teams?.name}</TableCell>
                            <TableCell>
                              <Select value={editStaffRole} onValueChange={setEditStaffRole}>
                                <SelectTrigger className="h-8 w-[130px]"><SelectValue /></SelectTrigger>
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
                                <Button size="sm" className="h-8 w-8 p-0" title="Guardar" onClick={() => updateStaffMutation.mutate({ id: st.id, first_name: editStaffFirst, last_name: editStaffLast, role: editStaffRole, velopro_number: editStaffVelopro })}><Save className="h-4 w-4" /></Button>
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Cancelar" onClick={() => setEditingStaffId(null)}><X className="h-4 w-4" /></Button>
                              </div>
                            </TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell className="font-semibold">{st.first_name} {st.last_name}</TableCell>
                            <TableCell>
                              <CatChip name={st.teams?.categories?.name} />
                              <span className="mt-0.5 block text-[11px] text-muted-foreground">{st.teams?.categories?.divisions?.name ?? ""}</span>
                            </TableCell>
                            <TableCell className="text-sm font-medium">{st.teams?.name}</TableCell>
                            <TableCell>
                              <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${ROLE_STYLE[st.role] ?? "bg-muted"}`}>{st.role}</span>
                            </TableCell>
                            <TableCell>{st.velopro_number ? <span className="font-mono text-sm">{st.velopro_number}</span> : <span className="text-muted-foreground">—</span>}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Editar" onClick={() => { setEditingStaffId(st.id); setEditStaffFirst(st.first_name); setEditStaffLast(st.last_name); setEditStaffRole(st.role); setEditStaffVelopro(st.velopro_number ?? ""); }}><Pencil className="h-4 w-4" /></Button>
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" title="Eliminar" onClick={() => { if (window.confirm(`¿Eliminar a ${st.first_name} ${st.last_name} (${st.role}) de ${st.teams?.name}? Esta acción no se puede deshacer.`)) deleteStaffMutation.mutate(st.id); }}><Trash2 className="h-4 w-4" /></Button>
                              </div>
                            </TableCell>
                          </>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {visibleStaff.length === 0 && (
                  <Empty icon={ClipboardList} text={searchStaff ? `Sin resultados para "${searchStaff}".` : filterActive ? "No hay cuerpo técnico con este filtro." : "Sin cuerpo técnico aún en esta edición."} />
                )}
              </TableShell>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
