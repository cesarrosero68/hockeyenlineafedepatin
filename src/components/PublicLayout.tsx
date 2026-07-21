import { Link, Outlet, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Trophy, Calendar, BarChart3, Shield, Menu, Settings, Award, CalendarDays, Home, TrendingUp, ChevronDown } from "lucide-react";
import { useState } from "react";
import { useTournament } from "@/contexts/TournamentContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const navItems = [
  { to: "/", label: "Inicio", icon: Trophy },
  { to: "/teams", label: "Equipos", icon: Shield },
  { to: "/schedule", label: "Programación", icon: Calendar },
  { to: "/standings", label: "Posiciones", icon: BarChart3 },
];
const statsItems = [
  { to: "/stats", label: "Estadísticas", icon: TrendingUp },
  { to: "/fair-play", label: "Fair Play", icon: Shield },
  { to: "/podium", label: "Podio", icon: Award },
];
const statsPaths = statsItems.map((i) => i.to);

const mobilePrimary = [
  { to: "/", label: "Inicio", icon: Home },
  { to: "/schedule", label: "Programación", icon: Calendar },
  { to: "/standings", label: "Posiciones", icon: BarChart3 },
  { to: "/teams", label: "Equipos", icon: Shield },
];
const mobileMore = [
  { to: "/editions", label: "Ediciones", icon: CalendarDays },
  { to: "/admin", label: "Admin", icon: Settings },
];

export default function PublicLayout() {
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const { isReadOnly, viewedTournament, clearEdition } = useTournament();
  const statsActive = statsPaths.includes(location.pathname);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="container flex h-20 items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3 shrink-0 min-w-0">
            <img
              src="/logos/fedepatin-logo.png"
              alt="Fedepatin Logo"
              className="h-14 w-auto object-contain shrink-0"
            />
            <span className="font-display text-lg font-bold uppercase tracking-tight hidden sm:inline whitespace-nowrap">
              Hockey en Línea
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-0.5 flex-nowrap">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                  location.pathname === item.to
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}

            {/* Stats dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={cn(
                  "flex items-center gap-1 px-2.5 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                  statsActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}>
                  <TrendingUp className="h-4 w-4" />
                  Stats
                  <ChevronDown className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[180px]">
                {statsItems.map((s) => (
                  <DropdownMenuItem key={s.to} asChild>
                    <Link to={s.to} className="flex items-center gap-2 cursor-pointer">
                      <s.icon className="h-4 w-4" />
                      {s.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Link
              to="/editions"
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                location.pathname === "/editions"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <CalendarDays className="h-4 w-4" />
              Ediciones
            </Link>
            <Link
              to="/admin"
              className="flex items-center gap-1.5 px-2.5 py-2 rounded-md text-sm font-medium transition-colors text-muted-foreground hover:bg-muted hover:text-foreground whitespace-nowrap"
            >
              <Settings className="h-4 w-4" />
              Admin
            </Link>
          </nav>
        </div>

        {isReadOnly && viewedTournament && (
          <div className="bg-yellow-100 dark:bg-yellow-900/40 border-t border-yellow-300 dark:border-yellow-700 text-yellow-900 dark:text-yellow-100">
            <div className="container flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
              <span>Viendo edición: <strong>{viewedTournament.name}</strong> — Solo lectura</span>
              <Button size="sm" variant="outline" onClick={clearEdition}>
                Volver a edición activa
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-20 md:pb-0">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t bg-card py-6">
        <div className="container text-center text-sm text-muted-foreground space-y-1">
          <div>© 2026 Fedepatin - Hockey en Línea. Todos los derechos reservados.</div>
          <div>
            Desarrollo por{" "}
            <a
              href="https://www.instagram.com/hlc_hockeycolombia/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              Fundación HLC
            </a>
            {" "}- César Rosero
          </div>
        </div>
      </footer>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t">
        <div className="grid grid-cols-6">
          {mobilePrimary.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link key={item.to} to={item.to}
                className={cn("flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium",
                  active ? "text-primary" : "text-muted-foreground")}>
                <item.icon className="h-5 w-5" />
                <span className="leading-tight">{item.label}</span>
              </Link>
            );
          })}

          <Sheet open={statsOpen} onOpenChange={setStatsOpen}>
            <SheetTrigger asChild>
              <button className={cn("flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium",
                statsActive ? "text-primary" : "text-muted-foreground")}>
                <TrendingUp className="h-5 w-5" />
                <span className="leading-tight">Stats</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl">
              <SheetHeader><SheetTitle>Stats</SheetTitle></SheetHeader>
              <div className="grid grid-cols-1 gap-2 mt-4">
                {statsItems.map((item) => {
                  const active = location.pathname === item.to;
                  return (
                    <Link key={item.to} to={item.to} onClick={() => setStatsOpen(false)}
                      className={cn("flex items-center gap-2 rounded-md p-3 text-sm font-medium border",
                        active ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </SheetContent>
          </Sheet>

          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetTrigger asChild>
              <button className="flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium text-muted-foreground">
                <Menu className="h-5 w-5" />
                <span className="leading-tight">Más</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl">
              <SheetHeader><SheetTitle>Más opciones</SheetTitle></SheetHeader>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {mobileMore.map((item) => {
                  const active = location.pathname === item.to;
                  return (
                    <Link key={item.to} to={item.to} onClick={() => setMoreOpen(false)}
                      className={cn("flex items-center gap-2 rounded-md p-3 text-sm font-medium border",
                        active ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </div>
  );
}
