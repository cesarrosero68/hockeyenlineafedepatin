import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const REALTIME_TABLES = ["matches", "match_teams", "goal_events", "penalties", "standings_aggregate", "fair_play_aggregate"] as const;

export function useRealtimeUpdates() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("tournament_update")
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => {
        queryClient.invalidateQueries();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "match_teams" }, () => {
        queryClient.invalidateQueries();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "goal_events" }, () => {
        queryClient.invalidateQueries();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "penalties" }, () => {
        queryClient.invalidateQueries();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "standings_aggregate" }, () => {
        queryClient.invalidateQueries();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "fair_play_aggregate" }, () => {
        queryClient.invalidateQueries();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
