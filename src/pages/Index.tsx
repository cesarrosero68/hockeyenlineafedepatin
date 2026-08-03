import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Calendar, Star, TrendingUp, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { useTournament } from "@/contexts/TournamentContext";

export default function Index() {
  const { viewedTournament } = useTournament();
  const {
    data: divisions = [],
    isLoading: isLoadingDivisions,
    isError: isErrorDivisions,
  } = useQuery({
    queryKey: ["divisions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("divisions").select("id, name, logo_url").order("name");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
    retry: 3,
    retryDelay: 1000,
  });

  const { data: categories = [], isError: isErrorCategories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("id, name, division_id").order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="container py-8 space-y-10">
      <section className="text-center space-y-4 py-8">
        <h1 className="text-4xl md:text-5xl font-display font-bold uppercase tracking-tight">{viewedTournament?.home_title || "Fedepatin - Hockey en Línea"}</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          {viewedTournament?.home_subtitle || "Programación, resultados, posiciones y estadísticas en tiempo real"}
        </p>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-display font-bold uppercase flex items-center gap-2">
          <Trophy className="h-6 w-6 text-secondary" />
          Divisiones
        </h2>

        {isLoadingDivisions ? (
          <Card>
            <CardContent className="py-12 flex justify-center">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </CardContent>
          </Card>
        ) : isErrorDivisions || isErrorCategories ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <AlertTriangle className="h-10 w-10 mx-auto mb-3 text-destructive" />
              <p>No se pudieron cargar las divisiones.</p>
              <p className="text-sm mt-1">Recarga la página. Si persiste, revisa la conexión del backend.</p>
            </CardContent>
          </Card>
        ) : (
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
                <Link key={div.id} to={`/teams?division=${encodeURIComponent(div.id)}`} className="block group">
                  <Card className="overflow-hidden h-full hover:shadow-lg hover:border-primary/40 transition-all">
                    <CardContent className="flex items-center gap-5 p-4 md:p-5">
                      {div.logo_url && (
                        <img
                          src={div.logo_url}
                          alt={div.name}
                          className="h-32 w-32 md:h-44 md:w-44 object-contain shrink-0 group-hover:scale-105 transition-transform"
                          loading="lazy"
                        />
                      )}
                      <div>
                        <p className="font-display font-bold uppercase text-lg md:text-xl">{div.name}</p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {categories
                            .filter((c: any) => c.division_id === div.id)
                            .map((cat: any) => (
                              <Badge key={cat.id} variant="secondary" className="text-xs">
                                {cat.name}
                              </Badge>
                            ))}
                        </div>
                        <p className="text-xs text-primary mt-3 font-medium">Ver equipos →</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))
            )}
          </div>
        )}
      </section>

      <section className="grid sm:grid-cols-3 gap-4">
        <Link to="/schedule">
          <Card className="hover:shadow-md transition-shadow cursor-pointer group">
            <CardContent className="flex items-center gap-4 py-6">
              <Calendar className="h-10 w-10 text-primary group-hover:scale-110 transition-transform" />
              <div>
                <p className="font-display font-bold uppercase">{viewedTournament?.home_card_schedule_label || "Programación"}</p>
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
                <p className="font-display font-bold uppercase">{viewedTournament?.home_card_standings_label || "Posiciones"}</p>
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
                <p className="font-display font-bold uppercase">{viewedTournament?.home_card_stats_label || "Estadísticas"}</p>
                <p className="text-sm text-muted-foreground">Líderes del torneo</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </section>
    </div>
  );
}
