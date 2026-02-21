import { Card, CardContent } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

export default function Standings() {
  return (
    <div className="container py-8 space-y-6">
      <h1 className="text-3xl font-display font-bold uppercase flex items-center gap-2">
        <BarChart3 className="h-7 w-7 text-primary" />
        Tabla de Posiciones
      </h1>
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>Las posiciones se calcularán automáticamente al cerrar partidos.</p>
        </CardContent>
      </Card>
    </div>
  );
}
