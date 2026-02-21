import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";

export default function Stats() {
  return (
    <div className="container py-8 space-y-6">
      <h1 className="text-3xl font-display font-bold uppercase flex items-center gap-2">
        <Star className="h-7 w-7 text-secondary" />
        Estadísticas
      </h1>
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Star className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>Las estadísticas se calculan desde eventos de gol registrados.</p>
        </CardContent>
      </Card>
    </div>
  );
}
