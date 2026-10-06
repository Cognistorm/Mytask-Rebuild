// Money display, shared by client and server components (no 'use client': server pages call it directly).
/** Integer tetri → `₾1,234.50`, negatives `−₾12.50` (§7.9: same in ka and en, legacy parity). */
export function formatMoney(money: { amount: number; currency: string }): string {
  const value = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(money.amount) / 100);
  const sign = money.currency === 'GEL' ? '₾' : `${money.currency} `;
  return `${money.amount < 0 ? '−' : ''}${sign}${value}`;
}
