import { describe, expect, it } from 'vitest';
import { HttpErrorResponse } from '@angular/common/http';
import { toApiError } from './api.service';

describe('toApiError', () => {
  it('maps network failures (status 0) to a network kind with an Arabic message', () => {
    const err = toApiError(new HttpErrorResponse({ status: 0 }));
    expect(err.kind).toBe('network');
    expect(err.status).toBe(0);
    expect(err.message.length).toBeGreaterThan(0);
  });

  it('maps 401/403 to auth kind', () => {
    expect(toApiError(new HttpErrorResponse({ status: 401 })).kind).toBe('auth');
    expect(toApiError(new HttpErrorResponse({ status: 403 })).kind).toBe('auth');
  });

  it('maps 404 to not-found kind', () => {
    expect(toApiError(new HttpErrorResponse({ status: 404 })).kind).toBe('not-found');
  });

  it('maps 422 to validation kind and surfaces the server message', () => {
    const err = toApiError(
      new HttpErrorResponse({
        status: 422,
        error: { error: { code: 'CHECKOUT_FAILED', message: 'السلة فارغة' } },
      }),
    );
    expect(err.kind).toBe('validation');
    expect(err.message).toBe('السلة فارغة');
  });

  it('maps unknown statuses to server kind with fallback message', () => {
    const err = toApiError(new HttpErrorResponse({ status: 500 }));
    expect(err.kind).toBe('server');
    expect(err.message.length).toBeGreaterThan(0);
  });
});

describe('toApiError non-JSON API responses (regression: SPA fallback must not blame the user)', () => {
  it('classifies an HTML body at 404 as a service-side network failure', () => {
    const err = toApiError(
      new HttpErrorResponse({ status: 404, error: '<!doctype html><html><head></head></html>' }),
    );
    expect(err.kind).toBe('network');
    expect(err.message).toContain('مش متاحة');
    expect(err.message).not.toContain('النت عندك');
  });

  it('classifies an HTML body at 200 (parse failure) as service unavailable', () => {
    const err = toApiError(
      new HttpErrorResponse({ status: 200, error: '<!doctype html><html></html>' }),
    );
    expect(err.kind).toBe('network');
    expect(err.message).toContain('مش متاحة');
  });

  it('keeps genuine connection loss (status 0) on the user-network message', () => {
    const err = toApiError(new HttpErrorResponse({ status: 0, error: new ProgressEvent('error') }));
    expect(err.kind).toBe('network');
    expect(err.message).toContain('النت عندك');
  });
});
