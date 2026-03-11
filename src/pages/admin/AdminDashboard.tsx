import { useAuth } from "@/contexts/AuthContext";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, Trophy, Calendar, FileText, Shield, LogOut, ChevronRight, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useRef } from "react";
import PublicLayout from "@/components/PublicLayout";

const adminNavItems = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/divisions", label: "Divisiones", icon: Trophy },
  { to: "/admin/clubs", label: "Clubes", icon: Shield },
  { to: "/admin/teams", label: "Equipos", icon: Users },
  { to: "/admin/players", label: "Jugadores", icon: Users },
  { to: "/admin/matches", label: "Partidos", icon: Calendar },
  { to: "/admin/audit", label: "Auditoría", icon: FileText },
  { to: "/admin/upload", label: "Cargue CSV", icon: Upload },
];

export default function AdminDashboard() {
  const { user, role, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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

  return (
    <div className="min-h-screen flex flex-col">
      {/* Admin sub-nav */}
      <div className="border-b bg-muted/50">
        <div className="container flex items-center gap-1 overflow-x-auto py-2">
          {adminNavItems.map((item) => {
            const isActive = item.exact
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to) && item.to !== "/admin";
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
          <div className="ml-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut().then(() => navigate("/login"))}
              className="text-muted-foreground"
            >
              <LogOut className="h-4 w-4 mr-1" />
              Salir
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 container py-6">
        <Outlet />
      </main>
    </div>
  );
}
