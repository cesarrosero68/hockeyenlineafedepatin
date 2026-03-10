import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const TABLE_QUERY_KEYS: Record<string, string[]> = {
  matches: ["schedule-matches", "match-detail", "admin-matches", "admin-counts"],
  match_teams: ["schedule-matches", "match-detail", "standings", "fair-play", "admin-matches", "admin-counts", "live-match-detail"],
  goal_events: ["match-detail", "match-goals", "player-stats"],
  penalties: ["match-detail", "match-penalties", "fair-play"],
  standings_aggregate: ["standings"],
  fair_play_aggregate: ["fair-play"],
};

export function useRealtimeUpdates() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const pending = new Set<string>();
    let flushTimer: ReturnType<typeof setTimeout> | null = null;

    const queueInvalidation = (table: string) => {
      const keys = TABLE_QUERY_KEYS[table] ?? [];
      keys.forEach((key) => pending.add(key));

      if (flushTimer) return;
      flushTimer = setTimeout(() => {
        const keysToInvalidate = Array.from(pending);
        pending.clear();
        flushTimer = null;
        keysToInvalidate.forEach((queryKey) => {
          queryClient.invalidateQueries({ queryKey: [queryKey] });
        });
      }, 250);
    };

    const channel = supabase
      .channel("tournament_update")
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => {
        queueInvalidation("matches");
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "match_teams" }, () => {
        queueInvalidation("match_teams");
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "goal_events" }, () => {
        queueInvalidation("goal_events");
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "penalties" }, () => {
        queueInvalidation("penalties");
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "standings_aggregate" }, () => {
        queueInvalidation("standings_aggregate");
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "fair_play_aggregate" }, () => {
        queueInvalidation("fair_play_aggregate");
      })
      .subscribe();

    return () => {
      if (flushTimer) clearTimeout(flushTimer);
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
