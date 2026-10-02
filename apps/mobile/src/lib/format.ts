// Dates and money in the app, the same rules as the web (`apps/web/src/lib/format.ts`, `formatMoney` in
// @mytask/ui/web): platform time zone Asia/Tbilisi (ADR-006 §9), legacy numeric date, integer tetri.

/** `10.05.2023`: the legacy `d.m.Y` date, the same in ka and en (no dependence on Georgian month names). */
export function formatDate(iso: string): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Tbilisi',
  }).formatToParts(new Date(iso));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value;
  return `${part('day')}.${part('month')}.${part('year')}`;
}

/** `₾1,234.50`; negatives (migrated balances) as `−₾12.50` — the minus sign carries the meaning. */
export function formatMoney(money: { amount: number; currency: string }): string {
  const value = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(money.amount) / 100);
  const sign = money.currency === 'GEL' ? '₾' : `${money.currency} `;
  return `${money.amount < 0 ? '−' : ''}${sign}${value}`;
}

/** Counts as on the web tiles (`1,234`). */
export const formatCount = (n: number) => n.toLocaleString('en-US');

/** A calendar date (`2026-10-15`, no time zone) as `15.10.2026`, as the web `formatDateOnly`. */
export function formatDateOnly(date: string): string {
  const [year, month, day] = date.split('-');
  return `${day}.${month}.${year}`;
}

/** The clock in an IANA zone (`14:05`), or undefined for a zone this device does not know. */
export function formatClock(timeZone: string, now = new Date()): string | undefined {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      timeZone,
    }).format(now);
  } catch {
    return undefined;
  }
}

/** Today's calendar date in the platform time zone, `YYYY-MM-DD` (as the web `platformToday`). */
export function platformToday(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Tbilisi',
  }).format(now);
}

/** `YYYY-MM-DD` plus `days` calendar days. */
export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/** A calendar date as the device-local midnight the native date picker works with, and back. */
export function dateOnlyToLocal(date: string): Date {
  const [year, month, day] = date.split('-').map(Number) as [number, number, number];
  return new Date(year, month - 1, day);
}

export function localToDateOnly(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
