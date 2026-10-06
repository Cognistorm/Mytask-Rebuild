'use client';
// Skills (spec 02 AC-19) and languages (AC-20) blocks: one form that adds, or updates the entry being edited,
// and the list with Edit / Delete per entry, newest first (legacy `ProfileComponent.php:439-996`,
// `orderBy('id', 'desc')`). Duplicates come back from the API as 409 with the legacy text.
import { useState } from 'react';
import type { components } from '@mytask/types';
import type { Locale } from '@mytask/i18n';
import { Field, RadioGroup } from '@mytask/ui/web';
import type { TFunction } from 'i18next';
import { useApi, type ApiErrorBody } from '../../lib/client';
import { LANGUAGE_LEVEL, SKILL_LEVEL } from '../profile/levels';
import { Block, BlockMessage, useBlockState } from './block';
import { LANGUAGE_SUGGESTIONS } from './languages-list';

type Skill = components['schemas']['UserSkill'];
type Language = components['schemas']['UserLanguage'];

interface Entry<L extends string> {
  id: string;
  name: string;
  level: L;
}

type Saved<L extends string> =
  { entry: Entry<L>; error?: never } | { entry?: never; error: ApiErrorBody };

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
  t: TFunction;
  testId: string;
  texts: Texts;
  levels: Record<L, string>;
  /** API field name of the level (`experience` for skills, `level` for languages). */
  levelField: string;
  nameMax: number;
  suggestions?: { id: string; values: readonly string[] };
  initial: Entry<L>[];
  save: (id: string | undefined, name: string, level: L | undefined) => Promise<Saved<L>>;
  remove: (id: string) => Promise<ApiErrorBody | undefined>;
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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
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
    <Block title={texts.title} hint={texts.hint} testId={props.testId}>
      <BlockMessage ok={state.ok} general={state.general} />
      <form onSubmit={submit} noValidate className="mt-edit-form">
        <Field
          label={texts.name}
          name="name"
          placeholder={texts.namePlaceholder}
          maxLength={props.nameMax}
          list={props.suggestions?.id}
          value={name}
          onChange={setName}
          error={state.fields.name}
        />
        {props.suggestions && (
          <datalist id={props.suggestions.id}>
            {props.suggestions.values.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
        )}
        <RadioGroup
          label={texts.level}
          name={`${props.testId}-level`}
          options={options}
          value={level}
          onChange={setLevel}
          error={state.fields[props.levelField]}
        />
        <div className="mt-edit-buttons">
          {editing && (
            <button type="button" className="mt-button" onClick={clear}>
              {t('t_cancel')}
            </button>
          )}
          <button type="submit" className="mt-button mt-button-primary" disabled={state.busy}>
            {editing ? texts.update : texts.add}
          </button>
        </div>
      </form>
      {entries.length === 0 ? (
        <p className="mt-edit-muted">{texts.empty}</p>
      ) : (
        <ul className="mt-edit-entries">
          {entries.map((entry) => (
            <li
              key={entry.id}
              data-testid={`${props.testId}-entry`}
              data-editing={editing === entry.id || undefined}
            >
              <span className="mt-edit-entry-name">{entry.name}</span>
              <span className="mt-edit-muted">{t(props.levels[entry.level])}</span>
              <span className="mt-edit-entry-actions">
                <button
                  type="button"
                  className="mt-edit-link"
                  aria-label={`${texts.edit}: ${entry.name}`}
                  onClick={() => edit(entry)}
                >
                  {t('t_edit')}
                </button>
                <button
                  type="button"
                  className="mt-edit-link mt-edit-link-danger"
                  aria-label={`${texts.remove}: ${entry.name}`}
                  disabled={state.busy}
                  onClick={() => void del(entry)}
                >
                  {t('t_delete')}
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Block>
  );
}

export function SkillsBlock(props: { t: TFunction; locale: Locale; skills: Skill[] }) {
  const { t } = props;
  const api = useApi(props.locale);
  const toEntry = (s: Skill): Entry<Skill['experience']> => ({
    id: s.id,
    name: s.name,
    level: s.experience,
  });
  return (
    <EntryEditor
      t={t}
      testId="skills"
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
        return res.error ? { error: res.error as ApiErrorBody } : { entry: toEntry(res.data) };
      }}
      remove={async (id) => {
        const res = await api.DELETE('/me/skills/{skillId}', { params: { path: { skillId: id } } });
        return res.error as ApiErrorBody | undefined;
      }}
    />
  );
}

export function LanguagesBlock(props: { t: TFunction; locale: Locale; languages: Language[] }) {
  const { t } = props;
  const api = useApi(props.locale);
  const toEntry = (l: Language): Entry<Language['level']> => ({
    id: l.id,
    name: l.name,
    level: l.level,
  });
  return (
    <EntryEditor
      t={t}
      testId="languages"
      levels={LANGUAGE_LEVEL}
      levelField="level"
      nameMax={100}
      suggestions={{ id: 'language-suggestions', values: LANGUAGE_SUGGESTIONS }}
      initial={props.languages.map(toEntry)}
      texts={{
        title: t('t_languages'),
        hint: t('t_add_languages_u_speak'),
        name: t('t_language'),
        namePlaceholder: t('t_choose_language'),
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
        return res.error ? { error: res.error as ApiErrorBody } : { entry: toEntry(res.data) };
      }}
      remove={async (id) => {
        const res = await api.DELETE('/me/languages/{languageId}', {
          params: { path: { languageId: id } },
        });
        return res.error as ApiErrorBody | undefined;
      }}
    />
  );
}
