import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AR_TRANSLATIONS } from '../../../core/constants/translations';

@Component({
  selector: 'app-order-tracking',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="tracking-page">
      <div class="tracking-card">
        <h2 class="order-id">متابعة الطلب #{{ orderId }}</h2>
        <span class="city-notice">مدينة قنا</span>

        <!-- Status Timeline -->
        <div class="status-box">
          <div class="status-indicator">
            <div class="pulse-dot"></div>
            <span class="current-status">{{ currentStatusText }}</span>
          </div>
          <span class="last-updated">آخر تحديث: منذ لحظات</span>
        </div>

        <div class="steps-progress">
          <div class="step" [class.done]="isStepDone(1)">
            <span class="step-num">١</span>
            <span class="step-label">جديد</span>
          </div>
          <div class="step" [class.done]="isStepDone(2)">
            <span class="step-num">٢</span>
            <span class="step-label">مقبول</span>
          </div>
          <div class="step" [class.done]="isStepDone(3)">
            <span class="step-num">٣</span>
            <span class="step-label">بيتحضّر</span>
          </div>
          <div class="step" [class.done]="isStepDone(4)">
            <span class="step-num">٤</span>
            <span class="step-label">خرج للتوصيل</span>
          </div>
          <div class="step" [class.done]="isStepDone(5)">
            <span class="step-num">٥</span>
            <span class="step-label">اتسلّم</span>
          </div>
        </div>

        <!-- Order Summary Detail -->
        <div class="order-details-box">
          <h4 class="details-title">تفاصيل الطلب</h4>
          <div class="detail-row">
            <span>المحل:</span>
            <strong>مطعم الكرنك</strong>
          </div>
          <div class="detail-row">
            <span>طريقة الدفع:</span>
            <strong>كاش عند الاستلام (COD)</strong>
          </div>
          <div class="detail-row">
            <span>الإجمالي:</span>
            <strong class="price">١٣٥ جنيه</strong>
          </div>
        </div>

        <button class="btn btn-home" (click)="goHome()">الرجوع للرئيسية</button>
      </div>
    </div>
  `,
  styles: [
    `
      .tracking-page {
        max-width: 600px;
        margin: 0 auto;
      }
      .tracking-card {
        background: #ffffff;
        border-radius: 14px;
        padding: 2rem 1.5rem;
        border: 1px solid var(--color-border);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
        text-align: center;
      }
      .order-id {
        font-family: var(--font-heading);
        color: var(--color-primary);
        margin: 0;
        font-size: 1.6rem;
      }
      .city-notice {
        display: inline-block;
        margin-top: 0.25rem;
        font-size: 0.8rem;
        color: var(--color-text-muted);
      }
      .status-box {
        margin: 1.75rem 0;
        padding: 1.25rem;
        background: #f4efe6;
        border-radius: 10px;
      }
      .status-indicator {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        margin-bottom: 0.35rem;
      }
      .pulse-dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: var(--color-accent);
        animation: pulse 1.5s infinite;
      }
      @keyframes pulse {
        0% {
          transform: scale(0.95);
          box-shadow: 0 0 0 0 rgba(245, 179, 53, 0.7);
        }
        70% {
          transform: scale(1.1);
          box-shadow: 0 0 0 8px rgba(245, 179, 53, 0);
        }
        100% {
          transform: scale(0.95);
          box-shadow: 0 0 0 0 rgba(245, 179, 53, 0);
        }
      }
      .current-status {
        font-family: var(--font-heading);
        font-size: 1.25rem;
        font-weight: 700;
        color: var(--color-text);
      }
      .last-updated {
        font-size: 0.8rem;
        color: var(--color-text-muted);
      }
      .steps-progress {
        display: flex;
        justify-content: space-between;
        margin: 2rem 0;
        position: relative;
      }
      .step {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.35rem;
        z-index: 1;
      }
      .step-num {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: #e2d9c5;
        color: #1e2a2f;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 0.9rem;
      }
      .step.done .step-num {
        background: var(--color-primary);
        color: #ffffff;
      }
      .step-label {
        font-size: 0.75rem;
        color: var(--color-text-muted);
      }
      .step.done .step-label {
        color: var(--color-primary);
        font-weight: 600;
      }
      .order-details-box {
        text-align: right;
        background: #faf8f2;
        border: 1px solid var(--color-border);
        border-radius: 8px;
        padding: 1rem;
        margin-bottom: 1.5rem;
      }
      .details-title {
        margin: 0 0 0.75rem 0;
        font-family: var(--font-heading);
      }
      .detail-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 0.5rem;
        font-size: 0.9rem;
      }
      .price {
        color: var(--color-primary);
      }
      .btn-home {
        background: transparent;
        border: 1px solid var(--color-border);
        padding: 0.65rem 1.5rem;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 600;
      }
    `,
  ],
})
export class OrderTrackingComponent {
  private readonly router = inject(Router);
  protected readonly t = AR_TRANSLATIONS;

  orderId = '101';
  currentStep = 2; // accepted

  get currentStatusText(): string {
    return this.t.customer.orderTracking.statusAccepted;
  }

  isStepDone(step: number): boolean {
    return step <= this.currentStep;
  }

  goHome() {
    this.router.navigate(['/']);
  }
}
