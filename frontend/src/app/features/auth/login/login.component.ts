import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AR_TRANSLATIONS } from '../../../core/constants/translations';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="login-wrapper">
      <div class="login-box">
        <h2 class="title">{{ t.customer.authModal.title }}</h2>
        <p class="desc">دخول سريع وآمن باستخدام حساب Google لتأكيد عنوانك ومتابعة طلباتك في قنا.</p>

        <button class="btn btn-google" (click)="signInWithGoogle()">
          <span class="g-icon">G</span>
          <span>{{ t.customer.authModal.googleBtn }}</span>
        </button>

        <div *ngIf="errorMessage" class="error-box">
          {{ errorMessage }}
        </div>

        <button class="btn btn-later" (click)="skipForNow()">
          {{ t.customer.authModal.laterBtn }}
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .login-wrapper {
        display: flex;
        justify-content: center;
        padding: 3rem 1rem;
      }
      .login-box {
        background: #ffffff;
        border-radius: 16px;
        padding: 2.5rem 2rem;
        max-width: 440px;
        width: 100%;
        border: 1px solid var(--color-border);
        text-align: center;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
      }
      .title {
        font-family: var(--font-heading);
        color: var(--color-primary);
        margin: 0 0 0.5rem 0;
        font-size: 1.45rem;
      }
      .desc {
        color: var(--color-text-muted);
        font-size: 0.95rem;
        margin-bottom: 2rem;
        line-height: 1.4;
      }
      .btn {
        width: 100%;
        padding: 0.75rem 1rem;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        font-size: 1rem;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.75rem;
        border: none;
      }
      .btn-google {
        background: #4285f4;
        color: #ffffff;
        box-shadow: 0 2px 6px rgba(66, 133, 244, 0.3);
        margin-bottom: 1rem;
      }
      .g-icon {
        font-weight: 800;
        font-size: 1.2rem;
        background: #ffffff;
        color: #4285f4;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .btn-later {
        background: transparent;
        color: var(--color-text-muted);
        border: 1px solid var(--color-border);
      }
      .error-box {
        background: #fff5f5;
        color: var(--color-danger);
        padding: 0.75rem;
        border-radius: 6px;
        margin-bottom: 1rem;
        font-size: 0.85rem;
      }
    `,
  ],
})
export class LoginComponent {
  private readonly router = inject(Router);
  protected readonly t = AR_TRANSLATIONS;

  errorMessage = '';

  signInWithGoogle() {
    console.log('Firebase Google Sign-In initiated');
  }

  skipForNow() {
    this.router.navigate(['/']);
  }
}
