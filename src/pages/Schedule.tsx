import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "lucide-react";

export default function Schedule() {
  return (
    <div className="container py-8 space-y-6">
      <h1 className="text-3xl font-display font-bold uppercase flex items-center gap-2">
        <Calendar className="h-7 w-7 text-primary" />
        Programación y Resultados
      </h1>
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Calendar className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>La programación se mostrará aquí una vez se carguen los partidos.</p>
        </CardContent>
      </Card>
    </div>
  );
}
