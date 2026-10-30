// Piezas visuales compartidas por las pantallas de administración (mismo estilo en todas).
import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";

/** Color estable por categoría (el mismo criterio que usa la Programación). */
export function catStyle(name?: string | null) {
  const n = name ?? "";
  let h = 0;
  for (let i = 0; i < n.length; i++) h = (h * 17 + n.charCodeAt(i)) % 360;
  return { color: `hsl(${h} 60% 36%)`, backgroundColor: `hsl(${h} 60% 42% / 0.12)` };
}

export function CatChip({ name, className }: { name?: string | null; className?: string }) {
  if (!name) return <span className="text-muted-foreground">—</span>;
  return (
    <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-bold ${className ?? ""}`} style={catStyle(name)}>
      {name}
    </span>
  );
}

export function FormCard({ icon: Icon, title, children }: { icon: any; title: string; children: ReactNode }) {
  return (
    <Card className="overflow-hidden rounded-2xl shadow-sm">
      <div className="flex items-center gap-2 border-b bg-primary/10 px-4 py-2.5 font-display text-base font-bold uppercase text-primary">
        <Icon className="h-4 w-4" /> {title}
      </div>
      <CardContent className="p-4">{children}</CardContent>
    </Card>
  );
}

export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={`space-y-1 ${className ?? ""}`}>
      <label className="text-xs font-medium">{label}</label>
      {children}
    </div>
  );
}

export function SearchBar({
  value, onChange, placeholder, shown, total,
}: { value: string; onChange: (v: string) => void; placeholder: string; shown?: number; total?: number }) {
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
      {shown !== undefined && total !== undefined && (
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">{shown} de {total}</span>
      )}
    </div>
  );
}

export function Empty({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-sm text-muted-foreground">
      <Icon className="h-8 w-8 opacity-40" /> {text}
    </div>
  );
}

export function StatChip({ icon: Icon, label, value, warn }: { icon: any; label: string; value: number | string; warn?: boolean }) {
  return (
    <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${warn ? "border-amber-300 bg-amber-50" : "bg-card"}`}>
      <span className={`grid h-8 w-8 place-items-center rounded-lg ${warn ? "bg-amber-200 text-amber-800" : "bg-primary/10 text-primary"}`}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="leading-tight">
        <span className="block font-display text-lg font-bold">{value}</span>
        <span className="block text-[11px] text-muted-foreground">{label}</span>
      </span>
    </div>
  );
}
