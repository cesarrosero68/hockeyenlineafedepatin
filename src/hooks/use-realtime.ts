import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

const TABLE_QUERY_KEYS: Record<string, string[]> = {
  matches: ["schedule-matches", "match-detail", "admin-matches", "admin-counts"],
  match_teams: ["schedule-matches", "match-detail", "standings", "fair-play", "admin-matches", "admin-counts", "live-match-detail"],
  goal_events: ["match-detail", "match-goals", "player-stats", "live-match-detail"],
  penalties: ["match-detail", "match-penalties", "fair-play"],
  standings_aggregate: ["standings"],
  fair_play_aggregate: ["fair-play"],
};

export function useRealtimeUpdates() {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    const destroyChannel = () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const createChannel = () => {
      destroyChannel();

      const channel = supabase
        .channel("tournament_update")
        .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => queueInvalidation("matches"))
        .on("postgres_changes", { event: "*", schema: "public", table: "match_teams" }, () => queueInvalidation("match_teams"))
        .on("postgres_changes", { event: "*", schema: "public", table: "goal_events" }, () => queueInvalidation("goal_events"))
        .on("postgres_changes", { event: "*", schema: "public", table: "penalties" }, () => queueInvalidation("penalties"))
        .on("postgres_changes", { event: "*", schema: "public", table: "standings_aggregate" }, () => queueInvalidation("standings_aggregate"))
        .on("postgres_changes", { event: "*", schema: "public", table: "fair_play_aggregate" }, () => queueInvalidation("fair_play_aggregate"))
        .subscribe((status) => {
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            // Auto-reconnect after error with backoff
            if (!reconnectTimerRef.current) {
              reconnectTimerRef.current = setTimeout(() => {
                reconnectTimerRef.current = null;
                createChannel();
              }, 2000);
            }
          }
        });

      channelRef.current = channel;
    };

    createChannel();

    // Reconnect realtime channel when tab becomes visible or network comes back online
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        createChannel();
      }
    };

    const handleOnline = () => {
      createChannel();
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("online", handleOnline);

    return () => {
      if (flushTimer) clearTimeout(flushTimer);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("online", handleOnline);
      destroyChannel();
    };
  }, [queryClient]);
}
