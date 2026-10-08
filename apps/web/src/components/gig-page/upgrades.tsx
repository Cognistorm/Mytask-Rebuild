'use client';
// Upgrades of the purchase box (spec 04 AC-26; screen 02): a checkbox per upgrade with its title, "+ price" and its
// effect on the delivery time (legacy `service.blade.php` add-to-cart upgrades). The ticked ones stay in this
// component's state for "Add to cart" (slice 5); no quantity selector (P-46).
import { useState } from 'react';

export interface UpgradeRow {
  id: string;
  title: string;
  price: string;
  delivery: string;
}

export function GigUpgrades(props: { label: string; rows: UpgradeRow[]; lang?: string }) {
  const [ticked, setTicked] = useState<ReadonlySet<string>>(new Set());
  const toggle = (id: string) =>
    setTicked((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  return (
    <fieldset className="mt-gig-upgrades" data-testid="gig-upgrades">
      <legend className="mt-gig-box-title">{props.label}</legend>
      {props.rows.map((row) => (
        <label key={row.id} className="mt-gig-upgrade">
          <input
            type="checkbox"
            name="upgrades"
            value={row.id}
            checked={ticked.has(row.id)}
            onChange={() => toggle(row.id)}
          />
          {/* Read as title, price, delivery effect (screen 02 accessibility); placed by the grid. */}
          <span className="mt-gig-upgrade-title" lang={props.lang}>
            {row.title}
          </span>
          <span className="mt-gig-upgrade-price">+{row.price}</span>
          <span className="mt-gig-upgrade-delivery">{row.delivery}</span>
        </label>
      ))}
    </fieldset>
  );
}
