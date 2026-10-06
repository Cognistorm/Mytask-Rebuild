# @mytask/ui

Shared design-system components (inventory: `docs/05-design/components.md`, ADR-001).

| Entry               | Used by                  | Contents                                                                                          |
| ------------------- | ------------------------ | ------------------------------------------------------------------------------------------------- |
| `@mytask/ui/web`    | `apps/web`, `apps/admin` | `Field` (text / password with show-hide), `TextArea`, `Submit`, `Alert`, `CodeInput` — task 4.1.2 |
| `@mytask/ui/native` | `apps/mobile`            | not yet — added with the first shared mobile piece                                                |

Rules: design tokens only (CSS variables from `@mytask/tokens/tokens.css`, loaded by the app), no hard-coded
text (labels come in as props from the app's i18n), never import `apps/*`. Components import their own CSS
(`src/web/form.css`), so the consuming Next.js app lists `@mytask/ui` in `transpilePackages`.

The CSS class names (`auth-field`, `auth-button`, `auth-alert-*`, `auth-code`, …) are kept from slice 01
because pages and E2E tests use them; rename them only together with those users.
