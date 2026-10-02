// Types of the fixtures e2e/profile.spec.ts imports from fake-profiles.mjs.
import type { IncomingMessage } from 'node:http';

export declare const MEDIA: string;
export declare function UID(n: number): string;
export declare function viewerOf(req: IncomingMessage): 'guest' | 'viewer' | 'owner';
export declare function profileRoute(url: URL, req: IncomingMessage): [number, unknown] | undefined;
export declare const PORTFOLIO_PAGE_2: { data: unknown[]; nextCursor: string | null };
