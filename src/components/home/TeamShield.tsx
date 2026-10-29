import { cn } from "@/lib/utils";

/** Escudo del equipo: usa el logo si existe; si no, iniciales sobre un color estable según el nombre. */
function colorFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return `hsl(${h} 55% 40%)`;
}
function initials(name: string) {
  const parts = name.replace(/[-_]/g, " ").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

const SIZES = {
  sm: "h-8 w-8 text-[11px]",
  md: "h-10 w-10 text-xs",
  lg: "h-16 w-16 text-xl",
} as const;

export default function TeamShield({
  name,
  logo,
  size = "sm",
  className,
}: {
  name?: string | null;
  logo?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const label = name ?? "";
  if (logo) {
    return (
      <img
        src={logo}
        alt={label}
        loading="lazy"
        className={cn("rounded-full object-cover bg-white shrink-0 border border-border", SIZES[size], className)}
      />
    );
  }
  return (
    <span
      aria-label={label}
      className={cn(
        "rounded-full grid place-items-center text-white font-bold shrink-0 shadow-sm",
        SIZES[size],
        !label && "bg-muted text-muted-foreground",
        className,
      )}
      style={label ? { backgroundColor: colorFor(label) } : undefined}
    >
      {label ? initials(label) : "?"}
    </span>
  );
}
