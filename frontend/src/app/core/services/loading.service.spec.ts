import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LoadingService } from './loading.service';

describe('LoadingService', () => {
  let service: LoadingService;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({});
    service = TestBed.inject(LoadingService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the overlay for blocking actions and hides after the min dwell', () => {
    service.show('جاري تنفيذ الطلب...');
    expect(service.isLoading()).toBe(true);
    expect(service.message()).toBe('جاري تنفيذ الطلب...');

    service.hide();
    expect(service.isLoading()).toBe(true); // still within the 150ms dwell
    vi.advanceTimersByTime(200);
    expect(service.isLoading()).toBe(false);
  });

  it('keeps the overlay up while any blocking request is outstanding', () => {
    service.show();
    service.show();
    service.hide();
    vi.advanceTimersByTime(200);
    expect(service.isLoading()).toBe(true);
    service.hide();
    vi.advanceTimersByTime(200);
    expect(service.isLoading()).toBe(false);
  });

  it('tracks background API activity on the slim bar, not the overlay', () => {
    service.apiStart();
    expect(service.apiBusy()).toBe(true);
    expect(service.isLoading()).toBe(false);

    service.apiEnd();
    vi.advanceTimersByTime(200);
    expect(service.apiBusy()).toBe(false);
  });

  it('never lets the API bar go negative on extra end calls', () => {
    service.apiEnd();
    service.apiEnd();
    vi.advanceTimersByTime(200);
    expect(service.apiBusy()).toBe(false);
  });

  it('force hide clears all outstanding blocking requests', () => {
    service.show();
    service.show();
    service.hide(true);
    vi.advanceTimersByTime(200);
    expect(service.isLoading()).toBe(false);
  });
});
