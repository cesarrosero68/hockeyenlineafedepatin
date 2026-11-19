// Lógica pura del shootout (sin base de datos), fácil de probar.
// Regla: 3 cobros por equipo; si siguen empatados, se cobra de a uno hasta que alguien gane.

export type Kick = {
  id?: string;
  team_id: string;
  kick_number: number;
  player_id: string | null;
  scored: boolean;
};

export type ShootoutState = {
  homeGoals: number;
  awayGoals: number;
  homeKicks: number;
  awayKicks: number;
  decided: boolean;
  winner: "home" | "away" | null;
};

const BASE_KICKS = 3;

export function shootoutState(kicks: Kick[], homeTeamId: string, awayTeamId: string): ShootoutState {
  const h = kicks.filter((k) => k.team_id === homeTeamId);
  const a = kicks.filter((k) => k.team_id === awayTeamId);
  const hg = h.filter((k) => k.scored).length;
  const ag = a.filter((k) => k.scored).length;
  const hk = h.length;
  const ak = a.length;

  let winner: "home" | "away" | null = null;

  // Antes de completar los 3 cobros: se decide si el rival ya no puede alcanzar.
  if (hk < BASE_KICKS || ak < BASE_KICKS) {
    if (hg > ag + (BASE_KICKS - ak)) winner = "home";
    else if (ag > hg + (BASE_KICKS - hk)) winner = "away";
  }
  // Con 3 o más cobros cada uno: gana quien vaya arriba cuando ambos han cobrado lo mismo.
  if (!winner && hk >= BASE_KICKS && ak >= BASE_KICKS && hk === ak && hg !== ag) {
    winner = hg > ag ? "home" : "away";
  }

  return { homeGoals: hg, awayGoals: ag, homeKicks: hk, awayKicks: ak, decided: winner !== null, winner };
}

/** Cobro que dio la victoria: el último cobro anotado por el equipo ganador. */
export function winningKick(kicks: Kick[], winnerTeamId: string): Kick | null {
  const scored = kicks
    .filter((k) => k.team_id === winnerTeamId && k.scored)
    .sort((x, y) => y.kick_number - x.kick_number);
  return scored[0] ?? null;
}
