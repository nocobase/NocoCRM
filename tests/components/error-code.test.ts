import { ApiClientError } from '@nocobase/app-client';
import { describe, expect, it } from 'vitest';
import { errorCode } from '../../client/components/crm/api.js';

// The client reads the standard error body (references/http-api.md) back
// into the codes its error texts are keyed by (`errors.<code>`).

const failure = (body: unknown, status = 400): ApiClientError =>
  new ApiClientError('failed', {
    status,
    payload: body,
    method: 'GET',
    url: '/api/leads',
  });

describe('errorCode', () => {
  it('keeps the demo refusal distinct from a server or permission error', () => {
    expect(
      errorCode(
        failure({
          error: {
            status: 'FAILED_PRECONDITION',
            reason: 'DEMO_READ_ONLY',
            domain: 'demoMode',
          },
        }),
      ).code,
    ).toBe('demoReadOnly');
  });
  it("turns the CRM's reasons back into its codes, with the field and an upstream detail", () => {
    expect(
      errorCode(
        failure({
          error: {
            code: 400,
            status: 'FAILED_PRECONDITION',
            reason: 'CONVERTED_READ_ONLY',
            domain: 'crm',
            message: 'x',
          },
        }),
      ),
    ).toEqual({
      code: 'convertedReadOnly',
      field: undefined,
      detail: undefined,
    });
    expect(
      errorCode(
        failure({
          error: {
            status: 'INVALID_ARGUMENT',
            reason: 'REQUIRED',
            domain: 'crm',
            fieldViolations: [{ field: 'name', description: 'x' }],
          },
        }),
      ),
    ).toMatchObject({ code: 'required', field: 'name' });
    expect(
      errorCode(
        failure(
          {
            error: {
              status: 'UNAVAILABLE',
              reason: 'CAPTURE_FAILED',
              domain: 'crm',
              metadata: { detail: 'The model is overloaded.' },
            },
          },
          503,
        ),
      ),
    ).toMatchObject({
      code: 'captureFailed',
      detail: 'The model is overloaded.',
    });
  });

  it("words the framework's and other plugins' errors by what they mean", () => {
    expect(
      errorCode(
        failure(
          {
            error: {
              status: 'UNAUTHENTICATED',
              reason: 'UNAUTHENTICATED',
              domain: 'app',
            },
          },
          401,
        ),
      ).code,
    ).toBe('unauthorized');
    expect(
      errorCode(
        failure(
          {
            error: {
              status: 'PERMISSION_DENIED',
              reason: 'AUTHORIZATION_DENIED',
              domain: 'authorization',
            },
          },
          403,
        ),
      ).code,
    ).toBe('forbidden');
    expect(
      errorCode(
        failure(
          {
            error: {
              status: 'INTERNAL',
              reason: 'INTERNAL_ERROR',
              domain: 'app',
            },
          },
          500,
        ),
      ).code,
    ).toBe('serverError');
  });

  it('still reads a body in the former shape and a local result', () => {
    expect(errorCode(failure({ code: 'taskChanged' })).code).toBe(
      'taskChanged',
    );
    expect(errorCode({ code: 'required', field: 'name' })).toMatchObject({
      code: 'required',
      field: 'name',
    });
    expect(errorCode(new Error('x')).code).toBe('serverError');
  });
});
