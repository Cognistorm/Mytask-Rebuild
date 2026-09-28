# /legacy — the OLD platform (read-only)

Put a copy of the current MyTask.ge code here. Agents read it; nobody edits it.

How to fill it (choose one):
- `git clone <your-old-repo-url> legacy/app`   (then delete legacy/app/.git if you don't want nested git)
- or copy the folder from your computer into `legacy/app`

Also add, if you can:
- `legacy/db/schema.sql` — database STRUCTURE only (no data): e.g. `mysqldump --no-data dbname > schema.sql`
- `legacy/db/sample.sql` — a small ANONYMIZED sample (fake names/phones/emails)
- `legacy/env-names.txt` — names of environment variables only, NO values

Never put real passwords, API keys, or real customer data here.
