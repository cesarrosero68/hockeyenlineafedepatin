import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Calendar, Star, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";

export default function Index() {
  const { data: divisions = [] } = useQuery({
    queryKey: ["divisions"],
    queryFn: async () => {
      const { data } = await supabase.from("divisions").select("*");
      return data ?? [];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*").order("sort_order");
      return data ?? [];
    },
  });

  return (
    <div className="container py-8 space-y-10">
      {/* Hero */}
      <section className="text-center space-y-4 py-8">
        <h1 className="text-4xl md:text-5xl font-display font-bold uppercase tracking-tight">
          Fedepatin - Hockey en Línea
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Programación, resultados, posiciones y estadísticas en tiempo real
        </p>
      </section>

      {/* Divisions */}
      <section className="space-y-6">
        <h2 className="text-2xl font-display font-bold uppercase flex items-center gap-2">
          <Trophy className="h-6 w-6 text-secondary" />
          Divisiones
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          {divisions.length === 0 ? (
            <Card className="col-span-2">
              <CardContent className="py-12 text-center text-muted-foreground">
                <Trophy className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>No hay divisiones configuradas aún.</p>
                <p className="text-sm mt-1">Configúralas desde el panel administrativo.</p>
              </CardContent>
            </Card>
          ) : (
            divisions.map((div: any) => (
              <Card key={div.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <CardContent className="flex items-center gap-4 py-6">
                  {div.logo_url && (
                    <img src={div.logo_url} alt={div.name} className="h-16 w-16 object-contain rounded-lg" />
                  )}
                  <div>
                    <p className="font-display font-bold uppercase">{div.name}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {categories
                        .filter((c: any) => c.division_id === div.id)
                        .map((cat: any) => (
                          <Badge key={cat.id} variant="secondary" className="text-xs">{cat.name}</Badge>
                        ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </section>

      {/* Quick Links */}
      <section className="grid sm:grid-cols-3 gap-4">
        <Link to="/schedule">
          <Card className="hover:shadow-md transition-shadow cursor-pointer group">
            <CardContent className="flex items-center gap-4 py-6">
              <Calendar className="h-10 w-10 text-primary group-hover:scale-110 transition-transform" />
              <div>
                <p className="font-display font-bold uppercase">Programación</p>
                <p className="text-sm text-muted-foreground">Calendario de partidos</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link to="/standings">
          <Card className="hover:shadow-md transition-shadow cursor-pointer group">
            <CardContent className="flex items-center gap-4 py-6">
              <TrendingUp className="h-10 w-10 text-accent group-hover:scale-110 transition-transform" />
              <div>
                <p className="font-display font-bold uppercase">Posiciones</p>
                <p className="text-sm text-muted-foreground">Tabla general</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link to="/stats">
          <Card className="hover:shadow-md transition-shadow cursor-pointer group">
            <CardContent className="flex items-center gap-4 py-6">
              <Star className="h-10 w-10 text-secondary group-hover:scale-110 transition-transform" />
              <div>
                <p className="font-display font-bold uppercase">Estadísticas</p>
                <p className="text-sm text-muted-foreground">Líderes del torneo</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </section>
    </div>
  );
}
