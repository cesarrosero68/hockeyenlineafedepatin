import Seo from "@/components/Seo";
import PageHero from "@/components/PageHero";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Medal, Award, Crown } from "lucide-react";
import { useTournament } from "@/contexts/TournamentContext";
import TeamShield from "@/components/home/TeamShield";

type PodiumTeam = { name: string; logo: string | null };
const toTeam = (t: any): PodiumTeam | undefined =>
  t?.name ? { name: t.name, logo: t.logo_url ?? t.clubs?.logo_url ?? null } : undefined;

export default function Podium() {
  const { currentId } = useTournament();

  const { data: divisions = [] } = useQuery({
    queryKey: ["podium-divisions", currentId],
    queryFn: async () => {
      let q: any = supabase.from("divisions").select("id, name");
      if (currentId) q = q.eq("tournament_id", currentId);
      return (await q).data ?? [];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["podium-categories", currentId],
    queryFn: async () => {
      let q: any = supabase.from("categories").select("id, name, division_id").order("sort_order");
      if (currentId) q = q.eq("tournament_id", currentId);
      return (await q).data ?? [];
    },
  });

  const { data: matches = [] } = useQuery({
    queryKey: ["podium-matches", currentId],
    queryFn: async () => {
      let q: any = (supabase.from("matches") as any)
        .select("id, phase, category_id, status, tournament_id, match_teams(team_id, is_winner, score_regular, score_extra, teams(name, logo_url, clubs(logo_url)))")
        .in("phase", ["final", "third_place"])
        .in("status", ["closed", "locked"]);
      if (currentId) q = q.eq("tournament_id", currentId);
      const { data } = await q;
      return data ?? [];
    },
  });

  const { data: standings = [] } = useQuery({
    queryKey: ["podium-standings", currentId],
    queryFn: async () => {
      let q: any = (supabase.from("standings_aggregate" as any) as any)
        .select("category_id, team_id, rank, teams(name, logo_url, clubs(logo_url))")
        .order("rank");
      if (currentId) q = q.eq("tournament_id", currentId);
      const { data } = await q;
      return data ?? [];
    },
  });

  // Equipos del torneo (para mostrar el escudo junto al MVP y la Valla)
  const { data: teamsList = [] } = useQuery({
    queryKey: ["podium-teams", currentId],
    queryFn: async () => {
      let q: any = supabase.from("teams").select("id, name, category_id, logo_url, clubs(logo_url)");
      if (currentId) q = q.eq("tournament_id", currentId);
      return (await q).data ?? [];
    },
  });

  // Manual overrides from admin
  const { data: awards = [] } = useQuery({
    queryKey: ["podium-awards", currentId],
    queryFn: async () => {
      let q: any = supabase.from("category_awards" as any).select("*");
      if (currentId) q = q.eq("tournament_id", currentId);
      const { data } = await q;
      return (data ?? []) as any[];
    },
  });

  // Automatic MVPs from view (goals + assists), filtered by tournament
  const { data: autoMvps = [] } = useQuery({
    queryKey: ["podium-auto-mvps", currentId],
    queryFn: async () => {
      let q: any = (supabase.from("mvp_by_category" as any) as any)
        .select("category_id, tournament_id, player_id, player_name, jersey_number, team_name, goals, assists, total_contributions, rank_in_category")
        .eq("rank_in_category", 1);
      if (currentId) q = q.eq("tournament_id", currentId);
      const { data } = await q;
      return (data ?? []) as any[];
    },
  });

  // Automatic best defense from view, filtered by tournament
  const { data: autoDefense = [] } = useQuery({
    queryKey: ["podium-auto-defense", currentId],
    queryFn: async () => {
      let q: any = (supabase.from("best_defense_by_category" as any) as any)
        .select("category_id, tournament_id, team_id, team_name, goals_against, played, rank_in_category")
        .eq("rank_in_category", 1);
      if (currentId) q = q.eq("tournament_id", currentId);
      const { data } = await q;
      return (data ?? []) as any[];
    },
  });

  // Quién ganó un partido: el marcado como ganador; si nadie, el de mayor marcador. Empate sin marcar = sin ganador.
  const resolveWinner = (m: any): { win?: any; lose?: any } => {
    const mts: any[] = m?.match_teams ?? [];
    if (mts.length !== 2) return {};
    const flagged = mts.find((x: any) => x.is_winner);
    if (flagged) return { win: flagged, lose: mts.find((x: any) => x !== flagged) };
    const sc = (x: any) => [x.score_regular ?? 0, x.score_extra ?? 0];
    const [a, b] = mts;
    const [ar, ae] = sc(a), [br, be] = sc(b);
    if (ar !== br) return ar > br ? { win: a, lose: b } : { win: b, lose: a };
    if (ae !== be) return ae > be ? { win: a, lose: b } : { win: b, lose: a };
    return {};
  };

  // El podio se llena SOLO con la final y el tercer puesto ya jugados (cerrados). Sin respaldo de la tabla.
  const getPodium = (categoryId: string): { first?: PodiumTeam; second?: PodiumTeam; third?: PodiumTeam; finished: boolean } => {
    const finalMatch: any = matches.find((m: any) => m.category_id === categoryId && m.phase === "final");
    const thirdMatch: any = matches.find((m: any) => m.category_id === categoryId && m.phase === "third_place");
    let first: PodiumTeam | undefined, second: PodiumTeam | undefined, third: PodiumTeam | undefined;
    if (finalMatch) {
      const { win, lose } = resolveWinner(finalMatch);
      first = toTeam(win?.teams);
      second = toTeam(lose?.teams);
    }
    if (thirdMatch) {
      third = toTeam(resolveWinner(thirdMatch).win?.teams);
    }
    return { first, second, third, finished: !!first };
  };

  const teamLogoByName = (categoryId: string, name?: string) => {
    if (!name) return null;
    const t: any = (teamsList as any[]).find((x: any) => x.category_id === categoryId && x.name === name);
    return t ? (t.logo_url ?? t.clubs?.logo_url ?? null) : null;
  };
  const teamLogoById = (id?: string) => {
    const t: any = (teamsList as any[]).find((x: any) => x.id === id);
    return t ? (t.logo_url ?? t.clubs?.logo_url ?? null) : null;
  };

  const getMvpInfo = (categoryId: string, finished: boolean) => {
    // Check manual override first
    const manual = (awards as any[]).find((a: any) => a.category_id === categoryId && a.award_type === "mvp");
    if (manual?.notes) {
      return { name: manual.notes, jersey: undefined, team: undefined, extra: undefined, logo: null };
    }
    if (!finished) return null;
    // Auto from view
    const auto = (autoMvps as any[]).find((m: any) => m.category_id === categoryId);
    if (auto) {
      return {
        name: auto.player_name,
        jersey: auto.jersey_number,
        team: auto.team_name,
        extra: `${auto.goals}G + ${auto.assists}A`,
        logo: teamLogoByName(categoryId, auto.team_name),
      };
    }
    return null;
  };

  const getDefenseInfo = (categoryId: string, finished: boolean) => {
    // Check manual override first
    const manual = (awards as any[]).find((a: any) => a.category_id === categoryId && a.award_type === "best_goalkeeper");
    if (manual?.notes) {
      return { name: manual.notes, jersey: undefined, team: undefined, extra: undefined, logo: null };
    }
    if (!finished) return null;
    // Auto from view
    const auto = (autoDefense as any[]).find((d: any) => d.category_id === categoryId);
    if (auto) {
      return {
        name: auto.team_name,
        jersey: undefined,
        team: `${auto.goals_against} goles en contra`,
        extra: undefined,
        logo: teamLogoById(auto.team_id),
      };
    }
    return null;
  };

  const defaultTab = divisions[0]?.id ?? "";

  return (
    <div className="pb-10">
      <Seo
        title="Podio y campeones | Fedepatin"
        description="Campeones, subcampeones y premios individuales por categoría del torneo de hockey en línea."
        path="/podium"
      />
      <PageHero icon={Trophy} title="Podio del Torneo" subtitle="Los mejores de cada categoría" />
      <div className="container py-6 space-y-6">

      {divisions.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Sin datos aún.</CardContent></Card>
      ) : (
        <Tabs defaultValue={defaultTab}>
          <TabsList className="flex-wrap h-auto gap-1">
            {divisions.map((d: any) => (
              <TabsTrigger key={d.id} value={d.id} className="text-xs sm:text-sm">{d.name}</TabsTrigger>
            ))}
          </TabsList>

          {divisions.map((div: any) => {
            const divCats = (categories as any[]).filter((c: any) => c.division_id === div.id);
            return (
              <TabsContent key={div.id} value={div.id} className="space-y-6">
                {divCats.map((cat: any) => {
                  const { first, second, third, finished } = getPodium(cat.id);
                  const mvpInfo = getMvpInfo(cat.id, finished);
                  const defenseInfo = getDefenseInfo(cat.id, finished);
                  return (
                    <Card key={cat.id}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-display uppercase">{cat.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end pt-6">
                          <PodiumSpot rank={2} team={second} />
                          <PodiumSpot rank={1} team={first} />
                          <PodiumSpot rank={3} team={third} />
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2 pt-4 border-t">
                          <AwardLine emoji="🏅" label="MVP" info={mvpInfo} />
                          <AwardLine emoji="🛡️" label="Valla Menos Vencida" info={defenseInfo} />
                        </div>
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
    </div>
  );
}

function PodiumSpot({ rank, team }: { rank: 1 | 2 | 3; team?: PodiumTeam }) {
  const config = {
    1: { color: "#FFD700", height: "h-32 sm:h-40", icon: Crown, iconClass: "h-10 w-10", label: "1°", scale: "scale-110", ring: "ring-2 ring-yellow-400" },
    2: { color: "#C0C0C0", height: "h-24 sm:h-28", icon: Medal, iconClass: "h-8 w-8", label: "2°", scale: "", ring: "" },
    3: { color: "#CD7F32", height: "h-20 sm:h-24", icon: Award, iconClass: "h-7 w-7", label: "3°", scale: "", ring: "" },
  }[rank];
  const Icon = config.icon;
  return (
    <div className={`flex flex-col items-center gap-2 ${config.scale}`}>
      <Icon className={config.iconClass} style={{ color: config.color }} />
      {team ? (
        <TeamShield name={team.name} logo={team.logo} size="lg" className="h-20 w-20 sm:h-24 sm:w-24 text-2xl sm:text-3xl" />
      ) : (
        <span className="h-20 w-20 sm:h-24 sm:w-24 rounded-full border-2 border-dashed border-muted-foreground/30 grid place-items-center text-2xl text-muted-foreground/40">?</span>
      )}
      <div className="text-sm sm:text-base font-semibold text-center min-h-[2.5rem] flex items-center">
        {team?.name ?? <span className="text-muted-foreground italic">Por definir</span>}
      </div>
      <div
        className={`w-full ${config.height} rounded-t-lg flex items-start justify-center pt-2 font-display font-bold text-2xl ${config.ring}`}
        style={{ background: `linear-gradient(180deg, ${config.color}, ${config.color}99)`, color: rank === 1 ? "#5b3a00" : "#1a1a1a" }}
      >
        {config.label}
      </div>
    </div>
  );
}

function AwardLine({ emoji, label, info }: {
  emoji: string;
  label: string;
  info: { name: string; jersey?: number; team?: string; extra?: string; logo?: string | null } | null;
}) {
  return (
    <div className="flex items-center gap-3">
      {info ? (
        <TeamShield
          name={info.team && !info.team.includes("goles") ? info.team : info.name}
          logo={info.logo}
          className="h-14 w-14 text-lg shrink-0"
        />
      ) : (
        <span className="text-3xl leading-none">{emoji}</span>
      )}
      <div className="min-w-0">
        <div className="text-xs font-display uppercase tracking-wide text-muted-foreground">{emoji} {label}</div>
        {info ? (
          <>
            <div className="text-base sm:text-lg font-semibold leading-tight">
              {info.name}
              {info.jersey != null && <span className="text-muted-foreground font-normal"> #{info.jersey}</span>}
            </div>
            <div className="text-sm text-muted-foreground">
              {[info.team, info.extra && `(${info.extra})`].filter(Boolean).join(" ")}
            </div>
          </>
        ) : (
          <div className="text-base text-muted-foreground italic">Por definir</div>
        )}
      </div>
    </div>
  );
}
