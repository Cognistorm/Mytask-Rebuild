// Skills (spec 02 AC-19) and languages (AC-20) blocks, as the web `profile-edit/entries.tsx`: one form that adds,
// or updates the entry being edited, and the list with Edit / Delete per entry, newest first (legacy
// `ProfileComponent.php:439-996`). Duplicates come back from the API as 409 with the legacy text.
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { ApiClient } from '@mytask/api-client';
import { lightTheme as theme } from '@mytask/tokens/native';
import type { components } from '@mytask/types';
import { LANGUAGE_LEVEL, SKILL_LEVEL } from '../../lib/profile';
import { Button, Input } from '../form';
import { OutlineButton } from '../profile';
import type { ApiError } from '../reauth';
import {
  Block,
  BlockMessage,
  ButtonCell,
  ButtonRow,
  EditLink,
  RadioGroup,
  useBlockState,
} from './block';

type Skill = components['schemas']['UserSkill'];
type Language = components['schemas']['UserLanguage'];
type T = (key: string, options?: Record<string, unknown>) => string;

interface Entry<L extends string> {
  id: string;
  name: string;
  level: L;
}

type Saved<L extends string> =
  { entry: Entry<L>; error?: never } | { entry?: never; error: ApiError };

interface Texts {
  title: string;
  hint: string;
  name: string;
  namePlaceholder?: string;
  level: string;
  add: string;
  update: string;
  edit: string;
  remove: string;
  empty: string;
  added: string;
  updated: string;
  removed: string;
}

function EntryEditor<L extends string>(props: {
  t: T;
  testID: string;
  texts: Texts;
  levels: Record<L, string>;
  /** API field name of the level (`experience` for skills, `level` for languages). */
  levelField: string;
  nameMax: number;
  initial: Entry<L>[];
  save: (id: string | undefined, name: string, level: L | undefined) => Promise<Saved<L>>;
  remove: (id: string) => Promise<ApiError | undefined>;
}) {
  const { t, texts } = props;
  const state = useBlockState();
  const [entries, setEntries] = useState(props.initial);
  const [editing, setEditing] = useState<string>();
  const [name, setName] = useState('');
  const [level, setLevel] = useState<L>();

  const clear = () => {
    setEditing(undefined);
    setName('');
    setLevel(undefined);
  };

  async function submit() {
    state.start();
    const res = await props.save(editing, name.trim(), level);
    if (res.error) return state.done({ err: res.error });
    const saved = res.entry;
    setEntries((list) =>
      editing ? list.map((x) => (x.id === saved.id ? saved : x)) : [saved, ...list],
    );
    state.done({ ok: editing ? texts.updated : texts.added });
    clear();
  }

  async function del(entry: Entry<L>) {
    state.start();
    const error = await props.remove(entry.id);
    if (error) return state.done({ err: error });
    setEntries((list) => list.filter((x) => x.id !== entry.id));
    if (editing === entry.id) clear();
    state.done({ ok: texts.removed });
  }

  function edit(entry: Entry<L>) {
    state.reset();
    setEditing(entry.id);
    setName(entry.name);
    setLevel(entry.level);
  }

  const options = (Object.keys(props.levels) as L[]).map((value) => ({
    value,
    label: t(props.levels[value]),
  }));

  return (
    <Block title={texts.title} hint={texts.hint} testID={props.testID}>
      <BlockMessage ok={state.ok} general={state.general} />
      <Input
        label={texts.name}
        value={name}
        onChangeText={setName}
        maxLength={props.nameMax}
        placeholder={texts.namePlaceholder}
        error={state.fields.name}
      />
      <RadioGroup
        label={texts.level}
        options={options}
        value={level}
        onChange={setLevel}
        error={state.fields[props.levelField]}
      />
      <ButtonRow>
        {editing ? (
          <ButtonCell>
            <OutlineButton label={t('t_cancel')} onPress={clear} />
          </ButtonCell>
        ) : null}
        <ButtonCell>
          <Button
            label={editing ? texts.update : texts.add}
            onPress={() => void submit()}
            busy={state.busy}
          />
        </ButtonCell>
      </ButtonRow>
      {entries.length === 0 ? (
        <Text style={s.muted}>{texts.empty}</Text>
      ) : (
        <View style={s.list}>
          {entries.map((entry) => (
            <View
              key={entry.id}
              style={[s.entry, editing === entry.id ? s.entryEditing : null]}
              testID={`${props.testID}-entry`}
            >
              <View style={s.entryText}>
                <Text style={s.entryName}>{entry.name}</Text>
                <Text style={s.muted}>{t(props.levels[entry.level])}</Text>
              </View>
              <View style={s.entryActions}>
                <EditLink
                  label={t('t_edit')}
                  accessibilityLabel={`${texts.edit}: ${entry.name}`}
                  onPress={() => edit(entry)}
                />
                <EditLink
                  label={t('t_delete')}
                  accessibilityLabel={`${texts.remove}: ${entry.name}`}
                  onPress={() => void del(entry)}
                  disabled={state.busy}
                  danger
                />
              </View>
            </View>
          ))}
        </View>
      )}
    </Block>
  );
}

export function SkillsBlock(props: { api: ApiClient; t: T; skills: Skill[] }) {
  const { api, t } = props;
  const toEntry = (s: Skill): Entry<Skill['experience']> => ({
    id: s.id,
    name: s.name,
    level: s.experience,
  });
  return (
    <EntryEditor
      t={t}
      testID="skills"
      levels={SKILL_LEVEL}
      levelField="experience"
      nameMax={30}
      initial={props.skills.map(toEntry)}
      texts={{
        title: t('t_skills'),
        hint: t('t_let_ur_buyers_know_ur_skills'),
        name: t('t_add_skill'),
        namePlaceholder: t('t_eg_voice_talent'),
        level: t('t_experience'),
        add: t('t_add_skill'),
        update: t('t_update_skill'),
        edit: t('t_edit_skill'),
        remove: t('t_delete_skill'),
        empty: t('t_u_dont_have_any_skills'),
        added: t('t_skill_added_to_ur_profile'),
        updated: t('t_skill_updated'),
        removed: t('t_skill_has_been_deleted_from_profile'),
      }}
      save={async (id, name, experience) => {
        // An unchosen level goes to the API as missing, so its "required" message is the API's.
        const body = { name, experience: experience! };
        const res = id
          ? await api.PATCH('/me/skills/{skillId}', { params: { path: { skillId: id } }, body })
          : await api.POST('/me/skills', { body });
        return res.error ? { error: res.error as ApiError } : { entry: toEntry(res.data) };
      }}
      remove={async (id) => {
        const res = await api.DELETE('/me/skills/{skillId}', { params: { path: { skillId: id } } });
        return res.error as ApiError | undefined;
      }}
    />
  );
}

export function LanguagesBlock(props: { api: ApiClient; t: T; languages: Language[] }) {
  const { api, t } = props;
  const toEntry = (l: Language): Entry<Language['level']> => ({
    id: l.id,
    name: l.name,
    level: l.level,
  });
  return (
    <EntryEditor
      t={t}
      testID="languages"
      levels={LANGUAGE_LEVEL}
      levelField="level"
      nameMax={100}
      initial={props.languages.map(toEntry)}
      texts={{
        title: t('t_languages'),
        hint: t('t_add_languages_u_speak'),
        name: t('t_language'),
        level: t('t_level'),
        add: t('t_add_language'),
        update: t('t_update_language'),
        edit: t('t_edit_language'),
        remove: t('t_delete_language'),
        empty: t('t_u_dont_have_any_languages'),
        added: t('t_language_added_to_ur_profile'),
        updated: t('t_language_updated'),
        removed: t('t_language_has_been_deleted_from_profile'),
      }}
      save={async (id, name, level) => {
        const body = { name, level: level! };
        const res = id
          ? await api.PATCH('/me/languages/{languageId}', {
              params: { path: { languageId: id } },
              body,
            })
          : await api.POST('/me/languages', { body });
        return res.error ? { error: res.error as ApiError } : { entry: toEntry(res.data) };
      }}
      remove={async (id) => {
        const res = await api.DELETE('/me/languages/{languageId}', {
          params: { path: { languageId: id } },
        });
        return res.error as ApiError | undefined;
      }}
    />
  );
}

const s = StyleSheet.create({
  muted: { ...theme.text.bodySm, color: theme.colors.text.muted },
  list: { gap: theme.space[2] },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[3],
    padding: theme.space[3],
    borderWidth: theme.borderWidth.hairline,
    borderColor: theme.colors.border.default,
    borderRadius: theme.radius.control,
  },
  entryEditing: {
    borderColor: theme.colors.border.brand,
    backgroundColor: theme.colors.bg.selected,
  },
  entryText: { flex: 1, gap: theme.space['0.5'] },
  entryName: { ...theme.text.label, color: theme.colors.text.primary },
  entryActions: { gap: theme.space[2], alignItems: 'flex-end' },
});
