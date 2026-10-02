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
