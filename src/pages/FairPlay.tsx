import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield } from "lucide-react";

export default function FairPlay() {
  const { data: divisions = [] } = useQuery({
    queryKey: ["divisions"],
    queryFn: async () => {
      const { data } = await supabase.from("divisions").select("id, name");
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id, name, division_id").order("sort_order");
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });

  const { data: fairPlay = [], isLoading } = useQuery({
    queryKey: ["fair-play"],
    queryFn: async () => {
      const { data } = await supabase
        .from("fair_play_aggregate")
        .select("*, teams!inner(name)")
        .order("total_penalty_minutes", { ascending: true });
      return data ?? [];
    },
  });

  if (isLoading) {
    return (
      <div className="container py-8 flex justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const defaultTab = divisions[0]?.id ?? "";

  return (
    <div className="container py-8 space-y-6">
      <h1 className="text-3xl font-display font-bold uppercase flex items-center gap-2">
        <Shield className="h-7 w-7 text-accent" />
        Fair Play
      </h1>

      {fairPlay.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>El ranking Fair Play se calcula por menos minutos de penalización.</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue={defaultTab}>
          <TabsList className="flex-wrap h-auto gap-1">
            {divisions.map((d: any) => (
              <TabsTrigger key={d.id} value={d.id} className="text-xs sm:text-sm">{d.name}</TabsTrigger>
            ))}
          </TabsList>

          {divisions.map((div: any) => {
            const divCategories = categories.filter((c: any) => c.division_id === div.id);
            return (
              <TabsContent key={div.id} value={div.id} className="space-y-6">
                {divCategories.map((cat: any) => {
                  const catFP = fairPlay.filter((f: any) => f.category_id === cat.id);
                  if (catFP.length === 0) return null;
                  return (
                    <Card key={cat.id}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-display uppercase">{cat.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b text-muted-foreground text-xs">
                              <th className="text-left py-2 px-1">#</th>
                              <th className="text-left py-2 px-1">Equipo</th>
                              <th className="text-center py-2 px-1">Penalidades</th>
                              <th className="text-center py-2 px-1">Min. Penalización</th>
                            </tr>
                          </thead>
                          <tbody>
                            {catFP.map((f: any, i: number) => (
                              <tr key={f.id} className="border-b last:border-0">
                                <td className="py-2 px-1 text-muted-foreground">{i + 1}</td>
                                <td className="py-2 px-1 font-medium">{f.teams?.name}</td>
                                <td className="text-center py-2 px-1">{f.total_penalties}</td>
                                <td className="text-center py-2 px-1">{f.total_penalty_minutes}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </CardContent>
                    </Card>
                  );
                })}
              </TabsContent>
            );
          })}
        </Tabs>
      )}
    </div>
  );
}
