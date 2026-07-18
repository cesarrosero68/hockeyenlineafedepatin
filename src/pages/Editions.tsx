import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, Check } from "lucide-react";
import { useTournament } from "@/contexts/TournamentContext";

export default function Editions() {
  const { tournaments, currentId, setCurrentId } = useTournament();

  return (
    <div className="container py-8 space-y-6">
      <h1 className="text-3xl font-display font-bold uppercase flex items-center gap-2">
        <CalendarDays className="h-7 w-7 text-primary" />
        Ediciones del Torneo
      </h1>
      <p className="text-muted-foreground text-sm">Elige la edición que deseas visualizar. Todas las páginas públicas se actualizarán.</p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tournaments.map((t) => {
          const isCurrent = t.id === currentId;
          return (
            <Card key={t.id} className={isCurrent ? "border-primary" : ""}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  {t.name}
                  {isCurrent && <Check className="h-4 w-4 text-primary" />}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-xs text-muted-foreground space-y-1">
                  {t.year && <div>Año: {t.year}</div>}
                  {t.semester && <div>Semestre: {t.semester}</div>}
                  <div>Estado: <span className="capitalize">{t.status}</span></div>
                </div>
                <Button
                  size="sm"
                  variant={isCurrent ? "secondary" : "default"}
                  onClick={() => setCurrentId(t.id)}
                  disabled={isCurrent}
                  className="w-full"
                >
                  {isCurrent ? "Edición actual" : "Ver esta edición"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
