'use client';
// Sort menu (spec 03 AC-13): Recommended (default) and the six legacy sorts, each a link to the same list sorted,
// back on page 1.
import Link from 'next/link';
import type { Locale } from '@mytask/i18n';
import { MenuButton } from '@mytask/ui/web';
import { useT } from '../../lib/client';
import { listSearch, SORTS, type ListQuery } from '../../lib/list-query';

export function SortMenu(props: { locale: Locale; basePath: string; query: ListQuery }) {
  const t = useT(props.locale);
  const current = SORTS.find((s) => s.value === props.query.sort)!;
  return (
    <MenuButton
      label={
        <>
          {t('t_sort_by')}: <strong>{t(current.key)}</strong>
        </>
      }
      align="end"
      testId="sort-menu"
    >
      {(close) =>
        SORTS.map((s) => (
          <Link
            key={s.value}
            href={`${props.basePath}${listSearch(props.query, { sort: s.value, page: 1 })}`}
            aria-current={s.value === props.query.sort ? 'true' : undefined}
            onClick={close}
          >
            {t(s.key)}
          </Link>
        ))
      }
    </MenuButton>
  );
}
