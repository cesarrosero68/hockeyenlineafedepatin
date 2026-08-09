import { useEffect, useState } from "react";

export interface MatchClockFields {
  clock_enabled?: boolean | null;
  clock_started_at?: string | null;
  clock_offset_ms?: number | null;
  current_period?: number | null;
}

export const PERIOD_LABELS: Record<number, string> = {
  1: "1er Período",
  2: "2do Período",
  3: "Tiempo Extra",
};

export const PERIOD_SHORT: Record<number, string> = {
  1: "P1",
  2: "P2",
  3: "OT",
};

export function periodLabel(period?: number | null): string {
  const p = period ?? 1;
  return PERIOD_LABELS[p] ?? `Período ${p}`;
}

export function periodShort(period?: number | null): string {
  const p = period ?? 1;
  return PERIOD_SHORT[p] ?? `P${p}`;
}

/** Total elapsed milliseconds of the match clock at `now`. */
export function elapsedMs(match: MatchClockFields, now: number = Date.now()): number {
  const offset = match.clock_offset_ms ?? 0;
  if (!match.clock_started_at) return offset;
  return offset + Math.max(0, now - new Date(match.clock_started_at).getTime());
}

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function isClockRunning(match: MatchClockFields | null | undefined): boolean {
  return !!match && match.clock_enabled !== false && !!match.clock_started_at;
}

/** True when the clock feature is on and it has been started at least once. */
export function hasClockData(match: MatchClockFields | null | undefined): boolean {
  return !!match && match.clock_enabled !== false && (!!match.clock_started_at || (match.clock_offset_ms ?? 0) > 0);
}

/** Ticking mm:ss for a match clock. Returns null when there is nothing live to show. */
export function useMatchClock(match: MatchClockFields | null | undefined): string | null {
  const running = isClockRunning(match);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  if (!match || !hasClockData(match)) return null;
  return formatClock(elapsedMs(match));
}
