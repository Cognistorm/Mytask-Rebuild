// Public entry of @mytask/types. Everything here derives from the generated files; nothing is hand-written
// except convenience aliases over generated types (CLAUDE.md: never hand-written duplicates).
export type { paths, components, operations } from './generated/openapi';
export type { RealtimeEvents, RealtimeEventName } from './generated/realtime';
export { realtimeEventNames } from './generated/realtime';

import type { components, operations } from './generated/openapi';

/** A component schema by name, e.g. `Schema<'Money'>`. */
export type Schema<Name extends keyof components['schemas']> = components['schemas'][Name];

/** The standard error body `{ code, message, details }` (CONVENTIONS, ADR-014 §4). */
export type ApiError = components['schemas']['Error'];

/** Money in integer tetri (ADR-003). */
export type Money = components['schemas']['Money'];

/** Operation by operationId, e.g. `Operation<'getHealth'>`. */
export type Operation<Id extends keyof operations> = operations[Id];
