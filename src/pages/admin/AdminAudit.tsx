import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText } from "lucide-react";
import { formatBogota } from "@/lib/timezone";

export default function AdminAudit() {
  const [filterTable, setFilterTable] = useState<string>("all");
  const [filterAction, setFilterAction] = useState<string>("all");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["admin-audit"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
  });

  const tables = [...new Set(logs.map(l => l.table_name))].sort();
  const actions = [...new Set(logs.map(l => l.action))].sort();

  const filtered = logs.filter(l => {
    if (filterTable !== "all" && l.table_name !== filterTable) return false;
    if (filterAction !== "all" && l.action !== filterAction) return false;
    return true;
  });

  if (isLoading) {
    return <div className="flex justify-center py-8"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold uppercase flex items-center gap-2">
        <FileText className="h-6 w-6 text-primary" /> Auditoría
      </h1>

      <div className="flex gap-3 flex-wrap">
        <Select value={filterTable} onValueChange={setFilterTable}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Tabla" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las tablas</SelectItem>
            {tables.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterAction} onValueChange={setFilterAction}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Acción" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {actions.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground self-center">{filtered.length} registros</span>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Tabla</TableHead>
              <TableHead>Acción</TableHead>
              <TableHead>Registro</TableHead>
              <TableHead>Datos anteriores</TableHead>
              <TableHead>Datos nuevos</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(log => (
              <TableRow key={log.id}>
                <TableCell className="text-xs whitespace-nowrap">{formatBogota(log.created_at, "d MMM yyyy HH:mm")}</TableCell>
                <TableCell className="text-xs">{log.table_name}</TableCell>
                <TableCell className="text-xs">{log.action}</TableCell>
                <TableCell className="text-xs font-mono">{log.record_id?.slice(0, 8) ?? "—"}</TableCell>
                <TableCell className="text-xs max-w-[200px] truncate">{log.old_data ? JSON.stringify(log.old_data) : "—"}</TableCell>
                <TableCell className="text-xs max-w-[200px] truncate">{log.new_data ? JSON.stringify(log.new_data) : "—"}</TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No hay registros de auditoría</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
