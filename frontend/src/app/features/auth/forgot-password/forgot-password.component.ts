import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AR_TRANSLATIONS } from '../../../core/constants/translations';
import { AuthService, authErrorMessage } from '../../../core/services/auth.service';
import { AUTH_FORM_STYLES, AuthBrandComponent } from '../shared/auth-ui';

/**
 * Sends a Firebase password reset email. The confirmation is the same for
 * every address, so the form cannot be used to find out who has an account.
 */
@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AuthBrandComponent],
  template: `
    <div class="onboarding-wrapper">
      <form class="onboarding-card auth-card" (ngSubmit)="send()" novalidate>
        <app-auth-brand />
        <h2 class="title">{{ t.emailAuth.forgotTitle }}</h2>
        <p class="desc">{{ t.emailAuth.forgotDesc }}</p>

        <ng-container *ngIf="!sent; else doneTpl">
          <div class="form-group">
            <label class="label" for="email">{{ t.emailAuth.email }}</label>
            <input id="email" name="email" type="email" class="input-field" dir="ltr" autocomplete="email"
              [(ngModel)]="email" placeholder="name@gmail.com" />
            <span *ngIf="showErrors && !isEmailValid()" class="error-text">{{ t.emailAuth.emailInvalid }}</span>
          </div>
          <div *ngIf="!auth.isConfigured" class="error-box">{{ t.unifiedAuth.notConfigured }}</div>
          <div *ngIf="errorMessage" class="error-box" role="alert">{{ errorMessage }}</div>
          <button type="submit" class="btn btn-primary-solid" [disabled]="auth.busy() || !auth.isConfigured">
            {{ auth.busy() ? t.unifiedAuth.busy : t.emailAuth.forgotBtn }}
          </button>
        </ng-container>

        <ng-template #doneTpl>
          <div class="success-box" role="status">{{ t.emailAuth.forgotSent }}</div>
        </ng-template>

        <div class="links">
          <span>{{ t.emailAuth.rememberedIt }} <a class="text-link" routerLink="/auth/login">{{ t.emailAuth.loginLink }}</a></span>
          <span>{{ t.emailAuth.noAccount }} <a class="text-link" routerLink="/auth/register">{{ t.emailAuth.registerLink }}</a></span>
        </div>
      </form>
    </div>
  `,
  styles: [AUTH_FORM_STYLES],
})
export class ForgotPasswordComponent {
  protected readonly auth = inject(AuthService);
  protected readonly t = AR_TRANSLATIONS;

  email = '';
  showErrors = false;
  errorMessage = '';
  sent = false;

  isEmailValid(): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim());
  }

  async send(): Promise<void> {
    this.showErrors = true;
    this.errorMessage = '';
    if (!this.isEmailValid()) {
      return;
    }
    const result = await this.auth.sendPasswordReset(this.email);
    if (!result.ok) {
      this.errorMessage = authErrorMessage(result.error);
      return;
    }
    this.sent = true;
  }
}
