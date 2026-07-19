import { Link, Outlet, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Trophy, Calendar, BarChart3, Shield, Menu, Settings, Award, CalendarDays, Home, TrendingUp, Users } from "lucide-react";
import { useState } from "react";
import { useTournament } from "@/contexts/TournamentContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const navItems = [
  { to: "/", label: "Inicio", icon: Trophy },
  { to: "/teams", label: "Equipos", icon: Shield },
  { to: "/schedule", label: "Programación", icon: Calendar },
  { to: "/standings", label: "Posiciones", icon: BarChart3 },
  { to: "/stats", label: "Estadísticas", icon: BarChart3 },
  { to: "/fair-play", label: "Fair Play", icon: Shield },
  { to: "/podium", label: "Podio", icon: Award },
  { to: "/editions", label: "Ediciones", icon: CalendarDays },
];

const mobilePrimary = [
  { to: "/", label: "Inicio", icon: Home },
  { to: "/schedule", label: "Programación", icon: Calendar },
  { to: "/standings", label: "Posiciones", icon: BarChart3 },
  { to: "/teams", label: "Equipos", icon: Shield },
  { to: "/stats", label: "Estadísticas", icon: TrendingUp },
];
const mobileMore = [
  { to: "/fair-play", label: "Fair Play", icon: Shield },
  { to: "/podium", label: "Podio", icon: Award },
  { to: "/editions", label: "Ediciones", icon: CalendarDays },
  { to: "/admin", label: "Admin", icon: Settings },
];

export default function PublicLayout() {
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const { tournaments, currentId, setCurrentId } = useTournament();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="container flex h-20 items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img
              src="/logos/fedepatin-logo.png"
              alt="Fedepatin Logo"
              className="h-[70px] w-auto object-contain"
            />
            <span className="font-display text-xl font-bold uppercase tracking-tight hidden sm:inline">
              Hockey en Línea
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  location.pathname === item.to
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
            {tournaments.length > 1 && currentId && (
              <Select value={currentId} onValueChange={setCurrentId}>
                <SelectTrigger className="h-8 w-[150px] text-xs ml-2"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {tournaments.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Link
              to="/admin"
              className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors text-muted-foreground hover:bg-muted hover:text-foreground ml-2"
            >
              <Settings className="h-4 w-4" />
              Admin
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-20 md:pb-0">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t bg-card py-6">
        <div className="container text-center text-sm text-muted-foreground">
          © 2026 Fedepatin - Hockey en Línea. Todos los derechos reservados.
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
              {tournaments.length > 1 && currentId && (
                <div className="mt-4">
                  <div className="text-xs text-muted-foreground mb-1">Edición</div>
                  <Select value={currentId} onValueChange={setCurrentId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {tournaments.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </div>
  );
}
