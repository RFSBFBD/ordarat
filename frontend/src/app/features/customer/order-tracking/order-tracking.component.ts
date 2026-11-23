import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AR_TRANSLATIONS } from '../../../core/constants/translations';
import { ApiService, ApiOrder } from '../../../core/services/api.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';

const STATUS_FLOW = ['new', 'accepted', 'preparing', 'out_for_delivery', 'delivered'] as const;

@Component({
  selector: 'app-order-tracking',
  standalone: true,
  imports: [CommonModule, IconComponent, LoadingStateComponent, ErrorStateComponent],
  template: `
    <div class="tracking-page">
      <div class="tracking-card">
        <h2 class="title">{{ pageTitle }}</h2>

        <app-loading-state *ngIf="loading" message="بنحمّل حالة طلبك..."></app-loading-state>

        <app-error-state
          *ngIf="!loading && loadError"
          [message]="loadError"
          (retry)="loadOrder()"
        ></app-error-state>

        <ng-container *ngIf="!loading && !loadError && order">
          <!-- Status box -->
          <div class="status-box" [class.cancelled]="isCancelled()">
            <div class="status-indicator">
              <app-icon [name]="statusIcon()" [size]="40" />
              <span class="current-status">{{ currentStatusText }}</span>
            </div>
            <p class="last-updated" *ngIf="lastUpdatedText">{{ lastUpdatedText }}</p>
            <p class="rejection" *ngIf="rejectionText">{{ rejectionText }}</p>
          </div>

          <!-- Progress steps -->
          <div class="steps" *ngIf="!isCancelled()">
            <div
              class="step"
              *ngFor="let step of steps; let i = index"
              [class.done]="i <= currentStepIndex"
              [class.current]="i === currentStepIndex"
            >
              <div class="step-dot">
                <app-icon *ngIf="i < currentStepIndex" name="check" [size]="14" />
              </div>
              <span class="step-label">{{ step.label }}</span>
            </div>
          </div>

          <!-- Order details -->
          <div class="details-box">
            <div class="detail-row">
              <span>المتجر</span>
              <strong>{{ order.store?.name }}</strong>
            </div>
            <div class="detail-row" *ngIf="order.branch">
              <span>الفرع</span>
              <strong>{{ order.branch?.name }}</strong>
            </div>
            <div class="detail-row">
              <span>الدفع</span>
              <strong>كاش عند الاستلام</strong>
            </div>
            <div class="detail-row total">
              <span>الإجمالي</span>
              <strong>{{ order.grand_total }} جنيه</strong>
            </div>
          </div>

          <div class="items-box" *ngIf="orderItems.length > 0">
            <div class="item-row" *ngFor="let item of orderItems">
              <span>{{ item.product_name }} × {{ item.quantity }}</span>
              <span>{{ item.subtotal }} جنيه</span>
            </div>
          </div>

          <button class="btn btn-refresh" (click)="loadOrder()">
            <app-icon name="refresh-cw" [size]="16" />
            تحديث الحالة
          </button>

          <button class="btn btn-home" (click)="goHome()">الرئيسية</button>
        </ng-container>
      </div>
    </div>
  `,
  styles: [
    `
      .tracking-page {
        max-width: 560px;
        margin: 0 auto;
      }
      .tracking-card {
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
        font-size: 1.4rem;
        text-align: center;
      }
      .status-box {
        background: #f0f7f9;
        border-radius: 10px;
        padding: 1.5rem;
        text-align: center;
        margin-bottom: 1.5rem;
      }
      .status-box.cancelled {
        background: #fff5f5;
      }
      .status-indicator {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.6rem;
        color: var(--color-primary);
      }
      .status-box.cancelled .status-indicator {
        color: var(--color-danger);
      }
      .current-status {
        font-family: var(--font-heading);
        font-size: 1.25rem;
        font-weight: 700;
      }
      .last-updated {
        font-size: 0.8rem;
        color: var(--color-text-muted);
        margin: 0.5rem 0 0;
      }
      .rejection {
        color: var(--color-danger);
        font-size: 0.9rem;
        margin: 0.5rem 0 0;
      }
      .steps {
        display: flex;
        justify-content: space-between;
        margin-bottom: 1.5rem;
      }
      .step {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.35rem;
        flex: 1;
        color: var(--color-text-muted);
      }
      .step-dot {
        width: 26px;
        height: 26px;
        border-radius: 50%;
        border: 2px solid var(--color-border);
        display: flex;
        align-items: center;
        justify-content: center;
        background: #fff;
        color: #fff;
      }
      .step.done .step-dot {
        background: var(--color-primary);
        border-color: var(--color-primary);
      }
      .step.current .step-dot {
        border-color: var(--color-primary);
        box-shadow: 0 0 0 3px rgba(14, 90, 107, 0.2);
      }
      .step.done {
        color: var(--color-primary);
        font-weight: 600;
      }
      .step-label {
        font-size: 0.72rem;
        text-align: center;
      }
      .details-box,
      .items-box {
        background: #faf7f0;
        border-radius: 10px;
        padding: 1rem 1.25rem;
        margin-bottom: 1rem;
      }
      .detail-row,
      .item-row {
        display: flex;
        justify-content: space-between;
        padding: 0.3rem 0;
        font-size: 0.92rem;
      }
      .detail-row.total {
        border-top: 1px dashed var(--color-border);
        padding-top: 0.6rem;
        margin-top: 0.4rem;
        font-size: 1.05rem;
      }
      .btn {
        width: 100%;
        padding: 0.75rem;
        border-radius: 8px;
        font-weight: 700;
        cursor: pointer;
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.4rem;
      }
      .btn-refresh {
        background: var(--color-primary);
        color: #fff;
        margin-bottom: 0.6rem;
      }
      .btn-home {
        background: transparent;
        color: var(--color-text-muted);
        border: 1px solid var(--color-border);
      }
      @media (max-width: 480px) {
        .tracking-card {
          padding: 1.25rem 1rem;
        }
      }
    `,
  ],
})
export class OrderTrackingComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  protected readonly t = AR_TRANSLATIONS;

  order: ApiOrder | null = null;
  loading = true;
  loadError = '';
  pageTitle = '';

  private orderId = 0;
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  readonly steps = [
    { key: 'new', label: 'استلام الطلب' },
    { key: 'accepted', label: 'اتقبل' },
    { key: 'preparing', label: 'بيتحضّر' },
    { key: 'out_for_delivery', label: 'خرج للتوصيل' },
    { key: 'delivered', label: 'اتسلّم' },
  ];

  get currentStepIndex(): number {
    if (!this.order) {
      return 0;
    }
    const idx = STATUS_FLOW.indexOf(this.order.status as (typeof STATUS_FLOW)[number]);
    return idx >= 0 ? idx : 0;
  }

  get currentStatusText(): string {
    if (!this.order) {
      return '';
    }
    const tr = this.t.customer.orderTracking;
    switch (this.order.status) {
      case 'new':
        return tr.statusNew;
      case 'accepted':
        return tr.statusAccepted;
      case 'preparing':
        return tr.statusPreparing;
      case 'out_for_delivery':
        return tr.statusOutForDelivery;
      case 'delivered':
        return tr.statusDelivered;
      case 'cancelled':
        return tr.statusCancelled;
      case 'rejected':
        return tr.statusRejected;
      default:
        return this.order.status;
    }
  }

  get lastUpdatedText(): string {
    const history = this.order?.status_history ?? this.order?.statusHistory ?? [];
    if (history.length === 0) {
      return '';
    }
    const latest = history[history.length - 1];
    return this.t.customer.orderTracking.lastUpdated.replace(
      '{time}',
      new Date(latest.created_at).toLocaleString('ar-EG'),
    );
  }

  get rejectionText(): string {
    if (!this.order || (this.order.status !== 'rejected' && this.order.status !== 'cancelled')) {
      return '';
    }
    const reason = (this.order as { rejection_reason?: string | null }).rejection_reason;
    return reason ? this.t.customer.orderTracking.rejectionReason.replace('{reason}', reason) : '';
  }

  get orderItems() {
    return this.order?.items ?? [];
  }

  ngOnInit(): void {
    this.orderId = Number(this.route.snapshot.paramMap.get('id'));
    this.pageTitle = this.t.customer.orderTracking.title.replace('{id}', String(this.orderId));
    this.loadOrder();

    // Light polling so the customer sees the store's progress live.
    this.pollTimer = setInterval(() => this.loadOrder(true), 30000);
  }

  ngOnDestroy(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
    }
  }

  isCancelled(): boolean {
    return this.order?.status === 'cancelled' || this.order?.status === 'rejected';
  }

  statusIcon(): string {
    switch (this.order?.status) {
      case 'delivered':
        return 'check';
      case 'out_for_delivery':
        return 'bike';
      case 'preparing':
        return 'chef-hat';
      case 'cancelled':
      case 'rejected':
        return 'circle-x';
      default:
        return 'clock';
    }
  }

  loadOrder(silent = false): void {
    if (!silent) {
      this.loading = true;
    }
    this.loadError = '';
    this.api.getOrder(this.orderId, { silent }).subscribe({
      next: (order) => {
        this.order = order;
        this.pageTitle = this.t.customer.orderTracking.title.replace('{id}', order.order_number);
        this.loading = false;
        if (['delivered', 'cancelled', 'rejected'].includes(order.status) && this.pollTimer) {
          clearInterval(this.pollTimer);
          this.pollTimer = null;
        }
        this.cdr.markForCheck();
      },
      error: (err: { message?: string }) => {
        // A failed background refresh must not wipe a healthy order view;
        // only block the page when there is nothing to show yet.
        if (!silent || !this.order) {
          this.loadError = err?.message || this.t.customer.orderTracking.refreshFailed;
        }
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  goHome(): void {
    this.router.navigate(['/']);
  }
}
