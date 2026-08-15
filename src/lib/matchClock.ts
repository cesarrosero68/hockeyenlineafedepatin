import { useEffect, useState } from "react";

export interface MatchClockFields {
  clock_enabled?: boolean | null;
  clock_started_at?: string | null;
  clock_offset_ms?: number | null;
  current_period?: number | null;
  period_minutes?: number | null;
}

export const DEFAULT_PERIOD_MINUTES = 15;

/** Duraciones sugeridas para el selector del panel de admin. */
export const PERIOD_PRESETS = [10, 12, 15, 18, 20];

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

/** Duración total del período en milisegundos. */
export function periodMs(match: MatchClockFields | null | undefined): number {
  const minutes = match?.period_minutes ?? DEFAULT_PERIOD_MINUTES;
  return Math.max(1, minutes) * 60_000;
}

/** Total elapsed milliseconds of the match clock at `now`. */
export function elapsedMs(match: MatchClockFields, now: number = Date.now()): number {
  const offset = match.clock_offset_ms ?? 0;
  if (!match.clock_started_at) return offset;
  return offset + Math.max(0, now - new Date(match.clock_started_at).getTime());
}

/** Milisegundos restantes del período (nunca negativo). */
export function remainingMs(match: MatchClockFields, now: number = Date.now()): number {
  return Math.max(0, periodMs(match) - elapsedMs(match, now));
}

/** True cuando el período ya llegó a 00:00. */
export function isPeriodOver(match: MatchClockFields | null | undefined, now: number = Date.now()): boolean {
  if (!match) return false;
  return elapsedMs(match, now) >= periodMs(match);
}

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
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

/** Cuenta regresiva mm:ss del período. Devuelve null cuando no hay nada en vivo que mostrar. */
export function useMatchClock(match: MatchClockFields | null | undefined): string | null {
  const running = isClockRunning(match);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  if (!match || !hasClockData(match)) return null;
  return formatClock(remainingMs(match));
}

/** Parsea "mm:ss" a milisegundos. Devuelve null si el formato no es válido. */
export function parseMmSsToMs(value: string | null | undefined): number | null {
  if (!value) return null;
  const m = /^(\d{1,3}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const minutes = parseInt(m[1], 10);
  const seconds = parseInt(m[2], 10);
  if (seconds > 59) return null;
  return (minutes * 60 + seconds) * 1000;
}

export interface PenaltyClockFields {
  /** "mm:ss" restante del período en el momento en que se registró la sanción (columna penalty_time). */
  penalty_time: string | null;
  /** Duración de la sanción en minutos, p.ej. 1.5 para 1:30 (columna penalty_minutes). */
  penalty_minutes: number;
  /** Período del partido en que se registró la sanción (columna period). */
  period: number;
}

/**
 * Milisegundos restantes de una sanción, atada al reloj del partido (no a un
 * reloj propio): se pausa y reanuda junto con el reloj principal.
 *
 * Si la sanción se registró en el período que está corriendo ahora mismo, se
 * ancla directamente contra elapsedMs() de ese período. Si ya se cambió de
 * período (con "Siguiente período" en Admin, que reinicia elapsedMs a 0),
 * el tiempo que le quedaba a la sanción se congela en el instante exacto en
 * que terminó su período de origen, y desde ahí se sigue descontando con el
 * elapsedMs() del período nuevo — así la sanción "cruza" el cambio de
 * período con el tiempo correcto, en vez de recalcularse contra un reloj
 * que ya no tiene relación con el momento en que se puso.
 *
 * Devuelve null si no se puede calcular (falta penalty_time o el partido).
 */
export function penaltyRemainingMs(
  match: MatchClockFields,
  penalty: PenaltyClockFields,
  now: number = Date.now(),
): number | null {
  const remainingAtPenaltyMs = parseMmSsToMs(penalty.penalty_time);
  if (remainingAtPenaltyMs == null) return null;
  const totalPenaltyMs = Math.max(0, penalty.penalty_minutes) * 60_000;
  const currentPeriod = match.current_period ?? 1;

  if (penalty.period === currentPeriod) {
    // Mismo período: ancla directa contra el reloj actual.
    const elapsedAtPenalty = periodMs(match) - remainingAtPenaltyMs;
    const elapsedSincePenalty = elapsedMs(match, now) - elapsedAtPenalty;
    return Math.max(0, totalPenaltyMs - elapsedSincePenalty);
  }

  if (penalty.period > currentPeriod) {
    // La sanción es de un período que todavía no llegó (no debería pasar,
    // pero por seguridad no se muestra).
    return null;
  }

  // Ya se cambió de período desde que se puso la sanción. El período viejo
  // terminó cuando su reloj llegó a 0 — y la sanción corrió en paralelo esa
  // misma distancia de tiempo (remainingAtPenaltyMs) antes de que el período
  // se acabara, topada por su propia duración si terminaba antes. Desde ahí
  // se sigue descontando con el reloj del período actual.
  const ranBeforePeriodEnded = Math.min(remainingAtPenaltyMs, totalPenaltyMs);
  const remainingWhenPeriodEnded = Math.max(0, totalPenaltyMs - ranBeforePeriodEnded);
  const elapsedInNewPeriod = elapsedMs(match, now);
  return Math.max(0, remainingWhenPeriodEnded - elapsedInNewPeriod);
}

/**
 * Cuenta regresiva mm:ss de una sanción activa, ligada al reloj del partido.
 * Re-renderiza cada segundo solo mientras el reloj del partido está corriendo
 * (mismo patrón liviano que useMatchClock) — se congela junto con el reloj
 * si se pausa o si el partido está en el descanso entre períodos, y no
 * agrega ninguna consulta de red. Devuelve null cuando la sanción ya se
 * cumplió (debe dejar de mostrarse) o no se puede calcular.
 */
export function usePenaltyClock(
  match: MatchClockFields | null | undefined,
  penalty: PenaltyClockFields | null | undefined,
): string | null {
  const running = isClockRunning(match);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  if (!match || !penalty) return null;
  const remaining = penaltyRemainingMs(match, penalty);
  if (remaining == null || remaining <= 0) return null;
  return formatClock(remaining);
}
