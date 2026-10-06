'use client';
// Gig categories (spec 16 AC-60; spec 03 AC-1, AC-5, EC-2; spec 17 AC-10): the 3-level tree in tree order with
// usage counts and old slugs; create (top level or under a category of level 1–2), edit, delete (refused while in
// use: the API's message is shown). Names, description and the SEO texts above/below the list in ka + en (SEO
// texts are HTML, sanitised by the API); icon and image on the top level only; "show on the home page"; position.
import { useCallback, useEffect, useState } from 'react';
import type { components } from '@mytask/types';
import { Alert, Field } from '@mytask/ui/web';
import { AdminNav } from '../../components/nav';
import { Checkbox, formText, ImagePicker, LangPair, saveText } from '../../components/catalog';
import { splitErrors, t, useAdminApi, type ApiErrorBody } from '../../lib/client';

type Category = components['schemas']['AdminCategory'];
type Pair = { ka: string; en: string };

interface FormState {
  id: string | null;
  parentId: string | null;
  depth: number;
  slug: string;
  name: Pair;
  description: Pair;
  contentTop: Pair;
  contentBottom: Pair;
  isVisibleOnHome: boolean;
  position: string;
  iconFileId: string | null | undefined;
  imageFileId: string | null | undefined;
  icon: Category['icon'];
  image: Category['image'];
}

const empty = (parent: Category | null): FormState => ({
  id: null,
  parentId: parent?.id ?? null,
  depth: parent ? parent.depth + 1 : 1,
  slug: '',
  name: { ka: '', en: '' },
  description: { ka: '', en: '' },
  contentTop: { ka: '', en: '' },
  contentBottom: { ka: '', en: '' },
  isVisibleOnHome: true,
  position: '',
  iconFileId: undefined,
  imageFileId: undefined,
  icon: null,
  image: null,
});

const fromCategory = (c: Category): FormState => ({
  id: c.id,
  parentId: c.parentId,
  depth: c.depth,
  slug: c.slug,
  name: formText(c.name),
  description: formText(c.description),
  contentTop: formText(c.contentTop),
  contentBottom: formText(c.contentBottom),
  isVisibleOnHome: c.isVisibleOnHome,
  position: String(c.position),
  iconFileId: undefined,
  imageFileId: undefined,
  icon: c.icon,
  image: c.image,
});

export default function CategoriesPage() {
  const api = useAdminApi();
  const [list, setList] = useState<Category[]>([]);
  const [form, setForm] = useState<FormState | null>(null);
  const [err, setErr] = useState<ApiErrorBody>();
  const [notice, setNotice] = useState<string>();
  const [busy, setBusy] = useState(false);
  const { fields, general } = splitErrors(err);

  const load = useCallback(async () => {
    const res = await api.GET('/admin/categories');
    if (res.data) setList(res.data.categories);
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
    const images =
      form.depth === 1
        ? {
            ...(form.iconFileId !== undefined ? { iconFileId: form.iconFileId } : {}),
            ...(form.imageFileId !== undefined ? { imageFileId: form.imageFileId } : {}),
          }
        : {};
    const body = {
      slug: form.slug.trim(),
      name: saveText(form.name),
      description: saveText(form.description, true),
      contentTop: saveText(form.contentTop, true),
      contentBottom: saveText(form.contentBottom, true),
      isVisibleOnHome: form.isVisibleOnHome,
      ...(form.position.trim() !== '' ? { position: Number(form.position) } : {}),
      ...images,
    };
    const res = form.id
      ? await api.PATCH('/admin/categories/{categoryId}', {
          params: { path: { categoryId: form.id } },
          body,
        })
      : await api.POST('/admin/categories', { body: { ...body, parentId: form.parentId } });
    setBusy(false);
    if (res.error) return setErr(res.error as ApiErrorBody);
    setForm(null);
    setNotice(t('t_toast_operation_success'));
    void load();
  }

  async function remove(c: Category) {
    if (!window.confirm(t('t_are_u_sure_u_want_to_delete_this'))) return;
    setErr(undefined);
    setNotice(undefined);
    const res = await api.DELETE('/admin/categories/{categoryId}', {
      params: { path: { categoryId: c.id } },
    });
    if (res.error) return setErr(res.error as ApiErrorBody);
    setNotice(t('t_toast_operation_success'));
    void load();
  }

  const level = (depth: number) =>
    t(depth === 1 ? 't_category' : depth === 2 ? 't_subcategory' : 't_childcategory');

  return (
    <main className="admin-page">
      <AdminNav />
      <div className="admin-header">
        <h1 className="mt-text-h2">{t('t_categories')}</h1>
        <button type="button" className="auth-button" onClick={() => open(empty(null))}>
          {t('t_create_category')}
        </button>
      </div>
      {notice && <Alert kind="success">{notice}</Alert>}
      {general && !form && <Alert kind="error">{general}</Alert>}

      {form && (
        <form className="admin-section admin-stack admin-form-wide" onSubmit={save} noValidate>
          <h2 className="mt-text-h3">
            {form.id ? t('t_edit') : t('t_create')} · {level(form.depth)}
          </h2>
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
          <LangPair
            label={t('t_description')}
            name="description"
            value={form.description}
            onChange={(description) => setForm({ ...form, description })}
            errors={fields}
            multiline
            rows={2}
          />
          <LangPair
            label={t('t_seo_text_top')}
            name="contentTop"
            value={form.contentTop}
            onChange={(contentTop) => setForm({ ...form, contentTop })}
            errors={fields}
            multiline
          />
          <LangPair
            label={t('t_seo_text_bottom')}
            name="contentBottom"
            value={form.contentBottom}
            onChange={(contentBottom) => setForm({ ...form, contentBottom })}
            errors={fields}
            multiline
          />
          {form.depth === 1 && (
            <div className="admin-lang-pair">
              <ImagePicker
                label={t('t_category_icon')}
                current={form.icon}
                value={form.iconFileId}
                onChange={(iconFileId) => setForm({ ...form, iconFileId })}
                error={fields.iconFileId}
                testId="icon-picker"
              />
              <ImagePicker
                label={t('t_category_image')}
                current={form.image}
                value={form.imageFileId}
                onChange={(imageFileId) => setForm({ ...form, imageFileId })}
                error={fields.imageFileId}
                testId="image-picker"
              />
            </div>
          )}
          {form.depth === 1 && (
            <Checkbox
              label={t('t_show_on_home')}
              checked={form.isVisibleOnHome}
              onChange={(isVisibleOnHome) => setForm({ ...form, isVisibleOnHome })}
            />
          )}
          <Field
            label={t('t_position')}
            name="position"
            type="number"
            value={form.position}
            onChange={(position) => setForm({ ...form, position })}
            error={fields.position}
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
              <li
                key={c.id}
                className={`admin-row admin-depth-${c.depth}`}
                data-testid="category-row"
              >
                <span className="admin-row-text">
                  <strong>{c.name.ka}</strong>
                  {c.name.en ? ` / ${c.name.en}` : ''} · <code>{c.slug}</code> · {level(c.depth)}
                  {c.depth === 1 && !c.isVisibleOnHome ? ` · ${t('t_hidden_on_home')}` : ''}
                  <br />
                  <span className="auth-muted">
                    {t('t_category_usage', {
                      gigs: c.gigCount,
                      children: c.childCount,
                      projects: c.projectCategoryCount,
                    })}
                    {c.previousSlugs.length > 0 &&
                      ` · ${t('t_previous_slugs')}: ${c.previousSlugs.join(', ')}`}
                  </span>
                </span>
                <span className="admin-row-edit">
                  {c.depth < 3 && (
                    <button
                      type="button"
                      className="auth-link-button"
                      onClick={() => open(empty(c))}
                    >
                      {t('t_add_subcategory')}
                    </button>
                  )}
                  <button
                    type="button"
                    className="auth-link-button"
                    onClick={() => open(fromCategory(c))}
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
