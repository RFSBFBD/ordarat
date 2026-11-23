import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AR_TRANSLATIONS } from '../../../core/constants/translations';
import { ApiService, OnboardingStatus } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';

/**
 * "Your application is with the admin" screen: shows after a business
 * submits its join form, with direct call + WhatsApp contact. Also shows
 * the rejection reason when the admin answered with one.
 */
@Component({
  selector: 'app-pending-approval',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="pending-wrapper">
      <div class="card">
        <ng-container *ngIf="status as s">
          <ng-container *ngIf="s.merchant_application?.status === 'rejected'; else pendingBlock">
            <div class="icon"><app-icon name="triangle-alert" [size]="44"></app-icon></div>
            <h2>{{ t.pendingApproval.rejectedTitle }}</h2>
            <div class="reject-note" *ngIf="s.merchant_application?.admin_note">
              <strong>{{ t.pendingApproval.rejectedReasonLabel }}</strong>
              <p>{{ s.merchant_application?.admin_note }}</p>
            </div>
            <button class="btn btn-primary" (click)="reapply()">
              {{ t.pendingApproval.reapplyBtn }}
            </button>
          </ng-container>

          <ng-template #pendingBlock>
            <div class="icon"><app-icon name="clock" [size]="44"></app-icon></div>
            <h2>{{ t.pendingApproval.title }}</h2>
            <p class="desc">
              {{ t.pendingApproval.desc }}
              <strong *ngIf="s.merchant_application?.business_name">
                ({{ s.merchant_application?.business_name }})</strong
              >
            </p>

            <div class="contact-box">
              <p class="hurry">{{ t.pendingApproval.hurryTitle }}</p>
              <div class="phone-display">{{ numberDisplay }}</div>
              <div class="actions">
                <a [href]="'tel:' + subscriptionNumber" class="btn btn-call">
                  <app-icon name="phone" [size]="18"></app-icon>
                  {{ t.pendingApproval.callBtn }}
                </a>
                <a [href]="'https://wa.me/' + whatsappNumber" target="_blank" class="btn btn-whatsapp">
                  <app-icon name="phone" [size]="18"></app-icon>
                  {{ t.pendingApproval.whatsappBtn }}
                </a>
              </div>
            </div>
          </ng-template>
        </ng-container>

        <button class="btn btn-back" (click)="goHome()">{{ t.pendingApproval.backHome }}</button>
      </div>
    </div>
  `,
  styles: [
    `
      .pending-wrapper {
        display: flex;
        justify-content: center;
        padding: 2rem 1rem;
      }
      .card {
        background: #ffffff;
        border-radius: 16px;
        padding: 2.5rem 1.75rem;
        max-width: 540px;
        width: 100%;
        text-align: center;
        border: 1px solid var(--color-border);
        box-shadow: 0 4px 18px rgba(0, 0, 0, 0.06);
      }
      .icon {
        color: var(--color-primary);
        margin-bottom: 0.75rem;
      }
      h2 {
        font-family: var(--font-heading);
        color: var(--color-primary);
        margin: 0 0 1rem 0;
        font-size: 1.5rem;
      }
      .desc {
        color: var(--color-text-muted);
        line-height: 1.7;
        margin-bottom: 1.5rem;
      }
      .contact-box {
        background: #faf7f0;
        border-radius: 10px;
        padding: 1.25rem;
        margin-bottom: 1.5rem;
      }
      .hurry {
        font-weight: 700;
        color: var(--color-text);
        margin: 0 0 0.75rem 0;
      }
      .phone-display {
        font-size: 1.6rem;
        font-weight: 700;
        color: var(--color-text);
        direction: ltr;
        margin-bottom: 1.25rem;
        letter-spacing: 1px;
      }
      .actions {
        display: flex;
        gap: 1rem;
        justify-content: center;
        flex-wrap: wrap;
      }
      .actions .btn {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        width: auto;
        padding: 0.65rem 1.25rem;
      }
      .btn {
        padding: 0.65rem 1.25rem;
        border-radius: 8px;
        text-decoration: none;
        font-weight: 600;
        font-size: 0.95rem;
        border: none;
        cursor: pointer;
        width: 100%;
      }
      .btn-call {
        background: var(--color-primary);
        color: #fff;
      }
      .btn-whatsapp {
        background: #25d366;
        color: #fff;
      }
      .btn-primary {
        background: var(--color-primary);
        color: #fff;
        margin-bottom: 0.75rem;
      }
      .btn-back {
        background: transparent;
        color: var(--color-text-muted);
        border: 1px solid var(--color-border);
      }
      .reject-note {
        background: #fff5f5;
        border-radius: 8px;
        padding: 1rem;
        color: var(--color-danger);
        margin-bottom: 1.5rem;
        text-align: right;
      }
      .reject-note p {
        margin: 0.4rem 0 0;
      }
    `,
  ],
})
export class PendingApprovalComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);
  protected readonly t = AR_TRANSLATIONS;

  status: OnboardingStatus | null = null;

  // Decision 15: the platform owner's official subscription contact
  subscriptionNumber = '+201055370118';
  whatsappNumber = '201055370118';
  numberDisplay = '01055370118';

  ngOnInit(): void {
    this.auth.whenReady().then(() => {
      if (!this.auth.isLoggedIn()) {
        this.router.navigate(['/auth/login'], { queryParams: { returnUrl: '/auth/pending' } });
        return;
      }
      this.api.getOnboardingStatus().subscribe({
        next: (s) => {
          this.status = s;
          this.cdr.markForCheck();
        },
        error: () => {
          this.status = {
            profile_complete: false,
            onboarding_state: 'merchant_applied',
            name: null,
            phone: null,
            address: null,
            merchant_application: { id: 0, business_name: '', status: 'pending', admin_note: null },
          };
          this.cdr.markForCheck();
        },
      });
    });
  }

  reapply(): void {
    this.router.navigate(['/auth/onboarding/business']);
  }

  goHome(): void {
    this.router.navigate(['/']);
  }
}
