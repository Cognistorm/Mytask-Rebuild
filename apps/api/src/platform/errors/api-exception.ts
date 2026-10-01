// The one way business code signals an error (CONVENTIONS §7). The filter turns it into
// `{ code, message, details }` with `message` localized from `messageKey` by Accept-Language.
import type { components } from '@mytask/types';

export type ErrorCode = components['schemas']['ErrorCode'];
export type ErrorDetails = components['schemas']['ErrorDetails'];

export class ApiException extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    readonly messageKey: string,
    readonly details: Omit<ErrorDetails, 'messageKey'> = {},
  ) {
    super(`${code} (${messageKey})`);
    this.name = 'ApiException';
  }
}
