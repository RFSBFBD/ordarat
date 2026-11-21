import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AR_TRANSLATIONS } from '../../../core/constants/translations';

export interface BranchOrder {
  id: number;
  orderNumber: string;
  branchId: number;
  branchName: string;
  storeName: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  zoneName: string;
  notes?: string;
  status:
    'new' | 'accepted' | 'preparing' | 'out_for_delivery' | 'delivered' | 'rejected' | 'cancelled';
  timeAgo: string;
  itemsTotal: number;
  deliveryFee: number;
  grandTotal: number;
  items: Array<{ name: string; quantity: number; price: number }>;
}

@Component({
  selector: 'app-branch-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="branch-dashboard">
      <!-- Header -->
      <div class="dash-header">
        <div class="branch-info-block">
          <div class="title-row">
            <h2 class="title">{{ currentBranch.name }}</h2>
            <span class="role-badge">مسؤول الفرع</span>
          </div>
          <p class="store-name">📍 {{ currentBranch.storeName }} - مدينة قنا</p>
          <div class="working-hours-tag">
            ⏰ <strong>مواعيد العمل:</strong> {{ currentBranch.working_hours.open }} إلى
            {{ currentBranch.working_hours.close }}
          </div>
        </div>

        <div class="header-actions">
          <button
            class="sound-toggle-btn"
            [class.sound-on]="soundEnabled()"
            (click)="toggleSound()"
          >
            {{ soundEnabled() ? '🔔 صوت التنبيه مفعّل' : '🔕 صوت التنبيه مكتوم' }}
          </button>

          <div class="toggle-wrap">
            <span class="status-label">{{ t.branch.receivingOrders }}:</span>
            <button
              class="toggle-btn"
              [class.active]="currentBranch.is_accepting_orders"
              (click)="toggleReceiving()"
            >
              {{ currentBranch.is_accepting_orders ? 'مفتوح للطلبات' : 'مغلق مؤقتاً' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Warning if closed -->
      <div class="alert-banner warning" *ngIf="!currentBranch.is_accepting_orders">
        ⚠️ <strong>تنبيه:</strong> تم إيقاف استقبال الطلبات لهذا الفرع. لن يتم توجيه أي طلبات جديدة
        للفرع من النظام حتى إعادة التفعيل.
      </div>

      <!-- Stats Grid -->
      <div class="stats-grid">
        <div class="stat-card alert-stat" [class.has-new]="newOrdersCount() > 0">
          <span class="stat-num">{{ newOrdersCount() }}</span>
          <span class="stat-label">طلبات الفرع الجديدة</span>
        </div>
        <div class="stat-card">
          <span class="stat-num">{{ activeOrdersCount() }}</span>
          <span class="stat-label">قيد التحضير والتوصيل</span>
        </div>
        <div class="stat-card">
          <span class="stat-num">{{ completedOrdersCount() }}</span>
          <span class="stat-label">طلبات مكتملة اليوم</span>
        </div>
        <div class="stat-card">
          <span class="stat-num">{{ todayCashTotal() }} ج.م</span>
          <span class="stat-label">كاش تم تحصيله بالفرع</span>
        </div>
      </div>

      <!-- Orders Section -->
      <div class="orders-section">
        <div class="section-top">
          <h3>طلبات الفرع المباشرة ({{ filteredOrders().length }})</h3>
          <div class="filter-pills">
            <button
              class="pill-btn"
              [class.active]="orderFilter === 'all'"
              (click)="orderFilter = 'all'"
            >
              {{ t.branch.filters.all }}
            </button>
            <button
              class="pill-btn"
              [class.active]="orderFilter === 'new'"
              (click)="orderFilter = 'new'"
            >
              {{ t.branch.filters.new }} ({{ newOrdersCount() }})
            </button>
            <button
              class="pill-btn"
              [class.active]="orderFilter === 'in_progress'"
              (click)="orderFilter = 'in_progress'"
            >
              {{ t.branch.filters.inProgress }}
            </button>
            <button
              class="pill-btn"
              [class.active]="orderFilter === 'delivered'"
              (click)="orderFilter = 'delivered'"
            >
              {{ t.branch.filters.delivered }}
            </button>
          </div>
        </div>

        <!-- Orders Cards List -->
        <div class="orders-cards-list" *ngIf="filteredOrders().length > 0">
          <div
            class="order-card"
            *ngFor="let ord of filteredOrders()"
            [class.order-new]="ord.status === 'new'"
          >
            <div class="order-card-header">
              <div class="order-id-wrap">
                <span class="order-num">{{ ord.orderNumber }}</span>
                <span class="order-time">{{ ord.timeAgo }}</span>
                <span class="branch-pill">📍 {{ ord.branchName }}</span>
              </div>
              <span class="badge" [ngClass]="'badge-' + ord.status">{{
                getStatusLabel(ord.status)
              }}</span>
            </div>

            <div class="customer-info-box">
              <p class="customer-name"><strong>العميل:</strong> {{ ord.customerName }}</p>
              <p class="customer-phone" dir="ltr">📞 {{ ord.customerPhone }}</p>
              <p class="customer-address">📍 {{ ord.deliveryAddress }} ({{ ord.zoneName }})</p>
              <p class="customer-notes" *ngIf="ord.notes">
                📝 <em>ملاحظة العميل: {{ ord.notes }}</em>
              </p>
            </div>

            <div class="items-list-box">
              <div class="order-item-row" *ngFor="let item of ord.items">
                <span>{{ item.quantity }}x {{ item.name }}</span>
                <strong>{{ item.price * item.quantity }} ج.م</strong>
              </div>
              <div class="order-totals-summary">
                <span>المجموع: {{ ord.itemsTotal }} ج.م + توصيل: {{ ord.deliveryFee }} ج.م</span>
                <span class="grand-total"
                  >الإجمالي: {{ ord.grandTotal }} ج.م (كاش عند الاستلام)</span
                >
              </div>
            </div>

            <!-- Lifecycle Action Buttons for Branch Manager -->
            <div class="order-actions-bar">
              <button
                *ngIf="ord.status === 'new'"
                class="btn btn-success"
                (click)="updateOrderStatus(ord, 'accepted')"
              >
                ✅ {{ t.branch.actions.accept }}
              </button>
              <button
                *ngIf="ord.status === 'new'"
                class="btn btn-danger-outline"
                (click)="openRejectModal(ord)"
              >
                ❌ {{ t.branch.actions.reject }}
              </button>

              <button
                *ngIf="ord.status === 'accepted'"
                class="btn btn-primary"
                (click)="updateOrderStatus(ord, 'preparing')"
              >
                🍳 {{ t.branch.actions.prepare }}
              </button>

              <button
                *ngIf="ord.status === 'preparing'"
                class="btn btn-warning"
                (click)="updateOrderStatus(ord, 'out_for_delivery')"
              >
                🛵 {{ t.branch.actions.dispatch }}
              </button>

              <button
                *ngIf="ord.status === 'out_for_delivery'"
                class="btn btn-success"
                (click)="updateOrderStatus(ord, 'delivered')"
              >
                📦 {{ t.branch.actions.deliver }}
              </button>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div class="empty-orders-state" *ngIf="filteredOrders().length === 0">
          <div class="empty-icon">📭</div>
          <h4>{{ t.branch.emptyOrders }}</h4>
          <p>أي طلب يتم توجيهه لأقرب فرع للعميل سيظهر هنا فوراً مع تنبيه صوتي.</p>
        </div>
      </div>

      <!-- MODAL: REJECT ORDER -->
      <div class="modal-backdrop" *ngIf="selectedOrderForRejection()">
        <div class="modal-dialog">
          <h4>اعتذار عن استلام الطلب #{{ selectedOrderForRejection()?.orderNumber }}</h4>
          <p class="modal-desc">
            يرجى توضيح سبب الرفض ليتم إخطار العميل وصاحب النشاط في سجل الطلب.
          </p>

          <div class="form-group">
            <label>سبب الرفض:</label>
            <input
              type="text"
              [(ngModel)]="rejectionReason"
              class="text-input"
              placeholder="مثال: نفاد أحد الأصناف المطلوبة حالياً في الفرع"
            />
          </div>

          <div class="modal-actions">
            <button class="btn btn-outline" (click)="selectedOrderForRejection.set(null)">
              إلغاء
            </button>
            <button class="btn btn-danger" (click)="confirmOrderRejection()">
              تأكيد الاعتذار والرفض
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .branch-dashboard {
        max-width: 1080px;
        margin: 0 auto;
        padding: 1.5rem 1rem;
        font-family: var(--font-body);
      }
      .dash-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        border-bottom: 2px solid var(--color-border);
        padding-bottom: 1.25rem;
        margin-bottom: 1.5rem;
        gap: 1.5rem;
        flex-wrap: wrap;
      }
      .title-row {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }
      .title {
        font-family: var(--font-heading);
        color: var(--color-primary);
        font-size: 1.7rem;
        margin: 0;
      }
      .role-badge {
        background: #2b6cb0;
        color: #fff;
        padding: 0.25rem 0.65rem;
        border-radius: 6px;
        font-size: 0.8rem;
        font-weight: 700;
      }
      .store-name {
        margin: 0.35rem 0;
        font-size: 1rem;
        color: var(--color-text-muted);
        font-weight: 600;
      }
      .working-hours-tag {
        font-size: 0.85rem;
        color: #4a5568;
        background: #edf2f7;
        padding: 0.35rem 0.75rem;
        border-radius: 6px;
        display: inline-block;
        margin-top: 0.25rem;
      }
      .header-actions {
        display: flex;
        align-items: center;
        gap: 1rem;
        flex-wrap: wrap;
      }
      .sound-toggle-btn {
        background: #f7fafc;
        border: 1px solid var(--color-border);
        border-radius: 8px;
        padding: 0.55rem 0.95rem;
        font-size: 0.88rem;
        cursor: pointer;
        font-weight: 600;
        color: var(--color-text);
      }
      .sound-toggle-btn.sound-on {
        background: #feebc8;
        border-color: #f6ad55;
        color: #744210;
      }
      .toggle-wrap {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        background: #f7fafc;
        padding: 0.4rem 0.8rem;
        border-radius: 8px;
        border: 1px solid var(--color-border);
      }
      .status-label {
        font-weight: 600;
        font-size: 0.85rem;
      }
      .toggle-btn {
        background: #e2e8f0;
        color: #4a5568;
        border: none;
        padding: 0.4rem 0.85rem;
        border-radius: 6px;
        font-weight: 700;
        font-size: 0.85rem;
        cursor: pointer;
        transition: all 0.2s;
      }
      .toggle-btn.active {
        background: #38a169;
        color: #ffffff;
      }
      .alert-banner {
        padding: 0.85rem 1.25rem;
        border-radius: 8px;
        margin-bottom: 1.5rem;
        font-size: 0.92rem;
      }
      .alert-banner.warning {
        background: #fffaf0;
        border: 1px solid #fbd38d;
        color: #9c4221;
      }
      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        margin-bottom: 2rem;
      }
      .stat-card {
        background: #ffffff;
        border: 1px solid var(--color-border);
        border-radius: 12px;
        padding: 1.25rem;
        text-align: center;
      }
      .stat-card.alert-stat.has-new {
        background: #fffaf0;
        border-color: #f6ad55;
      }
      .stat-num {
        display: block;
        font-size: 2rem;
        font-weight: 700;
        color: var(--color-primary);
        font-family: var(--font-heading);
      }
      .alert-stat.has-new .stat-num {
        color: #c05621;
      }
      .stat-label {
        font-size: 0.85rem;
        color: var(--color-text-muted);
        margin-top: 0.25rem;
      }
      .orders-section {
        background: #ffffff;
        border: 1px solid var(--color-border);
        border-radius: 12px;
        padding: 1.5rem;
      }
      .section-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid #edf2f7;
        padding-bottom: 1rem;
        margin-bottom: 1.25rem;
        gap: 1rem;
        flex-wrap: wrap;
      }
      .section-top h3 {
        margin: 0;
        font-family: var(--font-heading);
        font-size: 1.25rem;
      }
      .filter-pills {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
      }
      .pill-btn {
        background: transparent;
        border: 1px solid var(--color-border);
        padding: 0.4rem 0.85rem;
        border-radius: 20px;
        font-size: 0.85rem;
        cursor: pointer;
        font-weight: 600;
      }
      .pill-btn.active {
        background: var(--color-primary);
        color: #fff;
        border-color: var(--color-primary);
      }
      .orders-cards-list {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
      }
      .order-card {
        border: 1px solid var(--color-border);
        border-radius: 10px;
        padding: 1.25rem;
        background: #fff;
      }
      .order-card.order-new {
        border: 2px solid #f6ad55;
        background: #fffaf0;
      }
      .order-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid #edf2f7;
        padding-bottom: 0.75rem;
        margin-bottom: 0.75rem;
        gap: 0.5rem;
        flex-wrap: wrap;
      }
      .order-id-wrap {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex-wrap: wrap;
      }
      .order-num {
        font-family: var(--font-heading);
        font-weight: 700;
        font-size: 1.1rem;
        color: var(--color-primary);
      }
      .order-time {
        color: var(--color-text-muted);
        font-size: 0.85rem;
      }
      .branch-pill {
        background: #e2e8f0;
        color: #2d3748;
        padding: 0.2rem 0.5rem;
        border-radius: 4px;
        font-size: 0.78rem;
        font-weight: 600;
      }
      .customer-info-box {
        font-size: 0.9rem;
        color: var(--color-text);
        margin-bottom: 0.75rem;
      }
      .customer-info-box p {
        margin: 0.25rem 0;
      }
      .items-list-box {
        background: #faf8f2;
        padding: 0.85rem;
        border-radius: 6px;
        margin-bottom: 1rem;
      }
      .order-item-row {
        display: flex;
        justify-content: space-between;
        padding: 0.25rem 0;
        font-size: 0.9rem;
      }
      .order-totals-summary {
        border-top: 1px dashed var(--color-border);
        margin-top: 0.5rem;
        padding-top: 0.5rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.9rem;
      }
      .grand-total {
        font-weight: 700;
        color: var(--color-primary);
      }
      .order-actions-bar {
        display: flex;
        gap: 0.75rem;
        flex-wrap: wrap;
      }
      .btn {
        padding: 0.55rem 1rem;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
        border: none;
        font-size: 0.9rem;
      }
      .btn-primary {
        background: var(--color-primary);
        color: #fff;
      }
      .btn-success {
        background: #38a169;
        color: #fff;
      }
      .btn-warning {
        background: #dd6b20;
        color: #fff;
      }
      .btn-danger {
        background: #e53e3e;
        color: #fff;
      }
      .btn-danger-outline {
        background: transparent;
        border: 1px solid #feb2b2;
        color: #c53030;
      }
      .btn-outline {
        background: transparent;
        border: 1px solid var(--color-border);
        color: var(--color-text);
      }
      .badge {
        padding: 0.25rem 0.65rem;
        border-radius: 4px;
        font-size: 0.8rem;
        font-weight: 600;
      }
      .badge-new {
        background: #feebc8;
        color: #744210;
      }
      .badge-accepted,
      .badge-delivered {
        background: #c6f6d5;
        color: #22543d;
      }
      .badge-preparing {
        background: #bee3f8;
        color: #2b6cb0;
      }
      .badge-out_for_delivery {
        background: #fed7d7;
        color: #742a2a;
      }
      .badge-cancelled,
      .badge-rejected {
        background: #edf2f7;
        color: #4a5568;
      }
      .empty-orders-state {
        text-align: center;
        padding: 3rem 1rem;
        color: var(--color-text-muted);
      }
      .empty-icon {
        font-size: 2.5rem;
        margin-bottom: 0.75rem;
      }
      .empty-orders-state h4 {
        font-size: 1.15rem;
        margin: 0 0 0.5rem;
        color: var(--color-text);
      }
      .empty-orders-state p {
        font-size: 0.9rem;
        margin: 0;
      }
      .modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
      }
      .modal-dialog {
        background: #fff;
        padding: 1.75rem;
        border-radius: 12px;
        width: 100%;
        max-width: 480px;
      }
      .modal-desc {
        font-size: 0.88rem;
        color: var(--color-text-muted);
        margin: 0.5rem 0 1.25rem;
      }
      .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        margin-bottom: 1rem;
      }
      .form-group label {
        font-weight: 600;
        font-size: 0.9rem;
      }
      .text-input {
        padding: 0.5rem 0.85rem;
        border: 1px solid var(--color-border);
        border-radius: 6px;
        font-family: inherit;
        font-size: 0.9rem;
      }
      .modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
        margin-top: 1.25rem;
      }
    `,
  ],
})
export class BranchDashboardComponent {
  protected readonly t = AR_TRANSLATIONS;

  soundEnabled = signal<boolean>(true);
  selectedOrderForRejection = signal<BranchOrder | null>(null);

  orderFilter = 'all';
  rejectionReason = 'نفاد أحد الأصناف المطلوبة حالياً في الفرع';

  currentBranch = {
    id: 1,
    name: 'فرع وسط البلد',
    storeName: 'مطعم الكرنك الأصيل',
    is_accepting_orders: true,
    working_hours: {
      open: '09:00 ص',
      close: '11:00 م',
    },
  };

  orders: BranchOrder[] = [
    {
      id: 101,
      orderNumber: 'ORD-QNA-501',
      branchId: 1,
      branchName: 'فرع وسط البلد',
      storeName: 'مطعم الكرنك الأصيل',
      customerName: 'محمود حسن',
      customerPhone: '01098765432',
      deliveryAddress: 'شارع الهلال الأحمر، بجوار مسجد سيدي عبد الرحيم القنائي',
      zoneName: 'وسط البلد',
      notes: 'الرجاء الاتصال عند الوصول',
      status: 'new',
      timeAgo: 'منذ 3 دقائق',
      itemsTotal: 175.0,
      deliveryFee: 15.0,
      grandTotal: 190.0,
      items: [
        { name: 'وجبة كباب وكفتة مشوي على الفحم', quantity: 1, price: 130.0 },
        { name: 'ساندوتش كفتة قناوي', quantity: 1, price: 45.0 },
      ],
    },
    {
      id: 102,
      orderNumber: 'ORD-QNA-502',
      branchId: 1,
      branchName: 'فرع وسط البلد',
      storeName: 'مطعم الكرنك الأصيل',
      customerName: 'إبراهيم ناصر',
      customerPhone: '01122334455',
      deliveryAddress: 'مساكن عثمان، شقة 4',
      zoneName: 'الجامعة ومساكن الشباب',
      notes: 'من غير شطة',
      status: 'preparing',
      timeAgo: 'منذ 18 دقيقة',
      itemsTotal: 90.0,
      deliveryFee: 15.0,
      grandTotal: 105.0,
      items: [{ name: 'ساندوتش كفتة قناوي', quantity: 2, price: 45.0 }],
    },
    {
      id: 103,
      orderNumber: 'ORD-QNA-498',
      branchId: 1,
      branchName: 'فرع وسط البلد',
      storeName: 'مطعم الكرنك الأصيل',
      customerName: 'ياسر فاروق',
      customerPhone: '01233445566',
      deliveryAddress: 'حي المصالح، قنا',
      zoneName: 'حي المصالح',
      status: 'delivered',
      timeAgo: 'منذ ساعة',
      itemsTotal: 260.0,
      deliveryFee: 12.0,
      grandTotal: 272.0,
      items: [{ name: 'وجبة كباب وكفتة مشوي على الفحم', quantity: 2, price: 130.0 }],
    },
  ];

  newOrdersCount() {
    return this.orders.filter((o) => o.status === 'new').length;
  }

  activeOrdersCount() {
    return this.orders.filter((o) =>
      ['accepted', 'preparing', 'out_for_delivery'].includes(o.status),
    ).length;
  }

  completedOrdersCount() {
    return this.orders.filter((o) => o.status === 'delivered').length;
  }

  todayCashTotal() {
    return this.orders
      .filter((o) => o.status === 'delivered')
      .reduce((sum, o) => sum + o.grandTotal, 0);
  }

  filteredOrders() {
    // Only display orders that belong to this branch
    const branchOrders = this.orders.filter((o) => o.branchId === this.currentBranch.id);
    if (this.orderFilter === 'all') return branchOrders;
    if (this.orderFilter === 'new') return branchOrders.filter((o) => o.status === 'new');
    if (this.orderFilter === 'in_progress')
      return branchOrders.filter((o) =>
        ['accepted', 'preparing', 'out_for_delivery'].includes(o.status),
      );
    if (this.orderFilter === 'delivered')
      return branchOrders.filter((o) => o.status === 'delivered');
    return branchOrders;
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      new: 'طلب جديد للفرع 🔔',
      accepted: 'تم القبول بالفرع',
      preparing: 'جاري التحضير بمطبخ الفرع',
      out_for_delivery: 'خرج للتوصيل مع مندوب المتجر',
      delivered: 'تم التوصيل بنجاح',
      cancelled: 'ملغي',
      rejected: 'اعتذر عنه الفرع',
    };
    return map[status] || status;
  }

  toggleReceiving() {
    this.currentBranch.is_accepting_orders = !this.currentBranch.is_accepting_orders;
  }

  toggleSound() {
    this.soundEnabled.set(!this.soundEnabled());
    if (this.soundEnabled()) {
      this.playChime();
    }
  }

  playChime() {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    } catch {
      // AudioContext unavailable in environment
    }
  }

  updateOrderStatus(order: BranchOrder, nextStatus: BranchOrder['status']) {
    // Security check: Order must belong to this branch
    if (order.branchId !== this.currentBranch.id) {
      alert(this.t.branch.orderNotYourBranch);
      return;
    }
    order.status = nextStatus;
  }

  openRejectModal(order: BranchOrder) {
    if (order.branchId !== this.currentBranch.id) {
      alert(this.t.branch.orderNotYourBranch);
      return;
    }
    this.selectedOrderForRejection.set(order);
  }

  confirmOrderRejection() {
    const ord = this.selectedOrderForRejection();
    if (ord) {
      ord.status = 'rejected';
      this.selectedOrderForRejection.set(null);
    }
  }
}
