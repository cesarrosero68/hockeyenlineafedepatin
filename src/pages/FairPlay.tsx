import { Card, CardContent } from "@/components/ui/card";
import { Shield } from "lucide-react";

export default function FairPlay() {
  return (
    <div className="container py-8 space-y-6">
      <h1 className="text-3xl font-display font-bold uppercase flex items-center gap-2">
        <Shield className="h-7 w-7 text-accent" />
        Fair Play
      </h1>
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Shield className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>El ranking Fair Play se calcula por menos minutos de penalización.</p>
        </CardContent>
      </Card>
    </div>
  );
}
