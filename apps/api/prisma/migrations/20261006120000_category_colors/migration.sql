-- ADR-023 (spec 3X R-1, data-model §3.C): one colour per top-level gig category. Sub-/child categories and project
-- categories never hold one: they inherit it from their top-level (linked) gig category when read.
ALTER TABLE "gig_categories" ADD COLUMN "color" CHAR(7);

-- Format, upper case and level in one check: only depth 1 may hold a colour, always `#RRGGBB` upper case.
ALTER TABLE "gig_categories" ADD CONSTRAINT "gig_categories_color_ck"
  CHECK ("color" IS NULL OR ("depth" = 1 AND "color" ~ '^#[0-9A-F]{6}$'));

-- Unique among top-level categories (Q-170); the real guard when two staff save the same colour at once (EC-2).
CREATE UNIQUE INDEX "gig_categories_color_top_key" ON "gig_categories" ("color")
  WHERE "depth" = 1 AND "color" IS NOT NULL;

-- Existing top-level categories get the starter colours in `position`, then `id` order (ADR-023 §4). The list is
-- `category.starter` of packages/tokens/tokens.json as of this migration (test/category-colors.test.ts compares
-- them); spares that no category takes stay free.
WITH "starter"("n", "color") AS (
  VALUES (1, '#7C3AED'), (2, '#DB2777'), (3, '#2563EB'), (4, '#D99A00'), (5, '#0EA5E9'), (6, '#1E3A8A'),
         (7, '#4D9A1E'), (8, '#C026D3'), (9, '#8B5E34'), (10, '#52606D'), (11, '#A3A30D'), (12, '#9F1239')
), "top" AS (
  SELECT "id", row_number() OVER (ORDER BY "position", "id") AS "n" FROM "gig_categories" WHERE "depth" = 1
)
UPDATE "gig_categories" g SET "color" = s."color"
FROM "top" t JOIN "starter" s ON s."n" = t."n"
WHERE g."id" = t."id";
