import { ChangeDetectorRef, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AR_TRANSLATIONS } from '../../../core/constants/translations';
import { CartService } from '../../../core/services/cart.service';
import { AuthService } from '../../../core/services/auth.service';
import { ApiService, QuoteResponse } from '../../../core/services/api.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';

const IDEMPOTENCY_STORAGE_KEY = 'ordarat_checkout_idempotency_key';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="checkout-page">
      <!-- Empty cart -->
      <div class="checkout-card" *ngIf="cartItems().length === 0">
        <h2 class="title">{{ t.customer.cart.title }}</h2>
        <p class="empty-cart-text">{{ t.customer.cart.emptyCart }}</p>
        <button class="btn btn-submit" (click)="browseStores()">
          {{ t.customer.cart.browseStoresBtn }}
        </button>
      </div>

      <div class="checkout-card" *ngIf="cartItems().length > 0">
        <h2 class="title">{{ t.customer.checkout.title }}</h2>

        <!-- Cart review -->
        <div class="cart-review">
          <div class="cart-store-name">{{ storeName() }}</div>
          <div class="cart-line" *ngFor="let item of cartItems()">
            <span class="line-name">{{ item.name }}</span>
            <div class="qty-controls">
              <button type="button" class="qty-btn" (click)="changeQty(item.productId, -1)">
                <app-icon name="minus" [size]="14" />
              </button>
              <span class="qty-value">{{ item.quantity }}</span>
              <button type="button" class="qty-btn" (click)="changeQty(item.productId, 1)">
                <app-icon name="plus" [size]="14" />
              </button>
            </div>
            <span class="line-total">{{ item.price * item.quantity }} جنيه</span>
          </div>
        </div>

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

        <!-- Location sharing (Mandatory) -->
        <div class="location-box">
          <div class="loc-status" [class.success]="hasLocation">
            <span class="loc-line" *ngIf="hasLocation">
              <app-icon name="map-pin" [size]="16" />
              {{ t.customer.checkout.locationShared }}
            </span>
            <span class="loc-line" *ngIf="!hasLocation">
              <app-icon name="map-pin" [size]="16" />
              شارك موقعك لحساب رسوم التوصيل وتوجيه الطلب لأقرب فرع
            </span>
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

        <!-- Quote loading / error -->
        <div class="quote-status" *ngIf="isQuoting">جاري حساب رسوم التوصيل...</div>
        <div class="location-error-box" *ngIf="quoteError">
          <p>{{ quoteError }}</p>
          <button type="button" class="btn btn-location" (click)="fetchQuote()">جرّب تاني</button>
        </div>

        <!-- Closest Branch Notice -->
        <div class="branch-notice-box" *ngIf="hasLocation && quote() as q">
          <span class="branch-icon"><app-icon name="store" [size]="24" /></span>
          <div>
            <strong>{{
              t.customer.checkout.closestBranchNotice.replace('{branchName}', q.branch.name)
            }}</strong>
            <p class="branch-sub">يتم تحديد أقرب فرع لموقعك داخل قنا تلقائياً لسرعة التوصيل</p>
          </div>
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
            <span class="value">{{ itemsTotal() }} جنيه</span>
          </div>
          <div class="summary-row">
            <span>{{ t.customer.cart.deliveryFee }}</span>
            <span class="value" *ngIf="quote() as q">{{ q.delivery_fee }} جنيه</span>
            <span class="value-muted" *ngIf="!quote()">{{
              t.customer.cart.deliveryFeeNotice
            }}</span>
          </div>
          <div class="summary-row grand-total">
            <span>{{ t.customer.cart.grandTotal }}</span>
            <span class="total-value">{{ grandTotal() }} جنيه</span>
          </div>
          <div class="cod-tag">
            <app-icon name="banknote" [size]="16" />
            {{ t.customer.checkout.cashOnDeliveryNotice }}
          </div>
        </div>

        <!-- Submit error -->
        <div class="location-error-box" *ngIf="submitError">
          <p>{{ submitError }}</p>
        </div>

        <!-- Submit Button -->
        <button
          class="btn btn-submit"
          [disabled]="isSubmitting"
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
      .empty-cart-text {
        color: var(--color-text-muted);
        margin-bottom: 1.5rem;
      }
      .cart-review {
        background: #faf7f0;
        border-radius: 10px;
        padding: 1rem 1.25rem;
        margin-bottom: 1.5rem;
      }
      .cart-store-name {
        font-family: var(--font-heading);
        font-weight: 700;
        color: var(--color-primary);
        margin-bottom: 0.75rem;
      }
      .cart-line {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        padding: 0.4rem 0;
        border-bottom: 1px dashed var(--color-border);
        font-size: 0.92rem;
        flex-wrap: wrap;
      }
      .cart-line:last-child {
        border-bottom: none;
      }
      .line-name {
        flex: 1;
        min-width: 120px;
      }
      .qty-controls {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
      }
      .qty-btn {
        width: 26px;
        height: 26px;
        border-radius: 6px;
        border: 1px solid var(--color-border);
        background: #fff;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: var(--color-primary);
      }
      .qty-value {
        min-width: 20px;
        text-align: center;
        font-weight: 700;
      }
      .line-total {
        font-weight: 600;
        min-width: 70px;
        text-align: left;
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
      .loc-line {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
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
      .quote-status {
        color: var(--color-text-muted);
        font-size: 0.9rem;
        margin-bottom: 1rem;
        text-align: center;
      }
      .location-error-box {
        margin-top: 0.85rem;
        padding: 0.75rem;
        background: #fff0f0;
        border: 1px solid rgba(217, 56, 58, 0.2);
        border-radius: 6px;
        color: var(--color-danger);
        font-size: 0.85rem;
        text-align: center;
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
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.35rem;
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
        color: #2f855a;
      }
      .branch-sub {
        margin: 0.2rem 0 0;
        font-size: 0.8rem;
        color: #276749;
      }
      @media (max-width: 480px) {
        .checkout-card {
          padding: 1.25rem 1rem;
        }
        .title {
          font-size: 1.35rem;
        }
      }
    `,
  ],
})
export class CheckoutComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly cart = inject(CartService);
  private readonly api = inject(ApiService);
  protected readonly auth = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);
  protected readonly t = AR_TRANSLATIONS;

  name = '';
  phone = '';
  notes = '';
  showErrors = false;
  isLocating = false;
  isSubmitting = false;
  isQuoting = false;
  hasLocation = false;
  locationError = '';
  quoteError = '';
  submitError = '';

  readonly quote = signal<QuoteResponse | null>(null);
  private latitude = 0;
  private longitude = 0;
  private idempotencyKey = '';

  readonly cartItems = computed(() => this.cart.items());
  readonly itemsTotal = computed(() => this.cart.itemsTotal());
  readonly storeName = computed(() => this.cart.storeName());
  readonly grandTotal = computed(() => {
    const q = this.quote();
    if (q) {
      return q.grand_total;
    }
    return this.itemsTotal();
  });

  ngOnInit(): void {
    this.idempotencyKey = this.loadOrCreateIdempotencyKey();

    // Prefill name/phone from the confirmed profile when available.
    this.auth.whenReady().then(() => {
      const profile = this.auth.profile();
      if (profile) {
        if (!this.name && profile.name) {
          this.name = profile.name;
        }
        if (!this.phone && profile.phone) {
          this.phone = profile.phone;
        }
      }
    });
  }

  changeQty(productId: number | string, delta: number): void {
    this.cart.updateQuantity(productId, delta);
    // Cart changed: old quote no longer valid.
    this.quote.set(null);
    if (this.hasLocation && this.cartItems().length > 0) {
      this.fetchQuote();
    }
  }

  isEgyptianPhoneValid(phone: string): boolean {
    return /^01[0125][0-9]{8}$/.test(phone);
  }

  requestLocation(): void {
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
        this.latitude = pos.coords.latitude;
        this.longitude = pos.coords.longitude;
        this.cdr.markForCheck();
        this.fetchQuote();
      },
      () => {
        this.isLocating = false;
        this.locationError = this.t.customer.geolocation.denied;
        this.cdr.markForCheck();
      },
      { timeout: 10000, enableHighAccuracy: true },
    );
  }

  fetchQuote(): void {
    const storeId = this.cart.storeId();
    if (!this.hasLocation || !storeId || this.cartItems().length === 0) {
      return;
    }

    this.isQuoting = true;
    this.quoteError = '';
    this.api
      .quote({
        store_id: Number(storeId),
        items: this.cartItems().map((i) => ({
          product_id: Number(i.productId),
          quantity: i.quantity,
        })),
        delivery_latitude: this.latitude,
        delivery_longitude: this.longitude,
      })
      .subscribe({
        next: (quote) => {
          this.quote.set(quote);
          this.isQuoting = false;
          this.cdr.markForCheck();
        },
        error: (err: { message?: string }) => {
          this.quote.set(null);
          this.quoteError = err?.message || 'تعذر حساب رسوم التوصيل. حاول مرة تانية';
          this.isQuoting = false;
          this.cdr.markForCheck();
        },
      });
  }

  async submitOrder(): Promise<void> {
    this.showErrors = true;
    this.submitError = '';

    if (!this.name || !this.isEgyptianPhoneValid(this.phone) || !this.hasLocation) {
      return;
    }
    const storeId = this.cart.storeId();
    if (!storeId || this.cartItems().length === 0) {
      return;
    }

    // Submitting an order requires a confirmed account.
    await this.auth.whenReady();
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl: '/customer/checkout' },
      });
      return;
    }

    this.isSubmitting = true;
    this.api
      .checkout({
        store_id: Number(storeId),
        items: this.cartItems().map((i) => ({
          product_id: Number(i.productId),
          quantity: i.quantity,
        })),
        delivery_latitude: this.latitude,
        delivery_longitude: this.longitude,
        phone: this.phone,
        customer_notes: this.notes || null,
        idempotency_key: this.idempotencyKey,
      })
      .subscribe({
        next: (order) => {
          this.isSubmitting = false;
          this.cdr.markForCheck();
          this.cart.clearCart();
          this.resetIdempotencyKey();
          this.router.navigate(['/customer/orders', order.id]);
        },
        error: (err: { message?: string; kind?: string }) => {
          this.isSubmitting = false;
          if (err?.kind === 'auth') {
            this.router.navigate(['/auth/login'], {
              queryParams: { returnUrl: '/customer/checkout' },
            });
            return;
          }
          this.submitError = err?.message || 'تعذر إرسال الطلب. حاول مرة تانية';
          this.cdr.markForCheck();
        },
      });
  }

  browseStores(): void {
    this.router.navigate(['/customer/stores']);
  }

  private loadOrCreateIdempotencyKey(): string {
    try {
      const existing = localStorage.getItem(IDEMPOTENCY_STORAGE_KEY);
      if (existing) {
        return existing;
      }
      const key =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `ord-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(IDEMPOTENCY_STORAGE_KEY, key);
      return key;
    } catch {
      return `ord-${Date.now()}`;
    }
  }

  private resetIdempotencyKey(): void {
    try {
      localStorage.removeItem(IDEMPOTENCY_STORAGE_KEY);
    } catch {
      // ignore storage errors
    }
  }
}
