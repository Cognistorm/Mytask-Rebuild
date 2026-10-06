// Categories menu of the app (spec 03 AC-2 "on mobile the same tree is an accordion in the menu", screens table
// "menu accordion with a search box inside the list"): the 3-level tree and a filter box that keeps matching branches
// open. Every node opens its category screen. Top-level rows (Owner 2026-10-06, as the website bar): the name itself
// opens the category and a separate +/− shows its sub-categories, so they have no "Browse {category}" row; deeper
// open branches keep "Browse {category}".
// 3X look (3X.17b, visual-refresh.md §8.4 phone accordion, §10): the canvas, the search field in the input frame,
// top-level rows with the category dot and a 3 px indicator bar on the start edge while open, sub-rows tinted in
// the category colour while pressed, the +/− as a Secondary icon button.
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { categoryTheme, lightTheme as theme } from '@mytask/tokens/native';
import type { components } from '@mytask/types';
import { openCategoryPath } from '../../components/catalog';
import { Notice } from '../../components/form';
import { mobileApi } from '../../lib/api';
import { createT } from '../../lib/i18n';
import { Canvas, CategoryDot, IconButton, InputFrame, useTheme } from '../../ui';

const locale = 'ka' as const;
const t = createT(locale);
const api = mobileApi(locale);

type Node = components['schemas']['CategoryNode'];

export default function CategoriesMenu() {
  const mode = useTheme().dark ? 'dark' : 'light';
  const [tree, setTree] = useState<Node[] | null | 'error'>(null);
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
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

  /** `color` is the top-level category's colour; sub-categories inherit it (Q-171). */
  const render = (list: Node[], depth: number, color: string | null) =>
    list.map((n) => {
      const parent = n.children.length > 0;
      const expanded = parent && (q !== '' || open.has(n.id));
      const cat = categoryTheme(depth === 1 ? n.color : color, mode);
      const tint = ({ pressed }: { pressed: boolean }) => [
        s.item,
        pressed ? { backgroundColor: cat.tint } : null,
      ];

      if (depth === 1)
        return (
          <View
            key={n.id}
            style={[s.top, { borderLeftColor: expanded ? cat.indicator : 'transparent' }]}
            testID={`category-${n.id}`}
          >
            <View style={s.topRow}>
              <Pressable
                style={(state) => [tint(state), s.topName]}
                onPress={() => openCategoryPath(n.path)}
                accessibilityRole="link"
              >
                <CategoryDot color={n.color} />
                <Text style={[s.topText, expanded ? { color: cat.ink } : null]}>{n.name}</Text>
              </Pressable>
              {parent ? (
                <IconButton
                  onPress={() => toggle(n.id)}
                  accessibilityLabel={`${t('t_subcategories')}: ${n.name}`}
                  accessibilityState={{ expanded }}
                >
                  <Text style={s.caret}>{expanded ? '−' : '+'}</Text>
                </IconButton>
              ) : null}
            </View>
            {expanded ? render(n.children, depth + 1, n.color) : null}
          </View>
        );

      return (
        <View key={n.id} style={{ paddingLeft: theme.space[4] * (depth - 1) }}>
          <Pressable
            style={tint}
            onPress={() => (parent ? toggle(n.id) : openCategoryPath(n.path))}
            accessibilityRole={parent ? 'button' : 'link'}
            accessibilityState={parent ? { expanded } : undefined}
          >
            <Text style={s.name}>{n.name}</Text>
            {parent ? <Text style={s.caret}>{expanded ? '−' : '+'}</Text> : null}
          </Pressable>
          {expanded ? (
            <>
              <Pressable
                style={tint}
                onPress={() => openCategoryPath(n.path)}
                accessibilityRole="link"
              >
                <Text style={[s.browse, { color: cat.ink }]}>
                  {t('t_browse_parent_category', { category: n.name })}
                </Text>
              </Pressable>
              {render(n.children, depth + 1, color)}
            </>
          ) : null}
        </View>
      );
    });

  return (
    <Canvas>
      <SafeAreaView style={s.screen}>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          <Text style={s.title} accessibilityRole="header">
            {t('t_categories')}
          </Text>
          <InputFrame focused={focused} style={s.searchFrame}>
            <TextInput
              style={s.search}
              value={query}
              onChangeText={setQuery}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder={t('t_search_categories')}
              placeholderTextColor={theme.colors.text.muted}
              accessibilityLabel={t('t_search_categories')}
              testID="category-search"
            />
          </InputFrame>
          {tree === 'error' ? (
            <Notice kind="error" text={t('t_toast_something_went_wrong')} />
          ) : null}
          {Array.isArray(tree) && nodes.length === 0 ? (
            <Text style={s.empty}>{t('no_results_found')}</Text>
          ) : null}
          {render(nodes, 1, null)}
        </ScrollView>
      </SafeAreaView>
    </Canvas>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: theme.space[4], gap: theme.space[1] },
  title: { ...theme.text.h2, color: theme.colors.text.primary, marginBottom: theme.space[3] },
  searchFrame: { marginBottom: theme.space[3] },
  search: {
    ...theme.text.body,
    minHeight: theme.size.control.md,
    paddingHorizontal: theme.space[3],
    color: theme.colors.text.primary,
  },
  // 3 px start-edge bar (§8.4), transparent while closed so the rows do not shift.
  top: { borderLeftWidth: 3 * theme.borderWidth.hairline, paddingLeft: theme.space[2] },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: theme.space[2] },
  topName: { flex: 1, justifyContent: 'flex-start', gap: theme.space[2] },
  topText: { ...theme.text.label, color: theme.colors.text.primary, flexShrink: 1 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: theme.size.touchTarget.min,
    paddingHorizontal: theme.space[2],
    borderRadius: theme.radius.control,
  },
  name: { ...theme.text.body, color: theme.colors.text.primary, flexShrink: 1 },
  caret: { ...theme.text.h3, color: theme.colors.text.secondary },
  browse: { ...theme.text.bodySm },
  empty: { ...theme.text.bodySm, color: theme.colors.text.muted },
});
