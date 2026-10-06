'use client';
// Project categories (spec 16 AC-61; spec 03 AC-31, R-S8, P-31): list by position with skill counts; create, edit,
// delete (refused while skills use it). Name and SEO description in ka + en, slug, exactly one linked top-level
// gig category (used to notify freelancers of new projects, spec 10), image, position, active.
import { useCallback, useEffect, useState } from 'react';
import type { components } from '@mytask/types';
import { Alert, Field, Select } from '@mytask/ui/web';
import { AdminNav } from '../../components/nav';
import { Checkbox, formText, ImagePicker, LangPair, saveText } from '../../components/catalog';
import { splitErrors, t, useAdminApi, type ApiErrorBody } from '../../lib/client';

type ProjectCategory = components['schemas']['AdminProjectCategory'];
type GigCategory = components['schemas']['AdminCategory'];
type Pair = { ka: string; en: string };

interface FormState {
  id: string | null;
  slug: string;
  name: Pair;
  seoDescription: Pair;
  gigCategoryId: string;
  isActive: boolean;
  position: string;
  imageFileId: string | null | undefined;
  image: ProjectCategory['image'];
}

const EMPTY: FormState = {
  id: null,
  slug: '',
  name: { ka: '', en: '' },
  seoDescription: { ka: '', en: '' },
  gigCategoryId: '',
  isActive: true,
  position: '',
  imageFileId: undefined,
  image: null,
};

export default function ProjectCategoriesPage() {
  const api = useAdminApi();
  const [list, setList] = useState<ProjectCategory[]>([]);
  const [tops, setTops] = useState<GigCategory[]>([]);
  const [form, setForm] = useState<FormState | null>(null);
  const [err, setErr] = useState<ApiErrorBody>();
  const [notice, setNotice] = useState<string>();
  const [busy, setBusy] = useState(false);
  const { fields, general } = splitErrors(err);

  const load = useCallback(async () => {
    const [res, gig] = await Promise.all([
      api.GET('/admin/project-categories'),
      api.GET('/admin/categories'),
    ]);
    if (res.data) setList(res.data.projectCategories);
    if (gig.data) setTops(gig.data.categories.filter((c) => c.depth === 1));
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

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
      slug: form.slug.trim(),
      name: saveText(form.name),
      seoDescription: saveText(form.seoDescription, true),
      gigCategoryId: form.gigCategoryId,
      isActive: form.isActive,
      ...(form.position.trim() !== '' ? { position: Number(form.position) } : {}),
      ...(form.imageFileId !== undefined ? { imageFileId: form.imageFileId } : {}),
    };
    const res = form.id
      ? await api.PATCH('/admin/project-categories/{projectCategoryId}', {
          params: { path: { projectCategoryId: form.id } },
          body,
        })
      : await api.POST('/admin/project-categories', { body });
    setBusy(false);
    if (res.error) return setErr(res.error as ApiErrorBody);
    setForm(null);
    setNotice(t('t_toast_operation_success'));
    void load();
  }

  async function remove(c: ProjectCategory) {
    if (!window.confirm(t('t_are_u_sure_u_want_to_delete_this'))) return;
    setErr(undefined);
    setNotice(undefined);
    const res = await api.DELETE('/admin/project-categories/{projectCategoryId}', {
      params: { path: { projectCategoryId: c.id } },
    });
    if (res.error) return setErr(res.error as ApiErrorBody);
    setNotice(t('t_toast_operation_success'));
    void load();
  }

  return (
    <main className="admin-page">
      <AdminNav />
      <div className="admin-header">
        <h1 className="mt-text-h2">{t('t_project_categories')}</h1>
        <button type="button" className="auth-button" onClick={() => open(EMPTY)}>
          {t('t_create_category')}
        </button>
      </div>
      {notice && <Alert kind="success">{notice}</Alert>}
      {general && !form && <Alert kind="error">{general}</Alert>}

      {form && (
        <form className="admin-section admin-stack admin-form-wide" onSubmit={save} noValidate>
          <h2 className="mt-text-h3">{form.id ? t('t_edit') : t('t_create')}</h2>
          {general && <Alert kind="error">{general}</Alert>}
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
            maxLength={60}
          />
          <Select
            label={t('t_linked_gig_category')}
            name="gigCategoryId"
            placeholder={t('t_choose_category')}
            options={tops.map((c) => ({ value: c.id, label: c.name.ka }))}
            value={form.gigCategoryId}
            onChange={(gigCategoryId) => setForm({ ...form, gigCategoryId })}
            error={fields.gigCategoryId}
          />
          <LangPair
            label={t('t_seo_description')}
            name="seoDescription"
            value={form.seoDescription}
            onChange={(seoDescription) => setForm({ ...form, seoDescription })}
            errors={fields}
            multiline
            rows={2}
          />
          <ImagePicker
            label={t('t_image')}
            current={form.image}
            value={form.imageFileId}
            onChange={(imageFileId) => setForm({ ...form, imageFileId })}
            error={fields.imageFileId}
          />
          <Field
            label={t('t_position')}
            name="position"
            type="number"
            value={form.position}
            onChange={(position) => setForm({ ...form, position })}
            error={fields.position}
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

      <section className="admin-section">
        {list.length === 0 ? (
          <p className="auth-muted">{t('t_no_results_found')}</p>
        ) : (
          <ul className="admin-rows">
            {list.map((c) => (
              <li key={c.id} className="admin-row" data-testid="project-category-row">
                <span className="admin-row-text">
                  <strong>{c.name.ka}</strong>
                  {c.name.en ? ` / ${c.name.en}` : ''} · <code>{c.slug}</code>
                  {!c.isActive ? ` · ${t('t_inactive')}` : ''}
                  <br />
                  <span className="auth-muted">
                    {t('t_linked_gig_category')}: {c.gigCategory?.name ?? t('t_none')} ·{' '}
                    {t('t_skill_count', { count: c.skillCount })}
                  </span>
                </span>
                <span className="admin-row-edit">
                  <button
                    type="button"
                    className="auth-link-button"
                    onClick={() =>
                      open({
                        id: c.id,
                        slug: c.slug,
                        name: formText(c.name),
                        seoDescription: formText(c.seoDescription),
                        gigCategoryId: c.gigCategory?.id ?? '',
                        isActive: c.isActive,
                        position: String(c.position),
                        imageFileId: undefined,
                        image: c.image,
                      })
                    }
                  >
                    {t('t_edit')}
                  </button>
                  <button type="button" className="auth-link-button" onClick={() => remove(c)}>
                    {t('t_delete')}
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
