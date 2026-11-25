import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AR_TRANSLATIONS } from '../../../core/constants/translations';
import { AuthService, authErrorMessage } from '../../../core/services/auth.service';
import { AUTH_FORM_STYLES, AuthBrandComponent, GoogleButtonComponent } from '../shared/auth-ui';

/**
 * Create an account with email + password (verified by an email link) or
 * with Google. Both end in the same mandatory first-time form.
 */
@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AuthBrandComponent, GoogleButtonComponent],
  template: `
    <div class="onboarding-wrapper">
      <form class="onboarding-card auth-card" (ngSubmit)="register()" novalidate>
        <app-auth-brand />
        <h2 class="title">{{ t.emailAuth.registerTitle }}</h2>
        <p class="desc">{{ t.emailAuth.registerDesc }}</p>

        <div class="row-2">
          <div class="form-group">
            <label class="label" for="first">{{ t.emailAuth.firstName }}</label>
            <input id="first" name="first" class="input-field" autocomplete="given-name" [(ngModel)]="firstName" />
            <span *ngIf="showErrors && !firstName.trim()" class="error-text">{{ t.emailAuth.required }}</span>
          </div>
          <div class="form-group">
            <label class="label" for="last">{{ t.emailAuth.lastName }}</label>
            <input id="last" name="last" class="input-field" autocomplete="family-name" [(ngModel)]="lastName" />
            <span *ngIf="showErrors && !lastName.trim()" class="error-text">{{ t.emailAuth.required }}</span>
          </div>
        </div>

        <div class="form-group">
          <label class="label" for="email">{{ t.emailAuth.email }}</label>
          <input id="email" name="email" type="email" class="input-field" dir="ltr" autocomplete="email"
            [(ngModel)]="email" placeholder="name@gmail.com" />
          <span *ngIf="showErrors && !isEmailValid()" class="error-text">{{ t.emailAuth.emailInvalid }}</span>
        </div>

        <div class="form-group">
          <label class="label" for="password">{{ t.emailAuth.password }}</label>
          <input id="password" name="password" type="password" class="input-field" dir="ltr"
            autocomplete="new-password" [(ngModel)]="password" />
          <span class="field-hint">{{ t.emailAuth.passwordHint }}</span>
          <span *ngIf="showErrors && password.length < 8" class="error-text">{{ t.emailAuth.passwordShort }}</span>
        </div>

        <div class="form-group">
          <label class="label" for="confirm">{{ t.emailAuth.confirmPassword }}</label>
          <input id="confirm" name="confirm" type="password" class="input-field" dir="ltr"
            autocomplete="new-password" [(ngModel)]="confirm" />
          <span *ngIf="showErrors && confirm !== password" class="error-text">{{ t.emailAuth.passwordMismatch }}</span>
        </div>

        <div *ngIf="!auth.isConfigured" class="error-box">{{ t.unifiedAuth.notConfigured }}</div>
        <div *ngIf="errorMessage" class="error-box" role="alert">{{ errorMessage }}</div>

        <button type="submit" class="btn btn-primary-solid" [disabled]="auth.busy() || !auth.isConfigured">
          {{ auth.busy() ? t.unifiedAuth.busy : t.emailAuth.registerBtn }}
        </button>

        <div class="divider">{{ t.emailAuth.or }}</div>

        <app-google-button
          [label]="t.emailAuth.googleRegister"
          [disabled]="auth.busy() || !auth.isConfigured"
          (pressed)="google()"
        />

        <div class="links">
          <span>{{ t.emailAuth.haveAccount }} <a class="text-link" routerLink="/auth/login">{{ t.emailAuth.loginLink }}</a></span>
        </div>
      </form>
    </div>
  `,
  styles: [AUTH_FORM_STYLES],
})
export class RegisterComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly auth = inject(AuthService);
  protected readonly t = AR_TRANSLATIONS;

  firstName = '';
  lastName = '';
  email = '';
  password = '';
  confirm = '';
  showErrors = false;
  errorMessage = '';
  private returnUrl: string | null = null;

  ngOnInit(): void {
    this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    this.auth.whenReady().then(() => {
      if (this.auth.isLoggedIn()) {
        this.router.navigateByUrl(this.auth.postLoginTarget(this.returnUrl));
      }
    });
  }

  isEmailValid(): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim());
  }

  isFormValid(): boolean {
    return (
      !!this.firstName.trim() &&
      !!this.lastName.trim() &&
      this.isEmailValid() &&
      this.password.length >= 8 &&
      this.password === this.confirm
    );
  }

  async register(): Promise<void> {
    this.showErrors = true;
    this.errorMessage = '';
    if (!this.isFormValid()) {
      return;
    }
    const result = await this.auth.registerWithEmail(
      this.firstName,
      this.lastName,
      this.email,
      this.password,
    );
    if (!result.ok) {
      this.errorMessage = authErrorMessage(result.error);
      return;
    }
    this.router.navigate(['/auth/verify-email']);
  }

  async google(): Promise<void> {
    this.errorMessage = '';
    const result = await this.auth.signInWithGoogle();
    if (result.error === 'cancelled') {
      return;
    }
    if (!result.ok) {
      this.errorMessage = authErrorMessage(result.error);
      return;
    }
    this.router.navigateByUrl(this.auth.postLoginTarget(this.returnUrl));
  }
}
