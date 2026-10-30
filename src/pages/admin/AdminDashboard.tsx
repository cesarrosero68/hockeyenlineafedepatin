import { useAuth } from "@/contexts/AuthContext";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, Trophy, Calendar, FileText, Shield, LogOut, ClipboardList, Upload, Palette, FileSpreadsheet, Database, Star, Megaphone, ExternalLink, Menu, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useTournament } from "@/contexts/TournamentContext";

type NavItem = { to: string; label: string; icon: any; exact?: boolean };

const navGroups: { title: string | null; items: NavItem[] }[] = [
  {
    title: null,
    items: [
      { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
      { to: "/admin/protocols", label: "Protocolos", icon: ClipboardList },
    ],
  },
  {
    title: "Competencia",
    items: [
      { to: "/admin/matches", label: "Partidos", icon: Calendar },
      { to: "/admin/divisions", label: "Divisiones", icon: Trophy },
      { to: "/admin/awards", label: "Podio y Premios", icon: Star },
      { to: "/admin/tournaments", label: "Torneos", icon: Database },
    ],
  },
  {
    title: "Equipos y personas",
    items: [
      { to: "/admin/clubs", label: "Clubes", icon: Shield },
      { to: "/admin/teams", label: "Equipos", icon: Users },
      { to: "/admin/players", label: "Jugadores", icon: UserRound },
    ],
  },
  {
    title: "Sistema",
    items: [
      { to: "/admin/upload", label: "Cargue CSV", icon: Upload },
      { to: "/admin/export", label: "Exportar", icon: FileSpreadsheet },
      { to: "/admin/appearance", label: "Apariencia", icon: Palette },
      { to: "/admin/sponsors", label: "Patrocinadores", icon: Megaphone },
      { to: "/admin/audit", label: "Auditoría", icon: FileText },
    ],
  },
];

function SideNav({ pathname, onNavigate, onSignOut }: { pathname: string; onNavigate?: () => void; onSignOut: () => void }) {
  const { current } = useTournament();
  return (
    <nav className="flex h-full flex-col bg-primary p-3 text-primary-foreground">
      <div className="mb-2 rounded-xl bg-white/12 px-3 py-2 text-xs">
        <span className="opacity-70">Torneo activo</span>
        <b className="block text-sm">{current?.name ?? "—"}</b>
      </div>
      <div className="flex-1 overflow-y-auto">
        {navGroups.map((g, gi) => (
          <div key={gi}>
            {g.title && (
              <p className="mx-3 mb-1 mt-4 text-[10px] font-semibold uppercase tracking-[0.12em] opacity-55">{g.title}</p>
            )}
            {g.items.map((item) => {
              const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                    active ? "bg-white font-bold text-primary" : "opacity-90 hover:bg-white/10",
                  )}
                >
                  <item.icon className="h-[18px] w-[18px] shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-3 border-t border-white/15 pt-2">
        <a href="/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm opacity-90 hover:bg-white/10">
          <ExternalLink className="h-[18px] w-[18px]" />
          Ver sitio
        </a>
        <button onClick={onSignOut} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm opacity-90 hover:bg-white/10">
          <LogOut className="h-[18px] w-[18px]" />
          Salir
        </button>
      </div>
    </nav>
  );
}

export default function AdminDashboard() {
  const { user, role, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const wasAuthenticatedRef = useRef(false);
  if (user && role) wasAuthenticatedRef.current = true;

  useEffect(() => {
    if (!loading && !user && !wasAuthenticatedRef.current) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  if (loading && !wasAuthenticatedRef.current) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }
  if (!user && !wasAuthenticatedRef.current) return null;

  const doSignOut = () => signOut().then(() => navigate("/login"));
  const allItems = navGroups.flatMap((g) => g.items);
  const currentLabel =
    allItems.find((i) => (i.exact ? location.pathname === i.to : location.pathname.startsWith(i.to)))?.label ?? "Admin";

  return (
    <div className="flex min-h-[calc(100vh-81px)] flex-col lg:flex-row">
      {/* Menú lateral (escritorio) */}
      <aside className="sticky top-[81px] hidden h-[calc(100vh-81px)] w-60 shrink-0 lg:block">
        <SideNav pathname={location.pathname} onSignOut={doSignOut} />
      </aside>

      {/* Barra superior (celular / tableta) */}
      <div className="sticky top-[81px] z-30 flex items-center gap-3 bg-primary px-4 py-3 text-primary-foreground lg:hidden">
        <button onClick={() => setOpen(true)} aria-label="Abrir menú" className="rounded-lg p-1 hover:bg-white/10">
          <Menu className="h-6 w-6" />
        </button>
        <span className="font-display text-lg font-bold uppercase">Admin · {currentLabel}</span>
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-64 border-0 p-0">
          <SheetTitle className="sr-only">Menú de administración</SheetTitle>
          <SideNav pathname={location.pathname} onNavigate={() => setOpen(false)} onSignOut={doSignOut} />
        </SheetContent>
      </Sheet>

      {/* Contenido */}
      <main className="min-w-0 flex-1 p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  );
}
