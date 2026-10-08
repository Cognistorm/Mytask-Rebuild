// Types of the fixtures e2e/gig-page.spec.ts imports from fake-gigs.mjs.
import type { IncomingMessage } from 'node:http';

export declare function GIG_UID(n: number): string;
export declare const GIG_SLUG: { 1: string; 2: string; 3: string; 4: string };
export declare function gigRoute(url: URL, req: IncomingMessage): [number, unknown] | undefined;
