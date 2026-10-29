import Seo from "@/components/Seo";
import PageHero from "@/components/PageHero";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTournament } from "@/contexts/TournamentContext";

export default function Editions() {
  const { tournaments, activeTournamentId, viewedTournamentId, setEdition, clearEdition } = useTournament();
  const navigate = useNavigate();

  const handleView = (id: string) => {
    if (id === activeTournamentId) clearEdition();
    else setEdition(id);
    navigate("/");
  };

  return (
    <div className="pb-10">
      <Seo
        title="Ediciones del torneo | Fedepatin"
        description="Consulta las ediciones actuales y anteriores del torneo de hockey en línea de Fedepatin."
        path="/editions"
      />
      <PageHero icon={CalendarDays} title="Ediciones del Torneo" subtitle="Consulta las ediciones actuales y anteriores" />
      <div className="container py-6 space-y-6">
      <p className="text-muted-foreground text-sm">
        Elige la edición que deseas visualizar. Todas las páginas públicas se actualizarán.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tournaments.map((t) => {
          const isActive = t.status === "active";
          const isViewed = t.id === viewedTournamentId;
          return (
            <Card key={t.id} className={isViewed ? "border-primary" : ""}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between gap-2">
                  <span>{t.name}</span>
                  <Badge variant={isActive ? "default" : "secondary"}>
                    {isActive ? "Activo" : "Finalizado"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-xs text-muted-foreground space-y-1">
                  {t.year && <div>Año: {t.year}</div>}
                  {t.semester && <div>Semestre: {t.semester}</div>}
                </div>
                <Button
                  size="sm"
                  variant={isViewed ? "secondary" : "default"}
                  onClick={() => handleView(t.id)}
                  className="w-full"
                >
                  <Eye className="h-3.5 w-3.5 mr-1" />
                  {isActive ? "Ver Edición Activa" : "Ver Edición"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
      </div>
    </div>
  );
}
