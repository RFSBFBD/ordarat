import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AR_TRANSLATIONS } from '../../../core/constants/translations';
import { AuthService, authErrorMessage } from '../../../core/services/auth.service';
import { AUTH_FORM_STYLES, AuthBrandComponent } from '../shared/auth-ui';

/** Waiting screen for email + password accounts until the email link is clicked. */
@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, AuthBrandComponent],
  template: `
    <div class="onboarding-wrapper">
      <div class="onboarding-card auth-card">
        <app-auth-brand />
        <h2 class="title">{{ t.emailAuth.verifyTitle }}</h2>
        <p class="desc">
          {{ t.emailAuth.verifyDesc }}
          <strong dir="ltr" *ngIf="auth.firebaseUser()?.email">{{ auth.firebaseUser()?.email }}</strong>
        </p>

        <div *ngIf="info" class="success-box" role="status">{{ info }}</div>
        <div *ngIf="errorMessage" class="error-box" role="alert">{{ errorMessage }}</div>

        <button type="button" class="btn btn-primary-solid" [disabled]="auth.busy()" (click)="check()">
          {{ auth.busy() ? t.unifiedAuth.busy : t.emailAuth.verifiedBtn }}
        </button>
        <button type="button" class="btn btn-skip" [disabled]="auth.busy()" (click)="resend()">
          {{ t.emailAuth.resendBtn }}
        </button>

        <div class="links">
          <button type="button" class="text-link" (click)="useOtherEmail()">{{ t.emailAuth.otherEmail }}</button>
        </div>
      </div>
    </div>
  `,
  styles: [AUTH_FORM_STYLES],
})
export class VerifyEmailComponent implements OnInit {
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);
  protected readonly t = AR_TRANSLATIONS;

  info = '';
  errorMessage = '';

  ngOnInit(): void {
    this.auth.whenReady().then(() => {
      if (!this.auth.isLoggedIn()) {
        this.router.navigate(['/auth/login']);
      } else if (!this.auth.needsEmailVerification()) {
        this.router.navigateByUrl(this.auth.postLoginTarget());
      }
    });
  }

  async check(): Promise<void> {
    this.info = '';
    this.errorMessage = '';
    const result = await this.auth.checkEmailVerified();
    if (result.ok) {
      this.router.navigateByUrl(this.auth.postLoginTarget());
      return;
    }
    this.errorMessage =
      result.error === 'EMAIL_NOT_VERIFIED' ? this.t.emailAuth.notYet : authErrorMessage(result.error);
  }

  async resend(): Promise<void> {
    this.info = '';
    this.errorMessage = '';
    const result = await this.auth.resendVerification();
    if (result.ok) {
      this.info = this.t.emailAuth.resent;
    } else {
      this.errorMessage = authErrorMessage(result.error);
    }
  }

  async useOtherEmail(): Promise<void> {
    await this.auth.logout();
    this.router.navigate(['/auth/register']);
  }
}
