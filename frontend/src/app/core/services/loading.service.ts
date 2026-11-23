import { Injectable, inject, signal } from '@angular/core';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class LoadingService {
  private readonly router = inject(Router, { optional: true });

  private activeRequests = 0;
  private minTimer: ReturnType<typeof setTimeout> | null = null;

  readonly isLoading = signal(false);
  readonly message = signal<string>('جاري التحميل...');

  constructor() {
    if (this.router) {
      this.router.events.subscribe((event) => {
        if (event instanceof NavigationStart) {
          this.show('جاري الانتقال...');
        } else if (
          event instanceof NavigationEnd ||
          event instanceof NavigationCancel ||
          event instanceof NavigationError
        ) {
          this.hide();
        }
      });
    }
  }

  show(msg: string = 'جاري التحميل...'): void {
    this.activeRequests++;
    this.message.set(msg);
    this.isLoading.set(true);
  }

  hide(force: boolean = false): void {
    if (force) {
      this.activeRequests = 0;
    } else if (this.activeRequests > 0) {
      this.activeRequests--;
    }

    if (this.activeRequests <= 0) {
      this.activeRequests = 0;
      // Keep visible for at least 150ms to prevent harsh flickering
      if (this.minTimer) {
        clearTimeout(this.minTimer);
      }
      this.minTimer = setTimeout(() => {
        if (this.activeRequests === 0) {
          this.isLoading.set(false);
          this.message.set('جاري التحميل...');
        }
      }, 150);
    }
  }
}
