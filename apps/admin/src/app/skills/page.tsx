'use client';
// Project skills (spec 16 AC-61, NEW screen; spec 03 AC-31, P-31): each skill belongs to one project category.
// Filter by project category and search (slug or name), oldest first with "Load more"; create, edit (also moving
// to another category), delete (refused while projects use it, slice 9).
import { useCallback, useEffect, useState } from 'react';
import type { components } from '@mytask/types';
import { Alert, Field, Select } from '@mytask/ui/web';
import { AdminShell } from '../../components/shell';
import { Checkbox, formText, LangPair, saveText } from '../../components/catalog';
import { splitErrors, t, useAdminApi, type ApiErrorBody } from '../../lib/client';

type Skill = components['schemas']['AdminSkill'];
type ProjectCategory = components['schemas']['AdminProjectCategory'];

interface FormState {
  id: string | null;
  projectCategoryId: string;
  slug: string;
  name: { ka: string; en: string };
  isActive: boolean;
}

const PAGE = 50;

export default function SkillsPage() {
  const api = useAdminApi();
  const [categories, setCategories] = useState<ProjectCategory[]>([]);
  const [filter, setFilter] = useState('');
  const [q, setQ] = useState('');
  const [skills, setSkills] = useState<Skill[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [err, setErr] = useState<ApiErrorBody>();
  const [notice, setNotice] = useState<string>();
  const [busy, setBusy] = useState(false);
  const { fields, general } = splitErrors(err);

  const load = useCallback(
    async (after?: string | null) => {
      const res = await api.GET('/admin/skills', {
        params: {
          query: {
            ...(filter ? { projectCategoryId: filter } : {}),
            ...(q.trim() ? { q: q.trim() } : {}),
            ...(after ? { cursor: after } : {}),
            limit: PAGE,
          },
        },
      });
      if (!res.data) return;
      const page = (res.data.data ?? []) as Skill[];
      setSkills((prev) => (after ? [...prev, ...page] : page));
      setCursor(res.data.nextCursor);
    },
    [api, filter, q],
  );

  useEffect(() => {
    void api.GET('/admin/project-categories').then((res) => {
      if (res.data) setCategories(res.data.projectCategories);
    });
  }, [api]);

  useEffect(() => {
    void load();
    // Reload on a new category filter; the keyword applies on "Search".
  }, [filter]);

  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name.ka ?? '';
  const open = (next: FormState) => {
    setErr(undefined);
    setNotice(undefined);
    setForm(next);
  };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setBusy(true);
    setErr(undefined);
    const body = {
      projectCategoryId: form.projectCategoryId,
      slug: form.slug.trim(),
      name: saveText(form.name),
      isActive: form.isActive,
    };
    const res = form.id
      ? await api.PATCH('/admin/skills/{skillId}', { params: { path: { skillId: form.id } }, body })
      : await api.POST('/admin/skills', { body });
    setBusy(false);
    if (res.error) return setErr(res.error as ApiErrorBody);
    setForm(null);
    setNotice(t('t_toast_operation_success'));
    void load();
  }

  async function remove(s: Skill) {
    if (!window.confirm(t('t_are_u_sure_u_want_to_delete_this'))) return;
    setErr(undefined);
    setNotice(undefined);
    const res = await api.DELETE('/admin/skills/{skillId}', {
      params: { path: { skillId: s.id } },
    });
    if (res.error) return setErr(res.error as ApiErrorBody);
    setNotice(t('t_toast_operation_success'));
    void load();
  }

  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name.ka }));

  return (
    <AdminShell>
      <div className="admin-header">
        <h1 className="mt-text-h2">{t('t_skills')}</h1>
        <button
          type="button"
          className="auth-button"
          onClick={() =>
            open({
              id: null,
              projectCategoryId: filter,
              slug: '',
              name: { ka: '', en: '' },
              isActive: true,
            })
          }
        >
          {t('t_add')}
        </button>
      </div>
      {notice && <Alert kind="success">{notice}</Alert>}
      {general && !form && <Alert kind="error">{general}</Alert>}

      {form && (
        <form className="admin-section admin-stack admin-form-wide" onSubmit={save} noValidate>
          <h2 className="mt-text-h3">{form.id ? t('t_edit') : t('t_create')}</h2>
          {general && <Alert kind="error">{general}</Alert>}
          <Select
            label={t('t_project_category')}
            name="projectCategoryId"
            placeholder={t('t_choose_category')}
            options={categoryOptions}
            value={form.projectCategoryId}
            onChange={(projectCategoryId) => setForm({ ...form, projectCategoryId })}
            error={fields.projectCategoryId}
          />
          <LangPair
            label={t('t_name')}
            name="name"
            value={form.name}
            onChange={(name) => setForm({ ...form, name })}
            errors={fields}
          />
          <Field
            label={t('t_slug')}
            name="slug"
            value={form.slug}
            onChange={(slug) => setForm({ ...form, slug })}
            error={fields.slug}
            maxLength={100}
          />
          <Checkbox
            label={t('t_active')}
            checked={form.isActive}
            onChange={(isActive) => setForm({ ...form, isActive })}
          />
          <div className="admin-row-edit">
            <button type="submit" className="auth-button" disabled={busy}>
              {t('t_save')}
            </button>
            <button type="button" className="auth-link-button" onClick={() => setForm(null)}>
              {t('t_cancel')}
            </button>
          </div>
        </form>
      )}

      <form
        className="admin-section admin-inline-form"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          void load();
        }}
      >
        <Select
          label={t('t_project_category')}
          name="filter"
          placeholder={t('t_all_categories')}
          options={categoryOptions}
          value={filter}
          onChange={setFilter}
        />
        <Field label={t('t_search')} name="q" value={q} onChange={setQ} maxLength={100} />
        <button type="submit" className="auth-button">
          {t('t_search')}
        </button>
      </form>

      <section className="admin-section">
        {skills.length === 0 ? (
          <p className="auth-muted">{t('t_no_results_found')}</p>
        ) : (
          <ul className="admin-rows">
            {skills.map((s) => (
              <li key={s.id} className="admin-row" data-testid="skill-row">
                <span className="admin-row-text">
                  <strong>{s.name.ka}</strong>
                  {s.name.en ? ` / ${s.name.en}` : ''} · <code>{s.slug}</code> ·{' '}
                  {categoryName(s.projectCategoryId)}
                  {!s.isActive ? ` · ${t('t_inactive')}` : ''}
                </span>
                <span className="admin-row-edit">
                  <button
                    type="button"
                    className="auth-link-button"
                    onClick={() =>
                      open({
                        id: s.id,
                        projectCategoryId: s.projectCategoryId,
                        slug: s.slug,
                        name: formText(s.name),
                        isActive: s.isActive,
                      })
                    }
                  >
                    {t('t_edit')}
                  </button>
                  <button type="button" className="auth-link-button" onClick={() => remove(s)}>
                    {t('t_delete')}
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
        {cursor && (
          <button type="button" className="auth-link-button" onClick={() => void load(cursor)}>
            {t('t_load_more')}
          </button>
        )}
      </section>
    </AdminShell>
  );
}
