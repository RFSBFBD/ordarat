import { Injectable, inject, signal } from '@angular/core';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
} from '@angular/router';

/**
 * Central loading state, split by channel so the UI stays dynamic instead
 * of blacking out the whole screen for every request:
 *
 * - Route transitions: full-screen branded overlay, but only when the
 *   transition is genuinely slow (delayed past a flicker threshold).
 * - API calls: a slim top progress bar; pages keep their own inline
 *   skeletons/spinners so the user always sees context, not a blank page.
 * - Blocking actions (checkout submit, explicit flows): full-screen overlay.
 */
@Injectable({
  providedIn: 'root',
})
export class LoadingService {
  private readonly router = inject(Router, { optional: true });

  private blockingRequests = 0;
  private apiRequests = 0;
  private navDelayTimer: ReturnType<typeof setTimeout> | null = null;
  private minTimer: ReturnType<typeof setTimeout> | null = null;
  private apiMinTimer: ReturnType<typeof setTimeout> | null = null;

  /** Full-screen branded overlay (slow transitions & blocking actions). */
  readonly isLoading = signal(false);
  readonly message = signal<string>('جاري التحميل...');

  /** Slim top progress bar while API requests are in flight. */
  readonly apiBusy = signal(false);

  /** True when the router failed to load a view (e.g. offline chunk fetch). */
  readonly navError = signal(false);

  constructor() {
    if (this.router) {
      this.router.events.subscribe((event) => {
        if (event instanceof NavigationStart) {
          this.navError.set(false);
          this.startNavDelay();
        } else if (event instanceof NavigationEnd || event instanceof NavigationCancel) {
          this.endNav();
        } else if (event instanceof NavigationError) {
          this.endNav();
          this.navError.set(true);
        }
      });
    }
  }

  /** Begin a full-screen blocking action (or a slow route transition). */
  show(msg: string = 'جاري التحميل...'): void {
    this.blockingRequests++;
    this.message.set(msg);
    this.isLoading.set(true);
  }

  /** End a blocking action; `force` clears every outstanding one. */
  hide(force: boolean = false): void {
    if (force) {
      this.blockingRequests = 0;
    } else if (this.blockingRequests > 0) {
      this.blockingRequests--;
    }

    if (this.blockingRequests <= 0) {
      this.blockingRequests = 0;
      // Keep visible for at least 150ms to prevent harsh flickering
      if (this.minTimer) {
        clearTimeout(this.minTimer);
      }
      this.minTimer = setTimeout(() => {
        if (this.blockingRequests === 0) {
          this.isLoading.set(false);
          this.message.set('جاري التحميل...');
        }
      }, 150);
    }
  }

  /** One API request started: show the slim top bar. */
  apiStart(): void {
    this.apiRequests++;
    if (this.apiMinTimer) {
      clearTimeout(this.apiMinTimer);
      this.apiMinTimer = null;
    }
    this.apiBusy.set(true);
  }

  /** One API request settled. */
  apiEnd(): void {
    if (this.apiRequests > 0) {
      this.apiRequests--;
    }
    if (this.apiRequests === 0) {
      // Small dwell so back-to-back calls read as one smooth activity line.
      if (this.apiMinTimer) {
        clearTimeout(this.apiMinTimer);
      }
      this.apiMinTimer = setTimeout(() => {
        if (this.apiRequests === 0) {
          this.apiBusy.set(false);
        }
      }, 150);
    }
  }

  private startNavDelay(): void {
    this.clearNavDelay();
    // Only take over the screen when the transition is actually slow;
    // instant navigations must never flash the overlay.
    this.navDelayTimer = setTimeout(() => {
      this.navDelayTimer = null;
      this.show('جاري الانتقال...');
    }, 250);
  }

  private endNav(): void {
    const wasShowing = this.navDelayTimer === null && this.blockingRequests > 0;
    this.clearNavDelay();
    if (wasShowing) {
      this.hide(true);
    }
  }

  private clearNavDelay(): void {
    if (this.navDelayTimer) {
      clearTimeout(this.navDelayTimer);
      this.navDelayTimer = null;
    }
  }
}
