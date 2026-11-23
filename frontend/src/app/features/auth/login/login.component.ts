import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AR_TRANSLATIONS } from '../../../core/constants/translations';
import { AuthService } from '../../../core/services/auth.service';

/**
 * ONE sign-in page for everyone. No role tabs, no passwords: a single
 * Google button, and the API decides where each account belongs.
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="login-wrapper">
      <div class="login-box">
        <div
          class="login-logo-header"
          style="display: flex; justify-content: center; margin-bottom: 1.25rem;"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 128 128"
            width="80"
            height="80"
            style="filter: drop-shadow(0 4px 12px rgba(14, 90, 107, 0.2));"
          >
            <rect width="128" height="128" rx="32" fill="#0E5A6B" />
            <path d="M 64 114 L 35.6 70.6 A 34 34 0 1 1 92.4 70.6 Z" fill="#F5B335" />
            <circle cx="64" cy="44" r="3.5" fill="#FFFFFF" />
            <path d="M 50 60 A 14 14 0 0 1 78 60 Z" fill="#FFFFFF" />
            <rect x="47" y="62" width="34" height="4" rx="2" fill="#FFFFFF" />
          </svg>
        </div>

        <div *ngIf="deniedMessage" class="error-box">
          {{ deniedMessage }}
        </div>

        <h2 class="title">{{ t.unifiedAuth.title }}</h2>
        <p class="desc">{{ t.unifiedAuth.desc }}</p>

        <button
          class="btn btn-google"
          [disabled]="auth.busy() || !auth.isConfigured"
          (click)="signInWithGoogle()"
        >
          <span class="g-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path
                fill="#4285F4"
                d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.09 3.57-5.16 3.57-8.81z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3c-1.07.72-2.44 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.1A12 12 0 0 0 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28v-3.1H1.29a12 12 0 0 0 0 10.76l3.98-3.1z"
              />
              <path
                fill="#EA4335"
                d="M12 4.76c1.76 0 3.34.6 4.58 1.8l3.44-3.44A11.98 11.98 0 0 0 12 0 12 12 0 0 0 1.29 6.62l3.98 3.1C6.22 6.87 8.87 4.76 12 4.76z"
              />
            </svg>
          </span>
          <span>{{ auth.busy() ? t.unifiedAuth.busy : t.unifiedAuth.googleBtn }}</span>
        </button>

        <div *ngIf="!auth.isConfigured" class="error-box">
          {{ t.unifiedAuth.notConfigured }}
        </div>

        <div *ngIf="errorMessage" class="error-box">
          {{ errorMessage }}
        </div>

        <button
          *ngIf="showProfileRetry"
          class="btn btn-retry-profile"
          [disabled]="auth.busy()"
          (click)="retryProfile()"
        >
          {{ auth.busy() ? 'بنحاول...' : 'حاول تاني' }}
        </button>

        <p class="guest-note">{{ t.unifiedAuth.guestNote }}</p>
        <button class="btn btn-later" (click)="browseAsGuest()">
          {{ t.unifiedAuth.browseGuestBtn }}
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .login-wrapper {
        display: flex;
        justify-content: center;
        padding: 2.5rem 1rem;
      }
      .login-box {
        background: #ffffff;
        border-radius: 16px;
        padding: 2rem 1.75rem;
        max-width: 460px;
        width: 100%;
        border: 1px solid var(--color-border);
        text-align: center;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
      }
      .title {
        font-family: var(--font-heading);
        color: var(--color-primary);
        margin: 0 0 0.5rem 0;
        font-size: 1.5rem;
      }
      .desc {
        color: var(--color-text-muted);
        font-size: 0.95rem;
        margin-bottom: 1.5rem;
        line-height: 1.6;
      }
      .btn {
        width: 100%;
        padding: 0.75rem 1rem;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        font-size: 0.95rem;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.75rem;
        border: none;
        box-sizing: border-box;
      }
      .btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      .btn-google {
        background: #4285f4;
        color: #ffffff;
        box-shadow: 0 2px 6px rgba(66, 133, 244, 0.3);
        margin-bottom: 1rem;
      }
      .g-icon {
        background: #ffffff;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .guest-note {
        color: var(--color-text-muted);
        font-size: 0.85rem;
        margin: 0.25rem 0 0.5rem;
      }
      .btn-later {
        background: transparent;
        color: var(--color-text-muted);
        border: 1px solid var(--color-border);
      }
      .btn-retry-profile {
        background: var(--color-accent);
        color: #1e2a2f;
        margin-bottom: 1rem;
      }
      .error-box {
        background: #fff5f5;
        color: var(--color-danger);
        padding: 0.75rem;
        border-radius: 6px;
        margin-bottom: 1rem;
        font-size: 0.85rem;
        line-height: 1.5;
      }
    `,
  ],
})
export class LoginComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly auth = inject(AuthService);
  protected readonly t = AR_TRANSLATIONS;

  errorMessage = '';
  deniedMessage = '';
  showProfileRetry = false;
  private returnUrl: string | null = null;

  ngOnInit(): void {
    this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    if (this.route.snapshot.queryParamMap.get('denied') === '1') {
      this.deniedMessage =
        'الصفحة دي محتاجة حساب له صلاحية الوصول ليها. سجّل دخولك ولو حسابك له صلاحية هتوصلها على طول.';
    }

    // Already signed in: go straight to where the account belongs.
    this.auth.whenReady().then(() => {
      if (this.auth.isLoggedIn()) {
        this.router.navigateByUrl(this.auth.postLoginTarget(this.returnUrl));
      }
    });
  }

  async signInWithGoogle(): Promise<void> {
    this.errorMessage = '';
    const result = await this.auth.signInWithGoogle();

    if (result.ok) {
      // The Google side passed; if the API could not confirm the profile,
      // say so instead of silently landing on a half-logged-in home page.
      if (!this.auth.profile()) {
        this.errorMessage =
          'تم تسجيل دخولك بجوجل، بس السيرفر مش بيرد فمش قادرين نكمل حسابك. جرّب تاني بعد شوية.';
        this.showProfileRetry = true;
        return;
      }
      this.router.navigateByUrl(this.auth.postLoginTarget(this.returnUrl));
      return;
    }

    if (result.error === 'cancelled') {
      return;
    }

    if (result.error === 'firebase-not-configured') {
      this.errorMessage = this.t.unifiedAuth.notConfigured;
      return;
    }

    this.errorMessage = this.t.unifiedAuth.failed;
  }

  /** Retry confirming the server-side profile, then continue as normal. */
  async retryProfile(): Promise<void> {
    this.errorMessage = '';
    this.showProfileRetry = false;
    await this.auth.refreshProfile();
    if (this.auth.profile()) {
      this.router.navigateByUrl(this.auth.postLoginTarget(this.returnUrl));
      return;
    }
    this.errorMessage =
      'لسه السيرفر مش بيرد. ممكن تستنى شوية وتجرّب تاني، أو تتفرّج كزائر لحد ما الخدمة ترجع.';
    this.showProfileRetry = true;
  }

  browseAsGuest(): void {
    this.router.navigate(['/customer/stores']);
  }
}
