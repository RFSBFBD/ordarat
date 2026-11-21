import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AR_TRANSLATIONS } from '../../../core/constants/translations';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="checkout-page">
      <div class="checkout-card">
        <h2 class="title">{{ t.customer.checkout.title }}</h2>

        <!-- Form fields -->
        <div class="form-group">
          <label class="label">{{ t.customer.checkout.nameLabel }} *</label>
          <input
            type="text"
            [(ngModel)]="name"
            class="input-field"
            [placeholder]="t.customer.checkout.namePlaceholder"
          />
          <span *ngIf="showErrors && !name" class="error-text">
            {{ t.customer.checkout.nameRequired }}
          </span>
        </div>

        <div class="form-group">
          <label class="label">{{ t.customer.checkout.phoneLabel }} *</label>
          <input
            type="tel"
            [(ngModel)]="phone"
            class="input-field"
            placeholder="01012345678"
            maxlength="11"
          />
          <span *ngIf="showErrors && !isEgyptianPhoneValid(phone)" class="error-text">
            {{ t.customer.checkout.phoneInvalid }}
          </span>
        </div>

        <!-- Location sharing (Mandatory Decision 13) -->
        <div class="location-box">
          <div class="loc-status" [class.success]="hasLocation">
            <span *ngIf="hasLocation">📍 {{ t.customer.checkout.locationShared }}</span>
            <span *ngIf="!hasLocation"
              >📍 شارك موقعك لحساب رسوم التوصيل وتوجيه الطلب لأقرب فرع</span
            >
          </div>

          <button
            type="button"
            class="btn btn-location"
            [disabled]="isLocating"
            (click)="requestLocation()"
          >
            {{ isLocating ? t.customer.geolocation.locating : t.customer.checkout.locationBtn }}
          </button>

          <div *ngIf="locationError" class="location-error-box">
            <p>{{ locationError }}</p>
            <small>{{ t.customer.geolocation.deniedHelp }}</small>
          </div>
        </div>

        <!-- Closest Branch Notice -->
        <div class="branch-notice-box" *ngIf="hasLocation && assignedBranch && !allBranchesClosed">
          <span class="branch-icon">🏬</span>
          <div>
            <strong>{{
              t.customer.checkout.closestBranchNotice.replace('{branchName}', assignedBranch.name)
            }}</strong>
            <p class="branch-sub">يتم تحديد أقرب فرع لموقعك داخل قنا تلقائياً لسرعة التوصيل</p>
          </div>
        </div>

        <!-- All branches closed alert (Rule 5) -->
        <div class="closed-store-alert" *ngIf="allBranchesClosed">
          ⚠️ <strong>{{ t.customer.checkout.allBranchesClosedError }}</strong>
        </div>

        <div class="form-group">
          <label class="label">{{ t.customer.checkout.notesLabel }}</label>
          <textarea
            [(ngModel)]="notes"
            class="input-field textarea"
            [placeholder]="t.customer.checkout.notesPlaceholder"
            rows="3"
          ></textarea>
        </div>

        <!-- Order Summary -->
        <div class="summary-box">
          <div class="summary-row">
            <span>{{ t.customer.cart.productsTotal }}</span>
            <span class="value">{{ itemsTotal }} جنيه</span>
          </div>
          <div class="summary-row">
            <span>{{ t.customer.cart.deliveryFee }}</span>
            <span class="value" *ngIf="hasLocation">{{ deliveryFee }} جنيه</span>
            <span class="value-muted" *ngIf="!hasLocation">{{
              t.customer.cart.deliveryFeeNotice
            }}</span>
          </div>
          <div class="summary-row grand-total">
            <span>{{ t.customer.cart.grandTotal }}</span>
            <span class="total-value">{{ grandTotal }} جنيه</span>
          </div>
          <div class="cod-tag">💵 {{ t.customer.checkout.cashOnDeliveryNotice }}</div>
        </div>

        <!-- Submit Button -->
        <button
          class="btn btn-submit"
          [disabled]="isSubmitting || allBranchesClosed"
          (click)="submitOrder()"
        >
          {{ isSubmitting ? t.customer.checkout.sendingOrder : t.customer.checkout.submitOrderBtn }}
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .checkout-page {
        max-width: 640px;
        margin: 0 auto;
      }
      .checkout-card {
        background: #ffffff;
        border-radius: 14px;
        padding: 2rem;
        border: 1px solid var(--color-border);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
      }
      .title {
        font-family: var(--font-heading);
        color: var(--color-primary);
        margin-top: 0;
        margin-bottom: 1.5rem;
        font-size: 1.6rem;
      }
      .form-group {
        margin-bottom: 1.25rem;
      }
      .label {
        display: block;
        margin-bottom: 0.35rem;
        font-weight: 600;
        color: var(--color-text);
        font-size: 0.95rem;
      }
      .input-field {
        width: 100%;
        padding: 0.75rem 0.95rem;
        border: 1.5px solid var(--color-border);
        border-radius: 8px;
        font-family: var(--font-body);
        font-size: 0.95rem;
        color: var(--color-text);
        outline: none;
        box-sizing: border-box;
        transition: border-color 0.2s;
      }
      .input-field:focus {
        border-color: var(--color-primary);
      }
      .textarea {
        resize: vertical;
      }
      .error-text {
        color: var(--color-danger);
        font-size: 0.8rem;
        margin-top: 4px;
        display: block;
      }
      .location-box {
        background: #fdfbf7;
        border: 1px dashed var(--color-border);
        border-radius: 10px;
        padding: 1.25rem;
        margin-bottom: 1.25rem;
        text-align: center;
      }
      .loc-status {
        font-size: 0.9rem;
        color: var(--color-text-muted);
        margin-bottom: 0.85rem;
      }
      .loc-status.success {
        color: var(--color-success);
        font-weight: 600;
      }
      .btn-location {
        background: var(--color-primary);
        color: #ffffff;
        border: none;
        padding: 0.6rem 1.25rem;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
      }
      .location-error-box {
        margin-top: 0.85rem;
        padding: 0.75rem;
        background: #fff0f0;
        border: 1px solid rgba(217, 56, 58, 0.2);
        border-radius: 6px;
        color: var(--color-danger);
        font-size: 0.85rem;
        text-align: right;
      }
      .summary-box {
        background: #faf7f0;
        border-radius: 10px;
        padding: 1.25rem;
        margin: 1.5rem 0;
      }
      .summary-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 0.6rem;
        font-size: 0.95rem;
      }
      .grand-total {
        border-top: 1px dashed var(--color-border);
        padding-top: 0.75rem;
        margin-top: 0.75rem;
        font-weight: 700;
        font-size: 1.15rem;
      }
      .total-value {
        color: var(--color-primary);
      }
      .value-muted {
        font-size: 0.8rem;
        color: var(--color-text-muted);
      }
      .cod-tag {
        margin-top: 0.85rem;
        text-align: center;
        font-size: 0.85rem;
        color: #2d3748;
        font-weight: 600;
      }
      .btn-submit {
        width: 100%;
        background: var(--color-accent);
        color: #1e2a2f;
        border: none;
        padding: 0.85rem;
        border-radius: 8px;
        font-size: 1.1rem;
        font-weight: 700;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(245, 179, 53, 0.3);
      }
      .btn-submit:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        box-shadow: none;
      }
      .branch-notice-box {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        background: #f0fff4;
        border: 1px solid #9ae6b4;
        border-radius: 8px;
        padding: 0.85rem 1rem;
        margin-bottom: 1.25rem;
        color: #22543d;
      }
      .branch-icon {
        font-size: 1.5rem;
      }
      .branch-sub {
        margin: 0.2rem 0 0;
        font-size: 0.8rem;
        color: #276749;
      }
      .closed-store-alert {
        background: #fff5f5;
        border: 1.5px solid #feb2b2;
        border-radius: 8px;
        padding: 1rem;
        margin-bottom: 1.25rem;
        color: #c53030;
        font-size: 0.95rem;
        text-align: center;
      }
    `,
  ],
})
export class CheckoutComponent {
  private readonly router = inject(Router);
  protected readonly t = AR_TRANSLATIONS;

  name = '';
  phone = '';
  notes = '';
  showErrors = false;
  isLocating = false;
  isSubmitting = false;
  hasLocation = false;
  locationError = '';
  assignedBranch: { id: number; name: string } | null = { id: 1, name: 'فرع وسط البلد' };
  allBranchesClosed = false;

  itemsTotal = 120;
  deliveryFee = 15;

  get grandTotal() {
    return this.itemsTotal + (this.hasLocation ? this.deliveryFee : 0);
  }

  isEgyptianPhoneValid(phone: string): boolean {
    return /^01[0125][0-9]{8}$/.test(phone);
  }

  requestLocation() {
    if (!navigator.geolocation) {
      this.locationError = this.t.customer.geolocation.unsupported;
      return;
    }
    this.isLocating = true;
    this.locationError = '';

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.isLocating = false;
        this.hasLocation = true;
      },
      (err) => {
        this.isLocating = false;
        this.locationError = this.t.customer.geolocation.denied;
      },
      { timeout: 10000, enableHighAccuracy: true },
    );
  }

  submitOrder() {
    if (this.allBranchesClosed) {
      return;
    }
    this.showErrors = true;
    if (!this.name || !this.isEgyptianPhoneValid(this.phone) || !this.hasLocation) {
      return;
    }

    this.isSubmitting = true;
    setTimeout(() => {
      this.isSubmitting = false;
      this.router.navigate(['/customer/orders/101']);
    }, 1000);
  }
}
