import { useAuth } from "@/contexts/AuthContext";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, Trophy, Calendar, FileText,
  Shield, LogOut, Settings, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

const sidebarItems = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/divisions", label: "Divisiones", icon: Trophy },
  { to: "/admin/clubs", label: "Clubes", icon: Shield },
  { to: "/admin/teams", label: "Equipos", icon: Users },
  { to: "/admin/players", label: "Jugadores", icon: Users },
  { to: "/admin/matches", label: "Partidos", icon: Calendar },
  { to: "/admin/audit", label: "Auditoría", icon: FileText },
];

export default function AdminDashboard() {
  const { user, role, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && (!user || !role)) {
      navigate("/login");
    }
  }, [user, role, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user || !role) return null;

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col">
        <div className="p-4 border-b border-sidebar-border">
          <Link to="/" className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-sidebar-primary" />
            <span className="font-display text-lg font-bold uppercase">Admin</span>
          </Link>
          <p className="text-xs text-sidebar-foreground/60 mt-1 capitalize">Rol: {role}</p>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {sidebarItems.map((item) => {
            const isActive = item.exact
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
                {isActive && <ChevronRight className="h-3 w-3 ml-auto" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground"
            onClick={() => signOut().then(() => navigate("/login"))}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Cerrar sesión
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col">
        <header className="h-14 border-b bg-card flex items-center px-6">
          <h2 className="font-display text-lg font-bold uppercase text-foreground">
            Panel de Administración
          </h2>
        </header>
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
