import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AR_TRANSLATIONS } from '../../../core/constants/translations';
import { AuthService, UserRole } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-wrapper">
      <div class="login-box">
        <!-- Auth Role Switcher Tabs -->
        <div class="tabs">
          <button
            type="button"
            class="tab-btn"
            [class.active]="activeTab === 'customer'"
            (click)="setTab('customer')"
          >
            دخول الزوار والعملاء (Google)
          </button>
          <button
            type="button"
            class="tab-btn"
            [class.active]="activeTab === 'merchant'"
            (click)="setTab('merchant')"
          >
            دخول المطاعم والإدارة
          </button>
        </div>

        <div *ngIf="deniedMessage" class="error-box">
          {{ deniedMessage }}
        </div>

        <!-- 1. Customer Firebase Google Sign-In -->
        <div *ngIf="activeTab === 'customer'" class="tab-content">
          <h2 class="title">{{ t.customer.authModal.title }}</h2>
          <p class="desc">دخول سريع وآمن بحساب Google للعامة لتأكيد العنوان ومتابعة الطلبات في قنا.</p>

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
            <span>{{ auth.busy() ? 'جاري تسجيل الدخول...' : t.customer.authModal.googleBtn }}</span>
          </button>

          <div *ngIf="!auth.isConfigured" class="error-box">
            تسجيل الدخول غير مفعّل في هذه النسخة بعد: يلزم ضبط إعدادات Firebase أولاً
            (docs/FIREBASE_SETUP.md).
          </div>
        </div>

        <!-- 2. Merchant & Admin Credentials Login (Restaurants, Groceries, Branches, Admin) -->
        <div *ngIf="activeTab === 'merchant'" class="tab-content">
          <h2 class="title">لوحة أصحاب المتاجر والإدارة</h2>
          <p class="desc">مخصص لأصحاب المطاعم، البقالات، مديري الفروع، وإدارة المنصة.</p>

          <form (ngSubmit)="loginMerchant()" class="login-form">
            <div class="form-group">
              <label for="emailInput">البريد الإلكتروني</label>
              <input
                id="emailInput"
                type="email"
                [(ngModel)]="email"
                name="email"
                required
                placeholder="مثال: name@ordarat-qena.local"
                dir="ltr"
                class="form-input"
              />
            </div>

            <div class="form-group">
              <label for="passwordInput">كلمة المرور</label>
              <input
                id="passwordInput"
                type="password"
                [(ngModel)]="password"
                name="password"
                required
                placeholder="كلمة المرور"
                class="form-input"
              />
            </div>

            <button
              type="submit"
              class="btn btn-primary"
              [disabled]="auth.busy() || !email || !password"
            >
              {{ auth.busy() ? 'جاري التحقق...' : 'دخول لوحة التحكم' }}
            </button>
          </form>
        </div>

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
      .tabs {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 1.75rem;
        background: #f1f5f9;
        padding: 4px;
        border-radius: 10px;
      }
      .tab-btn {
        flex: 1;
        padding: 0.65rem 0.5rem;
        font-size: 0.85rem;
        font-weight: 600;
        border: none;
        background: transparent;
        color: var(--color-text-muted);
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .tab-btn.active {
        background: #ffffff;
        color: var(--color-primary);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
      }
      .title {
        font-family: var(--font-heading);
        color: var(--color-primary);
        margin: 0 0 0.5rem 0;
        font-size: 1.35rem;
      }
      .desc {
        color: var(--color-text-muted);
        font-size: 0.9rem;
        margin-bottom: 1.5rem;
        line-height: 1.45;
      }
      .login-form {
        text-align: right;
        margin-bottom: 1rem;
      }
      .form-group {
        margin-bottom: 1rem;
      }
      .form-group label {
        display: block;
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--color-text);
        margin-bottom: 0.35rem;
      }
      .form-input {
        width: 100%;
        padding: 0.75rem 0.9rem;
        border: 1px solid var(--color-border);
        border-radius: 8px;
        font-size: 0.95rem;
        outline: none;
        box-sizing: border-box;
      }
      .form-input:focus {
        border-color: var(--color-primary);
        box-shadow: 0 0 0 2px rgba(13, 148, 136, 0.15);
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
      .btn-primary {
        background: var(--color-primary);
        color: #ffffff;
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
      .btn-later {
        background: transparent;
        color: var(--color-text-muted);
        border: 1px solid var(--color-border);
        margin-top: 0.5rem;
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

  activeTab: 'customer' | 'merchant' = 'customer';
  email = '';
  password = '';
  errorMessage = '';
  deniedMessage = '';
  private returnUrl = '/';

  ngOnInit(): void {
    this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/';
    if (this.route.snapshot.queryParamMap.get('denied') === '1') {
      this.deniedMessage =
        'الصفحة دي محتاجة حساب له صلاحية الوصول ليها. سجّل دخول بالحساب الصح.';
      // Automatically switch to merchant tab if denied route was store/branch/admin
      if (
        this.returnUrl.startsWith('/store') ||
        this.returnUrl.startsWith('/branch') ||
        this.returnUrl.startsWith('/admin')
      ) {
        this.activeTab = 'merchant';
      }
    }

    // Already signed in: go straight to the destination.
    this.auth.whenReady().then(() => {
      if (this.auth.isLoggedIn()) {
        this.redirectAfterLogin();
      }
    });
  }

  setTab(tab: 'customer' | 'merchant'): void {
    this.activeTab = tab;
    this.errorMessage = '';
  }

  async signInWithGoogle(): Promise<void> {
    this.errorMessage = '';
    const result = await this.auth.signInWithGoogle();

    if (result.ok) {
      this.redirectAfterLogin();
      return;
    }

    if (result.error === 'cancelled') {
      return;
    }

    if (result.error === 'firebase-not-configured') {
      this.errorMessage = 'إعدادات Firebase لسه مش متظبطة في هذه النسخة.';
      return;
    }

    this.errorMessage = 'حصل خطأ أثناء تسجيل الدخول. حاول مرة تانية.';
  }

  async loginMerchant(): Promise<void> {
    if (!this.email || !this.password) {
      this.errorMessage = 'يرجى إدخال البريد الإلكتروني وكلمة المرور';
      return;
    }

    this.errorMessage = '';
    const result = await this.auth.loginWithCredentials(this.email, this.password);

    if (result.ok) {
      this.redirectAfterLogin(result.user?.role);
      return;
    }

    this.errorMessage = result.error || 'فشل تسجيل الدخول. تأكد من البيانات.';
  }

  skipForNow(): void {
    this.router.navigate(['/']);
  }

  private redirectAfterLogin(explicitRole?: UserRole): void {
    const role = explicitRole || this.auth.role();

    // If returnUrl is specific (not root), honor it
    if (this.returnUrl !== '/' && this.returnUrl.startsWith('/') && !this.returnUrl.startsWith('//')) {
      this.router.navigateByUrl(this.returnUrl);
      return;
    }

    // Default route by role
    switch (role) {
      case 'admin':
        this.router.navigate(['/admin/dashboard']);
        break;
      case 'merchant':
        this.router.navigate(['/store/dashboard']);
        break;
      case 'branch_manager':
        this.router.navigate(['/branch/dashboard']);
        break;
      default:
        this.router.navigate(['/']);
        break;
    }
  }
}
