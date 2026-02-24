import { format as fnsFormat, parseISO } from "date-fns";
import { es } from "date-fns/locale";

const BOGOTA_OFFSET = -5; // UTC-5

/**
 * Convert a UTC date string to a Date object adjusted for Bogota timezone display.
 * This shifts the UTC time by -5 hours so format() shows Bogota local time.
 */
export function toBogotaDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const utc = new Date(dateStr);
  // Shift to Bogota: subtract the difference between local offset and Bogota offset
  const bogota = new Date(utc.getTime() + (BOGOTA_OFFSET * 60 + utc.getTimezoneOffset()) * 60000);
  return bogota;
}

/**
 * Format a UTC date string to Bogota time with the given format pattern.
 */
export function formatBogota(dateStr: string | null | undefined, pattern: string): string {
  const d = toBogotaDate(dateStr);
  if (!d) return "";
  return fnsFormat(d, pattern, { locale: es });
}

/**
 * Convert a local datetime-local input value to a UTC ISO string for storage.
 * The input is assumed to be in Bogota time (UTC-5).
 */
export function bogotaInputToUTC(localValue: string): string {
  if (!localValue) return "";
  // localValue is like "2026-03-01T10:00" in Bogota time
  // Bogota is UTC-5, so add 5 hours to get UTC
  const d = new Date(localValue);
  d.setHours(d.getHours() + 5 - (d.getTimezoneOffset() / -60));
  // Simpler: treat the input as Bogota time directly
  // Parse as-is and add 5 hours offset
  const bogotaMs = new Date(localValue + ":00").getTime();
  const utcMs = bogotaMs + 5 * 3600000;
  return new Date(utcMs).toISOString();
}

/**
 * Convert a UTC ISO date string to a datetime-local input value in Bogota time.
 */
export function utcToBogotaInput(utcStr: string | null): string {
  if (!utcStr) return "";
  const d = toBogotaDate(utcStr);
  if (!d) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
