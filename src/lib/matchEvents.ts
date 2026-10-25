/**
 * Orden cronológico de goles y sanciones.
 * Los tiempos se guardan como "tiempo que falta" (cuenta regresiva mm:ss), así que dentro de un
 * mismo período va primero el que tiene MÁS tiempo restante. Los que no tienen tiempo quedan al final
 * de su período, en el orden en que se registraron.
 */
const toSeconds = (t: unknown): number => {
  const m = typeof t === "string" ? t.trim().match(/^(\d{1,3}):(\d{2})$/) : null;
  return m ? Number(m[1]) * 60 + Number(m[2]) : -1;
};

export function sortChronological<T extends Record<string, any>>(list: T[] | null | undefined, timeKey: string): T[] {
  return [...(list ?? [])].sort((a, b) => {
    const pa = Number(a.period ?? 0);
    const pb = Number(b.period ?? 0);
    if (pa !== pb) return pa - pb;
    const ta = toSeconds(a[timeKey]);
    const tb = toSeconds(b[timeKey]);
    if (ta !== tb) return tb - ta; // más tiempo restante = más temprano
    return String(a.created_at ?? "").localeCompare(String(b.created_at ?? ""));
  });
}
