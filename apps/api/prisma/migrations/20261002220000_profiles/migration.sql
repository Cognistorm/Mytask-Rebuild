-- Spec 02 data model (ROADMAP 4.1.7, data-model §3.B): profile columns (availability included), skills,
-- languages, linked accounts, portfolio, KYC, countries and reports.

-- CreateEnum
CREATE TYPE "skill_level" AS ENUM ('beginner', 'intermediate', 'pro');

-- CreateEnum
CREATE TYPE "language_level" AS ENUM ('basic', 'conversational', 'fluent', 'native');

-- CreateEnum
CREATE TYPE "linked_provider" AS ENUM ('facebook', 'twitter', 'dribbble', 'stackoverflow', 'github', 'youtube', 'vimeo');

-- CreateEnum
CREATE TYPE "portfolio_status" AS ENUM ('pending', 'active', 'rejected');

-- CreateEnum
CREATE TYPE "kyc_document_type" AS ENUM ('national_id', 'driver_license', 'passport');

-- CreateEnum
CREATE TYPE "kyc_status" AS ENUM ('pending', 'verified', 'declined');

-- CreateEnum
CREATE TYPE "kyc_provider" AS ENUM ('manual');

-- CreateEnum
CREATE TYPE "report_target" AS ENUM ('user', 'gig', 'project', 'proposal');

-- CreateEnum
CREATE TYPE "report_status" AS ENUM ('pending', 'dismissed', 'resolved');

-- AlterTable
ALTER TABLE "user_profiles" ADD COLUMN     "about" VARCHAR(1500),
ADD COLUMN     "avatar_file_id" UUID,
ADD COLUMN     "city" VARCHAR(60),
ADD COLUMN     "country_id" SMALLINT,
ADD COLUMN     "headline" VARCHAR(100),
ADD COLUMN     "last_delivery_at" TIMESTAMPTZ(6),
ADD COLUMN     "timezone" VARCHAR(64),
ADD COLUMN     "unavailable_message" VARCHAR(750),
ADD COLUMN     "unavailable_until" TIMESTAMPTZ(6);

-- CreateTable
CREATE TABLE "countries" (
    "id" SMALLINT NOT NULL,
    "iso2" CHAR(2) NOT NULL,
    "name_ka" VARCHAR(100) NOT NULL,
    "name_en" VARCHAR(100) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "countries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_skills" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" VARCHAR(30) NOT NULL,
    "slug" VARCHAR(60) NOT NULL,
    "experience" "skill_level" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_languages" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "level" "language_level" NOT NULL,

    CONSTRAINT "user_languages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_linked_accounts" (
    "user_id" UUID NOT NULL,
    "provider" "linked_provider" NOT NULL,
    "url" VARCHAR(160) NOT NULL,

    CONSTRAINT "user_linked_accounts_pkey" PRIMARY KEY ("user_id","provider")
);

-- CreateTable
CREATE TABLE "portfolio_items" (
    "id" UUID NOT NULL,
    "legacy_id" BIGINT,
    "uid" VARCHAR(20) NOT NULL,
    "user_id" UUID NOT NULL,
    "slug" VARCHAR(160) NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "description" TEXT NOT NULL,
    "project_url" VARCHAR(120),
    "video_url" VARCHAR(120),
    "thumbnail_file_id" UUID NOT NULL,
    "status" "portfolio_status" NOT NULL DEFAULT 'pending',
    "rejection_reason" VARCHAR(1000),
    "rejected_at" TIMESTAMPTZ(6),
    "reviewed_by_staff_id" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "published_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "portfolio_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolio_images" (
    "portfolio_item_id" UUID NOT NULL,
    "file_id" UUID NOT NULL,
    "position" SMALLINT NOT NULL,

    CONSTRAINT "portfolio_images_pkey" PRIMARY KEY ("portfolio_item_id","file_id")
);

-- CreateTable
CREATE TABLE "kyc_verifications" (
    "id" UUID NOT NULL,
    "legacy_id" BIGINT,
    "user_id" UUID NOT NULL,
    "document_type" "kyc_document_type" NOT NULL,
    "front_file_id" UUID NOT NULL,
    "back_file_id" UUID,
    "selfie_file_id" UUID NOT NULL,
    "status" "kyc_status" NOT NULL DEFAULT 'pending',
    "provider" "kyc_provider" NOT NULL DEFAULT 'manual',
    "provider_reference" TEXT,
    "decline_reason" TEXT,
    "reviewed_by_staff_id" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kyc_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" UUID NOT NULL,
    "legacy_source" TEXT,
    "legacy_id" BIGINT,
    "reporter_user_id" UUID NOT NULL,
    "target_type" "report_target" NOT NULL,
    "target_id" UUID NOT NULL,
    "reason" VARCHAR(1500) NOT NULL,
    "status" "report_status" NOT NULL DEFAULT 'pending',
    "decision_note" VARCHAR(1000),
    "handled_by_staff_id" UUID,
    "handled_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "countries_iso2_key" ON "countries"("iso2");

-- CreateIndex
CREATE INDEX "user_skills_slug_idx" ON "user_skills"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "portfolio_items_legacy_id_key" ON "portfolio_items"("legacy_id");

-- CreateIndex
CREATE UNIQUE INDEX "portfolio_items_uid_key" ON "portfolio_items"("uid");

-- CreateIndex
CREATE INDEX "portfolio_items_user_id_status_idx" ON "portfolio_items"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "kyc_verifications_legacy_id_key" ON "kyc_verifications"("legacy_id");

-- CreateIndex
CREATE INDEX "kyc_verifications_user_id_created_at_idx" ON "kyc_verifications"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "reports_target_type_target_id_idx" ON "reports"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "reports_status_created_at_idx" ON "reports"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "reports_reporter_user_id_target_type_target_id_key" ON "reports"("reporter_user_id", "target_type", "target_id");

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_skills" ADD CONSTRAINT "user_skills_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_languages" ADD CONSTRAINT "user_languages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_linked_accounts" ADD CONSTRAINT "user_linked_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolio_items" ADD CONSTRAINT "portfolio_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolio_images" ADD CONSTRAINT "portfolio_images_portfolio_item_id_fkey" FOREIGN KEY ("portfolio_item_id") REFERENCES "portfolio_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_verifications" ADD CONSTRAINT "kyc_verifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_user_id_fkey" FOREIGN KEY ("reporter_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- data-model §3.B: FKs to files and staff, case-insensitive uniques, search and sweeper indexes, state checks.
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_avatar_file_fk" FOREIGN KEY ("avatar_file_id") REFERENCES "files"("id");
CREATE INDEX "user_profiles_unavailable_until_ix" ON "user_profiles" ("unavailable_until") WHERE "unavailable_until" IS NOT NULL;

CREATE UNIQUE INDEX "user_skills_user_name_uk" ON "user_skills" ("user_id", lower("name"));
CREATE INDEX "user_skills_slug_trgm_ix" ON "user_skills" USING gin ("slug" gin_trgm_ops);
CREATE INDEX "user_skills_name_trgm_ix" ON "user_skills" USING gin ("name" gin_trgm_ops);
CREATE UNIQUE INDEX "user_languages_user_name_uk" ON "user_languages" ("user_id", lower("name"));

ALTER TABLE "portfolio_items" ADD CONSTRAINT "portfolio_items_thumbnail_file_fk" FOREIGN KEY ("thumbnail_file_id") REFERENCES "files"("id");
ALTER TABLE "portfolio_items" ADD CONSTRAINT "portfolio_items_reviewed_by_fk" FOREIGN KEY ("reviewed_by_staff_id") REFERENCES "staff"("id");
-- The reason is shown only while `rejected`; the owner's next edit clears both columns (spec 02 AC-42).
ALTER TABLE "portfolio_items" ADD CONSTRAINT "portfolio_items_rejection_ck"
  CHECK (("status" = 'rejected') = ("rejection_reason" IS NOT NULL AND "rejected_at" IS NOT NULL));
ALTER TABLE "portfolio_images" ADD CONSTRAINT "portfolio_images_file_fk" FOREIGN KEY ("file_id") REFERENCES "files"("id");

ALTER TABLE "kyc_verifications" ADD CONSTRAINT "kyc_verifications_front_file_fk" FOREIGN KEY ("front_file_id") REFERENCES "files"("id");
ALTER TABLE "kyc_verifications" ADD CONSTRAINT "kyc_verifications_back_file_fk" FOREIGN KEY ("back_file_id") REFERENCES "files"("id");
ALTER TABLE "kyc_verifications" ADD CONSTRAINT "kyc_verifications_selfie_file_fk" FOREIGN KEY ("selfie_file_id") REFERENCES "files"("id");
ALTER TABLE "kyc_verifications" ADD CONSTRAINT "kyc_verifications_reviewed_by_fk" FOREIGN KEY ("reviewed_by_staff_id") REFERENCES "staff"("id");
-- Migrated declines have no reason (legacy `verification_center` has none), so only "reason ⇒ declined".
ALTER TABLE "kyc_verifications" ADD CONSTRAINT "kyc_verifications_decline_reason_ck"
  CHECK ("decline_reason" IS NULL OR "status" = 'declined');
-- One active verification per user (spec 02 AC-38).
CREATE UNIQUE INDEX "kyc_verifications_active_uk" ON "kyc_verifications" ("user_id") WHERE "status" IN ('pending', 'verified');

ALTER TABLE "reports" ADD CONSTRAINT "reports_handled_by_fk" FOREIGN KEY ("handled_by_staff_id") REFERENCES "staff"("id");
-- A decision needs a note (spec 16 AC-28); migrated "seen" rows come in as `pending`.
ALTER TABLE "reports" ADD CONSTRAINT "reports_decision_note_ck" CHECK ("status" = 'pending' OR "decision_note" IS NOT NULL);
CREATE UNIQUE INDEX "reports_legacy_uk" ON "reports" ("legacy_source", "legacy_id") WHERE "legacy_id" IS NOT NULL;

-- Reference data: legacy `countries` (CountriesTableSeeder, legacy ids kept), English names from legacy, Georgian
-- names from CLDR. Two legacy codes corrected to ISO 3166 / CLDR: Mayotte TY → YT, Kosovo KS → XK.
INSERT INTO "countries" ("id", "iso2", "name_ka", "name_en", "is_active") VALUES
    (1, 'US', 'ამერიკის შეერთებული შტატები', 'United States', true),
    (2, 'CA', 'კანადა', 'Canada', true),
    (3, 'AF', 'ავღანეთი', 'Afghanistan', true),
    (4, 'AL', 'ალბანეთი', 'Albania', true),
    (5, 'DZ', 'ალჟირი', 'Algeria', false),
    (6, 'AS', 'ამერიკის სამოა', 'American Samoa', true),
    (7, 'AD', 'ანდორა', 'Andorra', true),
    (8, 'AO', 'ანგოლა', 'Angola', true),
    (9, 'AI', 'ანგილია', 'Anguilla', true),
    (10, 'AQ', 'ანტარქტიკა', 'Antarctica', true),
    (11, 'AG', 'ანტიგუა და ბარბუდა', 'Antigua and/or Barbuda', true),
    (12, 'AR', 'არგენტინა', 'Argentina', true),
    (13, 'AM', 'სომხეთი', 'Armenia', true),
    (14, 'AW', 'არუბა', 'Aruba', true),
    (15, 'AU', 'ავსტრალია', 'Australia', true),
    (16, 'AT', 'ავსტრია', 'Austria', true),
    (17, 'AZ', 'აზერბაიჯანი', 'Azerbaijan', true),
    (18, 'BS', 'ბაჰამის კუნძულები', 'Bahamas', true),
    (19, 'BH', 'ბაჰრეინი', 'Bahrain', true),
    (20, 'BD', 'ბანგლადეში', 'Bangladesh', true),
    (21, 'BB', 'ბარბადოსი', 'Barbados', true),
    (22, 'BY', 'ბელარუსი', 'Belarus', true),
    (23, 'BE', 'ბელგია', 'Belgium', true),
    (24, 'BZ', 'ბელიზი', 'Belize', true),
    (25, 'BJ', 'ბენინი', 'Benin', true),
    (26, 'BM', 'ბერმუდა', 'Bermuda', true),
    (27, 'BT', 'ბუტანი', 'Bhutan', true),
    (28, 'BO', 'ბოლივია', 'Bolivia', true),
    (29, 'BA', 'ბოსნია და ჰერცეგოვინა', 'Bosnia and Herzegovina', true),
    (30, 'BW', 'ბოტსვანა', 'Botswana', true),
    (31, 'BV', 'ბუვე', 'Bouvet Island', true),
    (32, 'BR', 'ბრაზილია', 'Brazil', true),
    (33, 'IO', 'ბრიტანეთის ტერიტორია ინდოეთის ოკეანეში', 'British lndian Ocean Territory', true),
    (34, 'BN', 'ბრუნეი', 'Brunei Darussalam', true),
    (35, 'BG', 'ბულგარეთი', 'Bulgaria', true),
    (36, 'BF', 'ბურკინა-ფასო', 'Burkina Faso', true),
    (37, 'BI', 'ბურუნდი', 'Burundi', true),
    (38, 'KH', 'კამბოჯა', 'Cambodia', true),
    (39, 'CM', 'კამერუნი', 'Cameroon', true),
    (40, 'CV', 'კაბო-ვერდე', 'Cape Verde', true),
    (41, 'KY', 'კაიმანის კუნძულები', 'Cayman Islands', true),
    (42, 'CF', 'ცენტრალური აფრიკის რესპუბლიკა', 'Central African Republic', true),
    (43, 'TD', 'ჩადი', 'Chad', true),
    (44, 'CL', 'ჩილე', 'Chile', true),
    (45, 'CN', 'ჩინეთი', 'China', true),
    (46, 'CX', 'შობის კუნძული', 'Christmas Island', true),
    (47, 'CC', 'ქოქოსის (კილინგის) კუნძულები', 'Cocos (Keeling) Islands', true),
    (48, 'CO', 'კოლუმბია', 'Colombia', true),
    (49, 'KM', 'კომორის კუნძულები', 'Comoros', true),
    (50, 'CG', 'კონგო - ბრაზავილი', 'Congo', true),
    (51, 'CK', 'კუკის კუნძულები', 'Cook Islands', true),
    (52, 'CR', 'კოსტა-რიკა', 'Costa Rica', true),
    (53, 'HR', 'ხორვატია', 'Croatia (Hrvatska)', true),
    (54, 'CU', 'კუბა', 'Cuba', true),
    (55, 'CY', 'კვიპროსი', 'Cyprus', true),
    (56, 'CZ', 'ჩეხეთი', 'Czech Republic', true),
    (57, 'CD', 'კონგო - კინშასა', 'Democratic Republic of Congo', true),
    (58, 'DK', 'დანია', 'Denmark', true),
    (59, 'DJ', 'ჯიბუტი', 'Djibouti', true),
    (60, 'DM', 'დომინიკა', 'Dominica', true),
    (61, 'DO', 'დომინიკელთა რესპუბლიკა', 'Dominican Republic', true),
    (62, 'TP', 'ტიმორ-ლესტე', 'East Timor', true),
    (63, 'EC', 'ეკვადორი', 'Ecudaor', true),
    (64, 'EG', 'ეგვიპტე', 'Egypt', true),
    (65, 'SV', 'სალვადორი', 'El Salvador', true),
    (66, 'GQ', 'ეკვატორული გვინეა', 'Equatorial Guinea', true),
    (67, 'ER', 'ერიტრეა', 'Eritrea', true),
    (68, 'EE', 'ესტონეთი', 'Estonia', true),
    (69, 'ET', 'ეთიოპია', 'Ethiopia', true),
    (70, 'FK', 'ფოლკლენდის კუნძულები', 'Falkland Islands (Malvinas)', true),
    (71, 'FO', 'ფარერის კუნძულები', 'Faroe Islands', true),
    (72, 'FJ', 'ფიჯი', 'Fiji', true),
    (73, 'FI', 'ფინეთი', 'Finland', true),
    (74, 'FR', 'საფრანგეთი', 'France', true),
    (75, 'FX', 'საფრანგეთი', 'France, Metropolitan', true),
    (76, 'GF', 'საფრანგეთის გვიანა', 'French Guiana', true),
    (77, 'PF', 'საფრანგეთის პოლინეზია', 'French Polynesia', true),
    (78, 'TF', 'ფრანგული სამხრეთის ტერიტორიები', 'French Southern Territories', true),
    (79, 'GA', 'გაბონი', 'Gabon', true),
    (80, 'GM', 'გამბია', 'Gambia', true),
    (81, 'GE', 'საქართველო', 'Georgia', true),
    (82, 'DE', 'გერმანია', 'Germany', true),
    (83, 'GH', 'განა', 'Ghana', true),
    (84, 'GI', 'გიბრალტარი', 'Gibraltar', true),
    (85, 'GR', 'საბერძნეთი', 'Greece', true),
    (86, 'GL', 'გრენლანდია', 'Greenland', true),
    (87, 'GD', 'გრენადა', 'Grenada', true),
    (88, 'GP', 'გვადელუპა', 'Guadeloupe', true),
    (89, 'GU', 'გუამი', 'Guam', true),
    (90, 'GT', 'გვატემალა', 'Guatemala', true),
    (91, 'GN', 'გვინეა', 'Guinea', true),
    (92, 'GW', 'გვინეა-ბისაუ', 'Guinea-Bissau', true),
    (93, 'GY', 'გაიანა', 'Guyana', true),
    (94, 'HT', 'ჰაიტი', 'Haiti', true),
    (95, 'HM', 'ჰერდი და მაკდონალდის კუნძულები', 'Heard and Mc Donald Islands', true),
    (96, 'HN', 'ჰონდურასი', 'Honduras', true),
    (97, 'HK', 'ჰონკონგის სპეციალური ადმინისტრაციული რეგიონი, ჩინეთი', 'Hong Kong', true),
    (98, 'HU', 'უნგრეთი', 'Hungary', true),
    (99, 'IS', 'ისლანდია', 'Iceland', true),
    (100, 'IN', 'ინდოეთი', 'India', true),
    (101, 'ID', 'ინდონეზია', 'Indonesia', true),
    (102, 'IR', 'ირანი', 'Iran (Islamic Republic of)', true),
    (103, 'IQ', 'ერაყი', 'Iraq', true),
    (104, 'IE', 'ირლანდია', 'Ireland', true),
    (105, 'IL', 'ისრაელი', 'Israel', true),
    (106, 'IT', 'იტალია', 'Italy', true),
    (107, 'CI', 'კოტ-დივუარი', 'Ivory Coast', true),
    (108, 'JM', 'იამაიკა', 'Jamaica', true),
    (109, 'JP', 'იაპონია', 'Japan', true),
    (110, 'JO', 'იორდანია', 'Jordan', true),
    (111, 'KZ', 'ყაზახეთი', 'Kazakhstan', true),
    (112, 'KE', 'კენია', 'Kenya', true),
    (113, 'KI', 'კირიბატი', 'Kiribati', true),
    (114, 'KP', 'ჩრდილოეთ კორეა', 'Korea, Democratic People''s Republic of', true),
    (115, 'KR', 'სამხრეთ კორეა', 'Korea, Republic of', true),
    (116, 'KW', 'ქუვეითი', 'Kuwait', true),
    (117, 'KG', 'ყირგიზეთი', 'Kyrgyzstan', true),
    (118, 'LA', 'ლაოსი', 'Lao People''s Democratic Republic', true),
    (119, 'LV', 'ლატვია', 'Latvia', true),
    (120, 'LB', 'ლიბანი', 'Lebanon', true),
    (121, 'LS', 'ლესოთო', 'Lesotho', true),
    (122, 'LR', 'ლიბერია', 'Liberia', true),
    (123, 'LY', 'ლიბია', 'Libyan Arab Jamahiriya', true),
    (124, 'LI', 'ლიხტენშტაინი', 'Liechtenstein', true),
    (125, 'LT', 'ლიეტუვა', 'Lithuania', true),
    (126, 'LU', 'ლუქსემბურგი', 'Luxembourg', true),
    (127, 'MO', 'მაკაოს სპეციალური ადმინისტრაციული რეგიონი, ჩინეთი', 'Macau', true),
    (128, 'MK', 'ჩრდილოეთ მაკედონია', 'Macedonia', true),
    (129, 'MG', 'მადაგასკარი', 'Madagascar', true),
    (130, 'MW', 'მალავი', 'Malawi', true),
    (131, 'MY', 'მალაიზია', 'Malaysia', true),
    (132, 'MV', 'მალდივები', 'Maldives', true),
    (133, 'ML', 'მალი', 'Mali', true),
    (134, 'MT', 'მალტა', 'Malta', true),
    (135, 'MH', 'მარშალის კუნძულები', 'Marshall Islands', true),
    (136, 'MQ', 'მარტინიკა', 'Martinique', true),
    (137, 'MR', 'მავრიტანია', 'Mauritania', true),
    (138, 'MU', 'მავრიკი', 'Mauritius', true),
    (139, 'YT', 'მაიოტა', 'Mayotte', true),
    (140, 'MX', 'მექსიკა', 'Mexico', true),
    (141, 'FM', 'მიკრონეზია', 'Micronesia, Federated States of', true),
    (142, 'MD', 'მოლდოვა', 'Moldova, Republic of', true),
    (143, 'MC', 'მონაკო', 'Monaco', true),
    (144, 'MN', 'მონღოლეთი', 'Mongolia', true),
    (145, 'MS', 'მონსერატი', 'Montserrat', true),
    (146, 'MA', 'მაროკო', 'Morocco', true),
    (147, 'MZ', 'მოზამბიკი', 'Mozambique', true),
    (148, 'MM', 'მიანმარი (ბირმა)', 'Myanmar', true),
    (149, 'NA', 'ნამიბია', 'Namibia', true),
    (150, 'NR', 'ნაურუ', 'Nauru', true),
    (151, 'NP', 'ნეპალი', 'Nepal', true),
    (152, 'NL', 'ნიდერლანდები', 'Netherlands', true),
    (153, 'AN', 'კიურასაო', 'Netherlands Antilles', true),
    (154, 'NC', 'ახალი კალედონია', 'New Caledonia', true),
    (155, 'NZ', 'ახალი ზელანდია', 'New Zealand', true),
    (156, 'NI', 'ნიკარაგუა', 'Nicaragua', true),
    (157, 'NE', 'ნიგერი', 'Niger', true),
    (158, 'NG', 'ნიგერია', 'Nigeria', true),
    (159, 'NU', 'ნიუე', 'Niue', true),
    (160, 'NF', 'ნორფოლკის კუნძული', 'Norfork Island', true),
    (161, 'MP', 'ჩრდილოეთ მარიანას კუნძულები', 'Northern Mariana Islands', true),
    (162, 'NO', 'ნორვეგია', 'Norway', true),
    (163, 'OM', 'ომანი', 'Oman', true),
    (164, 'PK', 'პაკისტანი', 'Pakistan', true),
    (165, 'PW', 'პალაუ', 'Palau', true),
    (166, 'PA', 'პანამა', 'Panama', true),
    (167, 'PG', 'პაპუა-ახალი გვინეა', 'Papua New Guinea', true),
    (168, 'PY', 'პარაგვაი', 'Paraguay', true),
    (169, 'PE', 'პერუ', 'Peru', true),
    (170, 'PH', 'ფილიპინები', 'Philippines', true),
    (171, 'PN', 'პიტკერნის კუნძულები', 'Pitcairn', true),
    (172, 'PL', 'პოლონეთი', 'Poland', true),
    (173, 'PT', 'პორტუგალია', 'Portugal', true),
    (174, 'PR', 'პუერტო-რიკო', 'Puerto Rico', true),
    (175, 'QA', 'კატარი', 'Qatar', true),
    (176, 'SS', 'სამხრეთ სუდანი', 'Republic of South Sudan', true),
    (177, 'RE', 'რეუნიონი', 'Reunion', true),
    (178, 'RO', 'რუმინეთი', 'Romania', true),
    (179, 'RU', 'რუსეთი', 'Russian Federation', true),
    (180, 'RW', 'რუანდა', 'Rwanda', true),
    (181, 'KN', 'სენტ-კიტსი და ნევისი', 'Saint Kitts and Nevis', true),
    (182, 'LC', 'სენტ-ლუსია', 'Saint Lucia', true),
    (183, 'VC', 'სენტ-ვინსენტი და გრენადინები', 'Saint Vincent and the Grenadines', true),
    (184, 'WS', 'სამოა', 'Samoa', true),
    (185, 'SM', 'სან-მარინო', 'San Marino', true),
    (186, 'ST', 'სან-ტომე და პრინსიპი', 'Sao Tome and Principe', true),
    (187, 'SA', 'საუდის არაბეთი', 'Saudi Arabia', true),
    (188, 'SN', 'სენეგალი', 'Senegal', true),
    (189, 'RS', 'სერბეთი', 'Serbia', true),
    (190, 'SC', 'სეიშელის კუნძულები', 'Seychelles', true),
    (191, 'SL', 'სიერა-ლეონე', 'Sierra Leone', true),
    (192, 'SG', 'სინგაპური', 'Singapore', true),
    (193, 'SK', 'სლოვაკეთი', 'Slovakia', true),
    (194, 'SI', 'სლოვენია', 'Slovenia', true),
    (195, 'SB', 'სოლომონის კუნძულები', 'Solomon Islands', true),
    (196, 'SO', 'სომალი', 'Somalia', true),
    (197, 'ZA', 'სამხრეთ აფრიკის რესპუბლიკა', 'South Africa', true),
    (198, 'GS', 'სამხრეთ ჯორჯია და სამხრეთ სენდვიჩის კუნძულები', 'South Georgia South Sandwich Islands', true),
    (199, 'ES', 'ესპანეთი', 'Spain', true),
    (200, 'LK', 'შრი-ლანკა', 'Sri Lanka', true),
    (201, 'SH', 'წმინდა ელენეს კუნძული', 'St. Helena', true),
    (202, 'PM', 'სენ-პიერი და მიკელონი', 'St. Pierre and Miquelon', true),
    (203, 'SD', 'სუდანი', 'Sudan', true),
    (204, 'SR', 'სურინამი', 'Suriname', true),
    (205, 'SJ', 'შპიცბერგენი და იან-მაიენი', 'Svalbarn and Jan Mayen Islands', true),
    (206, 'SZ', 'სვაზილენდი', 'Swaziland', true),
    (207, 'SE', 'შვედეთი', 'Sweden', true),
    (208, 'CH', 'შვეიცარია', 'Switzerland', true),
    (209, 'SY', 'სირია', 'Syrian Arab Republic', true),
    (210, 'TW', 'ტაივანი', 'Taiwan', true),
    (211, 'TJ', 'ტაჯიკეთი', 'Tajikistan', true),
    (212, 'TZ', 'ტანზანია', 'Tanzania, United Republic of', true),
    (213, 'TH', 'ტაილანდი', 'Thailand', true),
    (214, 'TG', 'ტოგო', 'Togo', true),
    (215, 'TK', 'ტოკელაუ', 'Tokelau', true),
    (216, 'TO', 'ტონგა', 'Tonga', true),
    (217, 'TT', 'ტრინიდადი და ტობაგო', 'Trinidad and Tobago', true),
    (218, 'TN', 'ტუნისი', 'Tunisia', true),
    (219, 'TR', 'თურქეთი', 'Turkey', true),
    (220, 'TM', 'თურქმენეთი', 'Turkmenistan', true),
    (221, 'TC', 'თერქს-ქაიქოსის კუნძულები', 'Turks and Caicos Islands', true),
    (222, 'TV', 'ტუვალუ', 'Tuvalu', true),
    (223, 'UG', 'უგანდა', 'Uganda', true),
    (224, 'UA', 'უკრაინა', 'Ukraine', true),
    (225, 'AE', 'არაბთა გაერთიანებული საამიროები', 'United Arab Emirates', true),
    (226, 'GB', 'გაერთიანებული სამეფო', 'United Kingdom', true),
    (227, 'UM', 'აშშ-ის შორეული კუნძულები', 'United States minor outlying islands', true),
    (228, 'UY', 'ურუგვაი', 'Uruguay', true),
    (229, 'UZ', 'უზბეკეთი', 'Uzbekistan', true),
    (230, 'VU', 'ვანუატუ', 'Vanuatu', true),
    (231, 'VA', 'ქალაქი ვატიკანი', 'Vatican City State', true),
    (232, 'VE', 'ვენესუელა', 'Venezuela', true),
    (233, 'VN', 'ვიეტნამი', 'Vietnam', true),
    (234, 'VG', 'ბრიტანეთის ვირჯინის კუნძულები', 'Virgin Islands (British)', true),
    (235, 'VI', 'აშშ-ის ვირჯინის კუნძულები', 'Virgin Islands (U.S.)', true),
    (236, 'WF', 'უოლისი და ფუტუნა', 'Wallis and Futuna Islands', true),
    (237, 'EH', 'დასავლეთ საჰარა', 'Western Sahara', true),
    (238, 'YE', 'იემენი', 'Yemen', true),
    (240, 'ZR', 'კონგო - კინშასა', 'Zaire', true),
    (241, 'ZM', 'ზამბია', 'Zambia', true),
    (242, 'ZW', 'ზიმბაბვე', 'Zimbabwe', true),
    (243, 'XK', 'კოსოვო', 'Kosova', true),
    (244, 'PS', 'პალესტინის ტერიტორიები', 'Palestine', true);
