import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ONBOARDING_STYLES } from '../onboarding.styles';

/** One form look for login, register, forgot-password and verify-email. */
export const AUTH_FORM_STYLES =
  ONBOARDING_STYLES +
  `
  .auth-card { max-width: 440px; }
  .brand-mark { display: flex; justify-content: center; margin-bottom: 1rem; }
  .row-2 { display: flex; gap: 0.75rem; }
  .row-2 .form-group { flex: 1; min-width: 0; }
  .btn-primary-solid {
    background: var(--color-primary);
    color: #ffffff;
    font-size: 1.02rem;
    font-weight: 700;
    margin-bottom: 0.9rem;
  }
  .divider {
    display: flex; align-items: center; gap: 0.75rem;
    color: var(--color-text-muted); font-size: 0.85rem; margin: 0.25rem 0 0.9rem;
  }
  .divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: var(--color-border); }
  .links { display: flex; flex-direction: column; gap: 0.5rem; align-items: center; margin-top: 0.5rem; font-size: 0.9rem; }
  .text-link { background: none; border: none; padding: 0; color: var(--color-primary); font-weight: 700; cursor: pointer; font-size: inherit; font-family: inherit; text-decoration: underline; }
  .field-hint { color: var(--color-text-muted); font-size: 0.8rem; margin-top: 4px; display: block; }
  .success-box {
    background: #f0faf4; color: var(--color-success); padding: 0.75rem; border-radius: 6px;
    margin-bottom: 1rem; font-size: 0.9rem; line-height: 1.6;
  }
  .guest-note { color: var(--color-text-muted); font-size: 0.85rem; margin: 0.75rem 0 0.5rem; text-align: center; }
`;

@Component({
  selector: 'app-auth-brand',
  standalone: true,
  template: `
    <div class="brand-mark">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="72" height="72"
        style="filter: drop-shadow(0 4px 12px rgba(14, 90, 107, 0.2));" aria-hidden="true">
        <rect width="128" height="128" rx="32" fill="#0E5A6B" />
        <path d="M 64 114 L 35.6 70.6 A 34 34 0 1 1 92.4 70.6 Z" fill="#F5B335" />
        <circle cx="64" cy="44" r="3.5" fill="#FFFFFF" />
        <path d="M 50 60 A 14 14 0 0 1 78 60 Z" fill="#FFFFFF" />
        <rect x="47" y="62" width="34" height="4" rx="2" fill="#FFFFFF" />
      </svg>
    </div>
  `,
  styles: [`.brand-mark { display: flex; justify-content: center; margin-bottom: 1rem; }`],
})
export class AuthBrandComponent {}

@Component({
  selector: 'app-google-button',
  standalone: true,
  template: `
    <button type="button" class="g-btn" [disabled]="disabled" (click)="pressed.emit()">
      <span class="g-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="18" height="18">
          <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.09 3.57-5.16 3.57-8.81z" />
          <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3c-1.07.72-2.44 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.1A12 12 0 0 0 12 24z" />
          <path fill="#FBBC05" d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28v-3.1H1.29a12 12 0 0 0 0 10.76l3.98-3.1z" />
          <path fill="#EA4335" d="M12 4.76c1.76 0 3.34.6 4.58 1.8l3.44-3.44A11.98 11.98 0 0 0 12 0 12 12 0 0 0 1.29 6.62l3.98 3.1C6.22 6.87 8.87 4.76 12 4.76z" />
        </svg>
      </span>
      <span>{{ label }}</span>
    </button>
  `,
  styles: [
    `
      .g-btn {
        width: 100%; padding: 0.75rem 1rem; border-radius: 8px; font-weight: 600; cursor: pointer;
        font-size: 0.95rem; display: flex; align-items: center; justify-content: center; gap: 0.75rem;
        background: #ffffff; color: #1e2a2f; border: 1.5px solid var(--color-border);
        box-sizing: border-box; margin-bottom: 0.9rem; font-family: inherit;
      }
      .g-btn:hover:not(:disabled) { border-color: var(--color-primary); }
      .g-btn:disabled { opacity: 0.6; cursor: not-allowed; }
      .g-icon { width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center; }
    `,
  ],
})
export class GoogleButtonComponent {
  @Input() label = '';
  @Input() disabled = false;
  @Output() pressed = new EventEmitter<void>();
}


/** Two-option switch at the top of sign-up / sign-in: customer or business owner. */
@Component({
  selector: 'app-account-type-switch',
  standalone: true,
  template: `
    <div class="type-switch" role="radiogroup" aria-label="نوع الحساب">
      <button type="button" role="radio" class="type-opt" [class.on]="value === 'customer'"
        [attr.aria-checked]="value === 'customer'" (click)="pick('customer')">جعان؟ اطلب</button>
      <button type="button" role="radio" class="type-opt" [class.on]="value === 'business'"
        [attr.aria-checked]="value === 'business'" (click)="pick('business')">عندي مطعم أو بقالة</button>
    </div>
  `,
  styles: [`
    .type-switch { display: flex; gap: 0.4rem; background: #eef3f4; padding: 0.3rem; border-radius: 12px; margin-bottom: 1rem; }
    .type-opt { flex: 1; border: 0; background: transparent; padding: 0.65rem 0.5rem; border-radius: 9px;
      font: inherit; font-weight: 700; color: var(--color-primary); cursor: pointer; }
    .type-opt.on { background: var(--color-primary); color: #fff; }
  `],
})
export class AccountTypeSwitchComponent {
  @Input() value: 'customer' | 'business' = 'customer';
  @Output() valueChange = new EventEmitter<'customer' | 'business'>();
  pick(v: 'customer' | 'business'): void {
    this.value = v;
    this.valueChange.emit(v);
  }
}
