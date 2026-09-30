// Turns every error into the contract's `Error` body `{ code, message, details }` (CONVENTIONS §7).
// Production never leaks stack traces or internal messages (ADR-013 §4).
import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiException, type ErrorCode, type ErrorDetails } from './api-exception';
import { defaultMessageKeys, FALLBACK_MESSAGE_KEY, resolveLocale, translate } from './messages';

interface ValidatorError {
  status: number;
  errors?: { path: string; message: string; errorCode?: string }[];
}

function isValidatorError(e: unknown): e is ValidatorError {
  return (
    typeof e === 'object' &&
    e !== null &&
    typeof (e as ValidatorError).status === 'number' &&
    Array.isArray((e as ValidatorError).errors)
  );
}

const STATUS_CODES: Record<number, ErrorCode> = {
  400: 'VALIDATION_FAILED',
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  405: 'NOT_FOUND',
  409: 'STATE_CONFLICT',
  413: 'VALIDATION_FAILED',
  415: 'VALIDATION_FAILED',
  422: 'BUSINESS_RULE_VIOLATION',
  429: 'RATE_LIMITED',
  503: 'SERVICE_UNAVAILABLE',
};

/**
 * Field messages for schema errors, from the legacy validator keys (spec 01 Texts, CONVENTIONS §7.1):
 * field-specific patterns first, then the generic keyword.
 */
const PATTERN_KEYS: Record<string, string> = {
  username: 't_validator_username',
  password: 't_password_validation_message',
  referralCode: 't_referral_code_invalid',
  code: 't_2fa_code_invalid',
};

export function fieldMessage(
  field: string,
  keyword: string,
  message: string,
): { messageKey: string; params: Record<string, string | number> } {
  const limit = Number(/(\d+)/.exec(message)?.[1] ?? 0);
  if (keyword === 'required') return { messageKey: 't_validator_required', params: {} };
  if (keyword === 'minLength') return { messageKey: 't_validator_min', params: { min: limit } };
  if (keyword === 'maxLength') return { messageKey: 't_validator_max', params: { max: limit } };
  if (keyword === 'format' && /email/i.test(message)) {
    return { messageKey: 't_validator_email', params: {} };
  }
  if (keyword === 'const' && field === 'acceptTerms') {
    return { messageKey: 't_you_must_agree_to_terms', params: {} };
  }
  const patternKey = PATTERN_KEYS[field];
  if (keyword === 'pattern' && patternKey) return { messageKey: patternKey, params: {} };
  return { messageKey: 't_toast_something_went_wrong', params: {} };
}

@Catch()
export class ErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger('ErrorFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const locale = resolveLocale(req.headers['accept-language']);

    let status = 500;
    let code: ErrorCode = 'INTERNAL_ERROR';
    let messageKey = FALLBACK_MESSAGE_KEY;
    let details: ErrorDetails = {};

    if (exception instanceof ApiException) {
      ({ status, code, messageKey } = exception);
      details = { ...exception.details };
    } else if (isValidatorError(exception)) {
      // express-openapi-validator (ADR-014 §3). 5xx from it = our response broke the contract.
      // 405 -> 404 and 413/415 -> 400: the contract only knows the statuses of CONVENTIONS §7.2.
      const mapped: Record<number, number> = { 405: 404, 413: 400, 415: 400 };
      status = exception.status >= 500 ? 500 : (mapped[exception.status] ?? exception.status);
      code = STATUS_CODES[exception.status] ?? 'INTERNAL_ERROR';
      if (status === 400) {
        const fields = (exception.errors ?? []).map((e) => {
          const field =
            e.path.replace(/^\/(body|query|params|headers)\/?/, '').replace(/\//g, '.') || e.path;
          // Non-JSON bodies: `unsupported_content_type` (openapi.yaml "Global rules", CSRF).
          const fieldCode =
            exception.status === 415
              ? 'unsupported_content_type'
              : (e.errorCode ?? 'invalid').replace('.openapi.validation', '');
          const { messageKey: key, params } = fieldMessage(field, fieldCode, e.message);
          return {
            field,
            code: fieldCode,
            message: translate(key, locale, params),
            messageKey: key,
            ...(Object.keys(params).length ? { params } : {}),
          };
        });
        details = { fields } as ErrorDetails;
      }
      if (status >= 500) this.logger.error({ err: exception }, 'contract violation');
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      code = STATUS_CODES[status] ?? (status >= 500 ? 'INTERNAL_ERROR' : 'VALIDATION_FAILED');
    } else {
      this.logger.error({ err: exception }, 'unhandled error');
    }

    if (messageKey === FALLBACK_MESSAGE_KEY && !(exception instanceof ApiException)) {
      messageKey = defaultMessageKeys[code] ?? FALLBACK_MESSAGE_KEY;
    }
    const nested = (details as { params?: Record<string, string | number> }).params ?? {};
    const params = {
      ...Object.fromEntries(
        Object.entries(details).filter(([, v]) => typeof v === 'string' || typeof v === 'number'),
      ),
      ...nested,
    };
    const retryAfter = (details as { retryAfterSeconds?: number }).retryAfterSeconds;
    if (typeof retryAfter === 'number') res.setHeader('Retry-After', String(retryAfter));
    res.status(status).json({
      code,
      message: translate(messageKey, locale, params),
      details: { ...details, messageKey },
    });
  }
}
