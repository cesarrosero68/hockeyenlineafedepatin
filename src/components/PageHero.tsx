import type { LucideIcon } from "lucide-react";

/** Encabezado común de las páginas internas (mismo estilo que el inicio). */
export default function PageHero({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
}) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/70 text-primary-foreground">
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.12]"
        viewBox="0 0 800 300"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <g fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="400" cy="150" r="70" />
          <line x1="400" y1="0" x2="400" y2="300" />
          <circle cx="130" cy="150" r="48" />
          <circle cx="670" cy="150" r="48" />
          <line x1="110" y1="0" x2="110" y2="300" />
          <line x1="690" y1="0" x2="690" y2="300" />
        </g>
      </svg>
      <div className="container relative flex items-center gap-4 py-7 md:py-10">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-white/25 bg-white/15 md:h-14 md:w-14">
          <Icon className="h-6 w-6 text-secondary md:h-7 md:w-7" />
        </span>
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold uppercase leading-tight tracking-tight md:text-4xl">{title}</h1>
          {subtitle && <p className="mt-1 text-sm opacity-90 md:text-base">{subtitle}</p>}
        </div>
      </div>
    </section>
  );
}
