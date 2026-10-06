// Any URL no other page matches (QA 4.1.26 BUG-01). With two root layouts there is no app-wide not-found file, so
// this catch-all sends unknown paths to the private layout's 404 page: strict CSP, no custom code, as
// lib/zones.ts already treats unknown paths (fail closed).
import { notFound } from 'next/navigation';

export default function Missing(): never {
  notFound();
}
