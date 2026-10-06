// Dates on the web, in the platform time zone (Asia/Tbilisi, ADR-006 §9). Money goes through `Price` /
// `formatMoney` from @mytask/ui/web.

/**
 * `10.05.2023`: the legacy numeric date (`config/carbon-formats.php` `d_m_y` = `d.m.Y`), the same in ka and
 * en, so it never depends on the browser having Georgian month names.
 */
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

/** A calendar date from the API (`2026-10-15`, already a platform-zone date) as `15.10.2026`. */
export function formatDateOnly(date: string): string {
  const [year, month, day] = date.split('-');
  return `${day}.${month}.${year}`;
}

/** Today's calendar date in the platform time zone, `YYYY-MM-DD`. */
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

/** File size as legacy `format_bytes`: "512 B", "1.4 KB", "2.3 MB" (base 1024, one decimal). */
export function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${unit === 0 ? value : value.toFixed(1)} ${units[unit]}`;
}
