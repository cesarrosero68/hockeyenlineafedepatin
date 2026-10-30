import { useState, Fragment } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, ChevronDown, ChevronRight, ListChecks } from "lucide-react";
import { formatBogota } from "@/lib/timezone";
import { StatChip, Empty } from "@/components/admin/AdminBits";

const HEAD = "bg-primary/10 text-xs font-bold uppercase tracking-wide text-primary";
const ACTION: Record<string, { label: string; cls: string }> = {
  INSERT: { label: "Creó", cls: "bg-emerald-100 text-emerald-800" },
  UPDATE: { label: "Modificó", cls: "bg-blue-100 text-blue-800" },
  DELETE: { label: "Eliminó", cls: "bg-red-100 text-red-800" },
};
const actionInfo = (a: string) => ACTION[String(a).toUpperCase()] ?? { label: a, cls: "bg-muted text-foreground" };

export default function AdminAudit() {
  const [filterTable, setFilterTable] = useState<string>("all");
  const [filterAction, setFilterAction] = useState<string>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["admin-audit"],
    queryFn: async () => {
      const { data, error } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      return data;
    },
  });

  const tables = [...new Set(logs.map((l) => l.table_name))].sort();
  const actions = [...new Set(logs.map((l) => l.action))].sort();
  const filtered = logs.filter((l) => {
    if (filterTable !== "all" && l.table_name !== filterTable) return false;
    if (filterAction !== "all" && l.action !== filterAction) return false;
    return true;
  });

  if (isLoading) {
    return <div className="flex justify-center py-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="flex items-center gap-2 font-display text-2xl font-bold uppercase">
        <FileText className="h-6 w-6 text-primary" /> Auditoría
      </h1>

      <div className="flex flex-wrap items-center gap-3">
        <StatChip icon={ListChecks} label="Registros mostrados" value={`${filtered.length} de ${logs.length}`} />
        <Select value={filterTable} onValueChange={setFilterTable}>
          <SelectTrigger className="w-[190px] bg-card"><SelectValue placeholder="Tabla" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las tablas</SelectItem>
            {tables.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterAction} onValueChange={setFilterAction}>
          <SelectTrigger className="w-[160px] bg-card"><SelectValue placeholder="Acción" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las acciones</SelectItem>
            {actions.map((a) => <SelectItem key={a} value={a}>{actionInfo(a).label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-hidden rounded-2xl shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={`w-8 ${HEAD}`} />
                <TableHead className={HEAD}>Fecha</TableHead>
                <TableHead className={HEAD}>Tabla</TableHead>
                <TableHead className={HEAD}>Acción</TableHead>
                <TableHead className={HEAD}>Registro</TableHead>
                <TableHead className={HEAD}>Resumen del cambio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((log) => {
                const a = actionInfo(log.action);
                const isOpen = openId === log.id;
                const summary = log.new_data ? JSON.stringify(log.new_data) : log.old_data ? JSON.stringify(log.old_data) : "—";
                return (
                  <Fragment key={log.id}>
                    <TableRow className="cursor-pointer odd:bg-muted/30" onClick={() => setOpenId(isOpen ? null : log.id)}>
                      <TableCell>{isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs">{formatBogota(log.created_at, "d MMM yyyy HH:mm")}</TableCell>
                      <TableCell className="text-xs font-semibold">{log.table_name}</TableCell>
                      <TableCell><span className={`rounded-md px-2 py-0.5 text-xs font-bold ${a.cls}`}>{a.label}</span></TableCell>
                      <TableCell className="font-mono text-xs">{log.record_id?.slice(0, 8) ?? "—"}</TableCell>
                      <TableCell className="max-w-[280px] truncate text-xs text-muted-foreground">{summary}</TableCell>
                    </TableRow>
                    {isOpen && (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={6} className="bg-muted/40">
                          <div className="grid gap-3 md:grid-cols-2">
                            <div>
                              <div className="mb-1 text-xs font-bold uppercase text-muted-foreground">Antes</div>
                              <pre className="max-h-64 overflow-auto rounded-lg bg-card p-2 text-[11px]">{log.old_data ? JSON.stringify(log.old_data, null, 2) : "—"}</pre>
                            </div>
                            <div>
                              <div className="mb-1 text-xs font-bold uppercase text-muted-foreground">Después</div>
                              <pre className="max-h-64 overflow-auto rounded-lg bg-card p-2 text-[11px]">{log.new_data ? JSON.stringify(log.new_data, null, 2) : "—"}</pre>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
        {filtered.length === 0 && <Empty icon={FileText} text="No hay registros de auditoría" />}
      </Card>
    </div>
  );
}
