import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AR_TRANSLATIONS } from '../../../core/constants/translations';
import { AuthService, authErrorMessage } from '../../../core/services/auth.service';
import { AUTH_FORM_STYLES, AuthBrandComponent, GoogleButtonComponent } from '../shared/auth-ui';

/**
 * ONE sign-in page for everyone: email + password, or Google. The API
 * decides where each account belongs after sign-in.
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AuthBrandComponent, GoogleButtonComponent],
  template: `
    <div class="onboarding-wrapper">
      <form class="onboarding-card auth-card" (ngSubmit)="signIn()" novalidate>
        <app-auth-brand />

        <div *ngIf="deniedMessage" class="error-box">{{ deniedMessage }}</div>

        <h2 class="title">{{ t.emailAuth.loginTitle }}</h2>
        <p class="desc">{{ t.emailAuth.loginDesc }}</p>

        <div class="form-group">
          <label class="label" for="email">{{ t.emailAuth.email }}</label>
          <input id="email" name="email" type="email" class="input-field" autocomplete="email"
            dir="ltr" [(ngModel)]="email" placeholder="name@gmail.com" />
          <span *ngIf="showErrors && !isEmailValid()" class="error-text">{{ t.emailAuth.emailInvalid }}</span>
        </div>

        <div class="form-group">
          <label class="label" for="password">{{ t.emailAuth.password }}</label>
          <input id="password" name="password" type="password" class="input-field"
            autocomplete="current-password" dir="ltr" [(ngModel)]="password" />
          <span *ngIf="showErrors && !password" class="error-text">{{ t.emailAuth.passwordRequired }}</span>
        </div>

        <div *ngIf="!auth.isConfigured" class="error-box">{{ t.unifiedAuth.notConfigured }}</div>
        <div *ngIf="errorMessage" class="error-box" role="alert">{{ errorMessage }}</div>

        <button type="submit" class="btn btn-primary-solid" [disabled]="auth.busy() || !auth.isConfigured">
          {{ auth.busy() ? t.unifiedAuth.busy : t.emailAuth.loginBtn }}
        </button>

        <div class="divider">{{ t.emailAuth.or }}</div>

        <app-google-button
          [label]="t.unifiedAuth.googleBtn"
          [disabled]="auth.busy() || !auth.isConfigured"
          (pressed)="signInWithGoogle()"
        />

        <button *ngIf="showProfileRetry" type="button" class="btn btn-submit" [disabled]="auth.busy()" (click)="retryProfile()">
          {{ auth.busy() ? 'بنحاول...' : 'حاول تاني' }}
        </button>

        <div class="links">
          <a class="text-link" routerLink="/auth/forgot-password">{{ t.emailAuth.forgotLink }}</a>
          <span>{{ t.emailAuth.noAccount }} <a class="text-link" routerLink="/auth/register" [queryParams]="returnParams()">{{ t.emailAuth.registerLink }}</a></span>
        </div>

        <p class="guest-note">{{ t.unifiedAuth.guestNote }}</p>
        <button type="button" class="btn btn-skip" (click)="browseAsGuest()">{{ t.unifiedAuth.browseGuestBtn }}</button>
      </form>
    </div>
  `,
  styles: [AUTH_FORM_STYLES],
})
export class LoginComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly auth = inject(AuthService);
  protected readonly t = AR_TRANSLATIONS;

  email = '';
  password = '';
  showErrors = false;
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

  returnParams(): Record<string, string> {
    return this.returnUrl ? { returnUrl: this.returnUrl } : {};
  }

  isEmailValid(): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim());
  }

  async signIn(): Promise<void> {
    this.showErrors = true;
    this.errorMessage = '';
    if (!this.isEmailValid() || !this.password) {
      return;
    }
    await this.finish(await this.auth.signInWithEmail(this.email, this.password));
  }

  async signInWithGoogle(): Promise<void> {
    this.errorMessage = '';
    await this.finish(await this.auth.signInWithGoogle());
  }

  private async finish(result: { ok: boolean; error?: string }): Promise<void> {
    if (result.error === 'cancelled') {
      return;
    }
    if (result.error === 'EMAIL_NOT_VERIFIED') {
      this.router.navigate(['/auth/verify-email']);
      return;
    }
    if (!result.ok) {
      this.errorMessage = authErrorMessage(result.error);
      return;
    }
    // Signed in, but the API could not confirm the profile: say so instead of
    // silently landing on a half-logged-in page.
    if (!this.auth.profile()) {
      this.errorMessage =
        'تم تسجيل دخولك، بس السيرفر مش بيرد فمش قادرين نكمل حسابك. جرّب تاني بعد شوية.';
      this.showProfileRetry = true;
      return;
    }
    this.router.navigateByUrl(this.auth.postLoginTarget(this.returnUrl));
  }

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
