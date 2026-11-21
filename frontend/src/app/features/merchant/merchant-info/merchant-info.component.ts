import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AR_TRANSLATIONS } from '../../../core/constants/translations';

@Component({
  selector: 'app-merchant-info',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="merchant-info-container">
      <div class="card">
        <div class="icon">🏪</div>
        <h2>{{ t.customer.merchantInquiry.title }}</h2>

        <div *ngIf="subscriptionNumber; else pendingBlock" class="contact-box">
          <div class="phone-display">{{ subscriptionNumber }}</div>
          <div class="actions">
            <a [href]="'tel:' + subscriptionNumber" class="btn btn-call">
              📞 {{ t.customer.merchantInquiry.callBtn }}
            </a>
            <a [href]="'https://wa.me/' + whatsappNumber" target="_blank" class="btn btn-whatsapp">
              💬 {{ t.customer.merchantInquiry.whatsappBtn }}
            </a>
          </div>
        </div>

        <ng-template #pendingBlock>
          <div class="pending-notice">
            <p>{{ t.customer.merchantInquiry.numberPending }}</p>
          </div>
        </ng-template>

        <button class="btn btn-back" (click)="goBack()">ارجع للرئيسية</button>
      </div>
    </div>
  `,
  styles: [
    `
      .merchant-info-container {
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
        font-size: 3rem;
        margin-bottom: 0.5rem;
      }
      h2 {
        font-family: var(--font-heading);
        color: var(--color-primary);
        margin: 0 0 1.5rem 0;
        font-size: 1.4rem;
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
        margin-bottom: 1.5rem;
      }
      .btn {
        padding: 0.65rem 1.25rem;
        border-radius: 8px;
        text-decoration: none;
        font-weight: 600;
        font-size: 0.95rem;
        border: none;
        cursor: pointer;
      }
      .btn-call {
        background: var(--color-primary);
        color: #fff;
      }
      .btn-whatsapp {
        background: #25d366;
        color: #fff;
      }
      .btn-back {
        background: transparent;
        color: var(--color-text-muted);
        border: 1px solid var(--color-border);
      }
      .pending-notice {
        padding: 1rem;
        background: #fff9e6;
        border-radius: 8px;
        color: #8c6200;
        margin-bottom: 1.5rem;
        font-weight: 500;
      }
    `,
  ],
})
export class MerchantInfoComponent {
  private readonly router = inject(Router);
  protected readonly t = AR_TRANSLATIONS;

  // Decision 15: Configured official subscription number
  subscriptionNumber = '+201055370118';
  whatsappNumber = '201055370118';

  goBack() {
    this.router.navigate(['/']);
  }
}
