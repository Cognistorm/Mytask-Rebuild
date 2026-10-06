// Categories menu of the app (spec 03 AC-2 "on mobile the same tree is an accordion in the menu", screens table
// "menu accordion with a search box inside the list"): the 3-level tree, a filter box that keeps matching branches
// open, "Browse {category}" on each open branch. Every node opens its category screen.
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '@mytask/tokens/native';
import type { components } from '@mytask/types';
import { openCategoryPath } from '../../components/catalog';
import { Notice } from '../../components/form';
import { mobileApi } from '../../lib/api';
import { createT } from '../../lib/i18n';

const locale = 'ka' as const;
const t = createT(locale);
const api = mobileApi(locale);

type Node = components['schemas']['CategoryNode'];

export default function CategoriesMenu() {
  const [tree, setTree] = useState<Node[] | null | 'error'>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<Set<string>>(new Set());

  useEffect(() => {
    void api
      .GET('/categories')
      .then((res) => setTree(res.data?.categories ?? 'error'))
      .catch(() => setTree('error'));
  }, []);

  const q = query.trim().toLocaleLowerCase();
  const nodes = useMemo(() => {
    const filter = (list: Node[]): Node[] =>
      list.flatMap((n) => {
        if (!q || n.name.toLocaleLowerCase().includes(q)) return [n];
        const children = filter(n.children);
        return children.length ? [{ ...n, children }] : [];
      });
    return Array.isArray(tree) ? filter(tree) : [];
  }, [tree, q]);

  const toggle = (id: string) => {
    const next = new Set(open);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setOpen(next);
  };

  const render = (list: Node[], depth: number) =>
    list.map((n) => {
      const parent = n.children.length > 0;
      const expanded = parent && (q !== '' || open.has(n.id));
      return (
        <View key={n.id} style={{ paddingLeft: theme.space[4] * (depth - 1) }}>
          <Pressable
            style={s.item}
            onPress={() => (parent ? toggle(n.id) : openCategoryPath(n.path))}
            accessibilityRole={parent ? 'button' : 'link'}
            accessibilityState={parent ? { expanded } : undefined}
          >
            <Text style={depth === 1 ? s.top : s.name}>{n.name}</Text>
            {parent ? <Text style={s.caret}>{expanded ? '−' : '+'}</Text> : null}
          </Pressable>
          {expanded ? (
            <>
              <Pressable
                style={s.item}
                onPress={() => openCategoryPath(n.path)}
                accessibilityRole="link"
              >
                <Text style={s.browse}>{t('t_browse_parent_category', { category: n.name })}</Text>
              </Pressable>
              {render(n.children, depth + 1)}
            </>
          ) : null}
        </View>
      );
    });

  return (
    <SafeAreaView style={s.screen}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Text style={s.title} accessibilityRole="header">
          {t('t_categories')}
        </Text>
        <TextInput
          style={s.search}
          value={query}
          onChangeText={setQuery}
          placeholder={t('t_search_categories')}
          placeholderTextColor={theme.colors.text.muted}
          accessibilityLabel={t('t_search_categories')}
          testID="category-search"
        />
        {tree === 'error' ? <Notice kind="error" text={t('t_toast_something_went_wrong')} /> : null}
        {Array.isArray(tree) && nodes.length === 0 ? (
          <Text style={s.empty}>{t('no_results_found')}</Text>
        ) : null}
        {render(nodes, 1)}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg.canvas },
  content: { padding: theme.space[4], gap: theme.space[1] },
  title: { ...theme.text.h2, color: theme.colors.text.primary, marginBottom: theme.space[3] },
  search: {
    ...theme.text.body,
    minHeight: theme.size.control.md,
    paddingHorizontal: theme.space[3],
    marginBottom: theme.space[3],
    borderWidth: theme.borderWidth.hairline,
    borderColor: theme.colors.border.default,
    borderRadius: theme.radius.control,
    backgroundColor: theme.colors.bg.surface,
    color: theme.colors.text.primary,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: theme.size.touchTarget.min,
  },
  top: { ...theme.text.label, color: theme.colors.text.primary },
  name: { ...theme.text.body, color: theme.colors.text.primary },
  caret: { ...theme.text.h3, color: theme.colors.text.secondary },
  browse: { ...theme.text.bodySm, color: theme.colors.text.link },
  empty: { ...theme.text.bodySm, color: theme.colors.text.muted },
});
