import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AR_TRANSLATIONS } from '../../../core/constants/translations';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-dashboard">
      <div class="admin-header">
        <div>
          <h2 class="title">لوحة تحكم إدارة منصة أوردرات</h2>
          <p class="subtitle">إدارة المتاجر والطلبات والعملاء وإعدادات قنا</p>
        </div>
        <span class="role-badge">أدمن المنصة</span>
      </div>

      <!-- Navigation Tabs -->
      <div class="tabs-nav">
        <button 
          class="tab-btn" 
          [class.active]="activeTab() === 'stores'" 
          (click)="activeTab.set('stores')">
          المتاجر ({{ stores.length }})
        </button>
        <button 
          class="tab-btn" 
          [class.active]="activeTab() === 'orders'" 
          (click)="activeTab.set('orders')">
          متابعة الطلبات
          <span class="badge-alert" *ngIf="unacceptedAlertCount() > 0">{{ unacceptedAlertCount() }}</span>
        </button>
        <button 
          class="tab-btn" 
          [class.active]="activeTab() === 'customers'" 
          (click)="activeTab.set('customers')">
          العملاء
        </button>
        <button 
          class="tab-btn" 
          [class.active]="activeTab() === 'settings'" 
          (click)="activeTab.set('settings')">
          إعدادات النظام والمناطق
        </button>
      </div>

      <!-- Pending Zones Notice (Design Decision Gate) -->
      <div class="pending-notice-box">
        ⚠️ <strong>ملاحظة هامة:</strong> {{ t.admin.zones.pendingNotice }}
      </div>

      <!-- Top KPI Stats -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <span class="kpi-val">{{ stores.length }}</span>
          <span class="kpi-label">{{ t.admin.home.storesCount }}</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-val">{{ orders.length }}</span>
          <span class="kpi-label">{{ t.admin.home.ordersCount }}</span>
        </div>
        <div class="kpi-card alert-card" [class.has-alert]="unacceptedAlertCount() > 0">
          <span class="kpi-val text-alert">{{ unacceptedAlertCount() }}</span>
          <span class="kpi-label">{{ t.admin.home.unacceptedAlert }} (> 10 دقائق)</span>
        </div>
      </div>

      <!-- TAB 1: STORES MANAGEMENT -->
      <div class="card-section" *ngIf="activeTab() === 'stores'">
        <div class="section-title-row">
          <h3>{{ t.admin.stores.title }}</h3>
          <button class="btn btn-primary" (click)="showNewStoreModal.set(true)">+ {{ t.admin.stores.openStoreAccount }}</button>
        </div>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>المتجر</th>
                <th>النوع</th>
                <th>المالك</th>
                <th>الحالة</th>
                <th>الإجراء</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let s of stores">
                <td>
                  <strong>{{ s.name }}</strong>
                </td>
                <td>{{ s.type === 'restaurant' ? 'مطعم' : 'بقالة' }}</td>
                <td>{{ s.owner }} ({{ s.phone }})</td>
                <td>
                  <span class="status-tag" [class.active]="s.active">{{
                    s.active ? 'نشط' : 'متوقف'
                  }}</span>
                </td>
                <td>
                  <button class="btn btn-sm" [class.btn-danger]="s.active" [class.btn-outline]="!s.active" (click)="toggleStoreStatus(s)">
                    {{ s.active ? t.admin.stores.suspendAccountBtn : t.admin.stores.activateAccountBtn }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- TAB 2: ORDERS OVERSIGHT -->
      <div class="card-section" *ngIf="activeTab() === 'orders'">
        <div class="section-title-row">
          <h3>مراقبة الطلبات المباشرة في قنا</h3>
          <div class="filter-group">
            <label>تصفية بالحالة:</label>
            <select [(ngModel)]="orderStatusFilter" class="select-input">
              <option value="all">كل الحالات</option>
              <option value="new">جديد</option>
              <option value="accepted">مقبول</option>
              <option value="preparing">جاري التجهيز</option>
              <option value="out_for_delivery">خرج للتوصيل</option>
              <option value="delivered">تم التوصيل</option>
              <option value="cancelled">ملغي</option>
              <option value="rejected">مرفوض</option>
            </select>
          </div>
        </div>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>رقم الطلب</th>
                <th>المتجر</th>
                <th>العميل</th>
                <th>الإجمالي</th>
                <th>الحالة</th>
                <th>الوقت</th>
                <th>الإجراء</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let ord of filteredOrders()">
                <td><strong>{{ ord.orderNumber }}</strong></td>
                <td>{{ ord.storeName }}</td>
                <td>{{ ord.customerName }} ({{ ord.customerPhone }})</td>
                <td>{{ ord.grandTotal }} ج.م</td>
                <td>
                  <span class="status-tag" [ngClass]="'status-' + ord.status">{{ getStatusLabel(ord.status) }}</span>
                  <span *ngIf="ord.isDelayed" class="tag-delayed">تأخر في القبول ⚠️</span>
                </td>
                <td>{{ ord.minutesAgo }} دقيقة</td>
                <td>
                  <button class="btn btn-sm btn-outline" (click)="openStatusOverrideModal(ord)">تدخل يدوي</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- TAB 3: CUSTOMERS MANAGEMENT -->
      <div class="card-section" *ngIf="activeTab() === 'customers'">
        <div class="section-title-row">
          <h3>إدارة العملاء في مدينة قنا</h3>
          <input 
            type="text" 
            [(ngModel)]="customerSearchQuery" 
            placeholder="بحث بالاسم أو التليفون..." 
            class="search-input" />
        </div>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>اسم العميل</th>
                <th>رقم التليفون (مصري)</th>
                <th>البريد الإلكتروني</th>
                <th>حالة الحساب</th>
                <th>الإجراء</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let cust of filteredCustomers()">
                <td><strong>{{ cust.name }}</strong></td>
                <td dir="ltr">{{ cust.phone }}</td>
                <td>{{ cust.email }}</td>
                <td>
                  <span class="status-tag" [class.active]="cust.status === 'active'">{{ cust.status === 'active' ? 'نشط' : 'موقوف' }}</span>
                </td>
                <td>
                  <button 
                    class="btn btn-sm" 
                    [class.btn-danger]="cust.status === 'active'" 
                    [class.btn-outline]="cust.status !== 'active'"
                    (click)="toggleCustomerStatus(cust)">
                    {{ cust.status === 'active' ? 'إيقاف الحساب' : 'تنشيط الحساب' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- TAB 4: SYSTEM SETTINGS & ZONES -->
      <div class="card-section" *ngIf="activeTab() === 'settings'">
        <div class="section-title-row">
          <h3>إعدادات المنصة وقرارات التصميم</h3>
          <button class="btn btn-primary" (click)="saveSettings()">حفظ التعديلات</button>
        </div>

        <div class="settings-form">
          <div class="form-group">
            <label>رقم تواصل اشتراك أصحاب المطاعم والبقالات (Placeholder):</label>
            <input type="text" [(ngModel)]="settings.subscription_contact_number" class="text-input" />
            <small class="hint">يظهر في كارت البداية وهيدر الموقع عند طلب الانضمام لمنصة أوردرات</small>
          </div>

          <div class="form-group">
            <label>مهلة تنبيه الطلبات غير المقبولة (بالدقائق):</label>
            <input type="number" [(ngModel)]="settings.unaccepted_order_alert_minutes" min="1" max="120" class="text-input" />
            <small class="hint">عند تجاوز هذه المهلة بدون قبول المحل للطلب يظهر تنبيه للأدمن للمتابعة</small>
          </div>

          <div class="form-group">
            <label>الحد الأقصى لمحاولات الطلب في الدقيقة (Rate Limit):</label>
            <input type="number" [(ngModel)]="settings.order_rate_limit_per_minute" min="1" max="30" class="text-input" />
          </div>

          <div class="decision-gate-card">
            <h4>بوابة قرار مناطق التوصيل والتسعير (مدينة قنا)</h4>
            <p>
              القرار المطلوب من صاحب المشروع: من الذي يحدد مناطق التوصيل ويسعرها؟ (الأدمن أم صاحب المتجر أم كلاهما).
              تم تصميم الـ API وقاعدة البيانات لتكون مرنة وتدعم كلا السيناريوهين، ويتم حالياً استخدام مناطق تجريبية محددة لقنا (وسط البلد، المعنا، الجامعة، حي المصالح).
            </p>
            <div class="zones-preview-grid">
              <div class="zone-pill" *ngFor="let z of testZones">
                <strong>{{ z.name }}</strong> (سعر استرشادي: {{ z.fee }} ج.م)
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- MODAL: MANUAL STATUS OVERRIDE -->
      <div class="modal-backdrop" *ngIf="selectedOrderForOverride()">
        <div class="modal-dialog">
          <h4>تدخل يدوي في حالة الطلب #{{ selectedOrderForOverride()?.orderNumber }}</h4>
          <p class="modal-desc">يتطلب التدخل اليدوي من الأدمن تسجيل سبب التعديل لأغراض الرقابة وسجل التعديلات (Audit Log).</p>
          
          <div class="form-group">
            <label>الحالة الجديدة:</label>
            <select [(ngModel)]="overrideNewStatus" class="select-input">
              <option value="cancelled">إلغاء الطلب</option>
              <option value="accepted">قبول الطلب نيابة عن المحل</option>
              <option value="delivered">تأكيد التوصيل يدوياً</option>
            </select>
          </div>

          <div class="form-group">
            <label>سبب التعديل (إلزامي):</label>
            <textarea [(ngModel)]="overrideReason" class="text-input" rows="3" placeholder="اكتب سبب التعديل بالتفصيل..."></textarea>
          </div>

          <div class="modal-actions">
            <button class="btn btn-outline" (click)="selectedOrderForOverride.set(null)">إلغاء</button>
            <button class="btn btn-primary" [disabled]="!overrideReason.trim()" (click)="confirmStatusOverride()">تأكيد التعديل</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .admin-dashboard {
        max-width: 1200px;
        margin: 0 auto;
      }
      .admin-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
        border-bottom: 1px solid var(--color-border);
        padding-bottom: 1rem;
      }
      .title {
        font-family: var(--font-heading);
        color: var(--color-primary);
        margin: 0;
        font-size: 1.6rem;
      }
      .subtitle {
        margin: 0.25rem 0 0;
        color: var(--color-text-muted);
        font-size: 0.95rem;
      }
      .role-badge {
        background: var(--color-primary);
        color: #fff;
        padding: 0.35rem 0.85rem;
        border-radius: 6px;
        font-weight: 600;
        font-size: 0.85rem;
      }
      .tabs-nav {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 1.5rem;
        border-bottom: 2px solid var(--color-border);
        padding-bottom: 0.5rem;
      }
      .tab-btn {
        background: transparent;
        border: none;
        padding: 0.6rem 1.2rem;
        font-size: 0.95rem;
        font-weight: 600;
        cursor: pointer;
        color: var(--color-text-muted);
        border-radius: 6px;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .tab-btn.active {
        background: var(--color-primary);
        color: #ffffff;
      }
      .badge-alert {
        background: #e53e3e;
        color: #fff;
        padding: 0.15rem 0.45rem;
        border-radius: 10px;
        font-size: 0.75rem;
      }
      .pending-notice-box {
        background: #fffbeb;
        border: 1px solid #f6e05e;
        border-radius: 8px;
        padding: 0.85rem 1.25rem;
        margin-bottom: 1.5rem;
        color: #744210;
        font-size: 0.95rem;
      }
      .kpi-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 1rem;
        margin-bottom: 2rem;
      }
      .kpi-card {
        background: #ffffff;
        padding: 1.5rem;
        border-radius: 12px;
        border: 1px solid var(--color-border);
        text-align: center;
      }
      .kpi-card.has-alert {
        border-color: #feb2b2;
        background: #fff5f5;
      }
      .kpi-val {
        font-size: 2.2rem;
        font-weight: 700;
        color: var(--color-primary);
        display: block;
      }
      .kpi-val.text-alert {
        color: #e53e3e;
      }
      .kpi-label {
        color: var(--color-text-muted);
        font-size: 0.9rem;
        margin-top: 0.35rem;
      }
      .card-section {
        background: #ffffff;
        border-radius: 12px;
        border: 1px solid var(--color-border);
        padding: 1.5rem;
        margin-bottom: 2rem;
      }
      .section-title-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.25rem;
        gap: 1rem;
        flex-wrap: wrap;
      }
      .section-title-row h3 {
        font-family: var(--font-heading);
        margin: 0;
      }
      .table-responsive {
        overflow-x: auto;
      }
      .data-table {
        width: 100%;
        border-collapse: collapse;
        text-align: right;
      }
      .data-table th,
      .data-table td {
        padding: 0.85rem 1rem;
        border-bottom: 1px solid var(--color-border);
        font-size: 0.9rem;
      }
      .data-table th {
        background: #faf8f2;
        color: var(--color-text-muted);
      }
      .status-tag {
        padding: 0.2rem 0.55rem;
        border-radius: 4px;
        font-size: 0.8rem;
        font-weight: 600;
        background: #cbd5e0;
      }
      .status-tag.active, .status-delivered, .status-accepted {
        background: #c6f6d5;
        color: #22543d;
      }
      .status-new, .status-preparing {
        background: #feebc8;
        color: #744210;
      }
      .status-cancelled, .status-rejected {
        background: #fed7d7;
        color: #742a2a;
      }
      .tag-delayed {
        display: inline-block;
        margin-right: 0.5rem;
        font-size: 0.75rem;
        color: #c53030;
        font-weight: bold;
      }
      .btn {
        padding: 0.55rem 1rem;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
        border: none;
      }
      .btn-primary {
        background: var(--color-primary);
        color: #fff;
      }
      .btn-danger {
        background: #fff5f5;
        border: 1px solid #feb2b2;
        color: #c53030;
      }
      .btn-outline {
        background: transparent;
        border: 1px solid var(--color-border);
        color: var(--color-text);
      }
      .btn-sm {
        padding: 0.35rem 0.65rem;
        font-size: 0.85rem;
      }
      .search-input, .select-input, .text-input {
        padding: 0.5rem 0.85rem;
        border: 1px solid var(--color-border);
        border-radius: 6px;
        font-size: 0.9rem;
        font-family: inherit;
      }
      .settings-form {
        max-width: 650px;
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
      }
      .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
      }
      .form-group label {
        font-weight: 600;
        font-size: 0.9rem;
      }
      .hint {
        color: var(--color-text-muted);
        font-size: 0.8rem;
      }
      .decision-gate-card {
        background: #f7fafc;
        border: 1px solid #e2e8f0;
        padding: 1.25rem;
        border-radius: 8px;
        margin-top: 1rem;
      }
      .decision-gate-card h4 {
        margin: 0 0 0.5rem;
        color: var(--color-primary);
      }
      .decision-gate-card p {
        font-size: 0.88rem;
        color: var(--color-text-muted);
        line-height: 1.5;
        margin-bottom: 0.85rem;
      }
      .zones-preview-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }
      .zone-pill {
        background: #edf2f7;
        padding: 0.35rem 0.75rem;
        border-radius: 15px;
        font-size: 0.85rem;
      }
      .modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.5);
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
      .modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
        margin-top: 1.5rem;
      }
    `,
  ],
})
export class AdminDashboardComponent {
  protected readonly t = AR_TRANSLATIONS;

  activeTab = signal<'stores' | 'orders' | 'customers' | 'settings'>('stores');
  showNewStoreModal = signal<boolean>(false);
  selectedOrderForOverride = signal<any | null>(null);

  orderStatusFilter = 'all';
  customerSearchQuery = '';
  overrideNewStatus = 'cancelled';
  overrideReason = '';

  settings = {
    subscription_contact_number: '01000000000 (Placeholder)',
    unaccepted_order_alert_minutes: 10,
    order_rate_limit_per_minute: 5,
  };

  testZones = [
    { name: 'وسط البلد', fee: 10 },
    { name: 'المعنا', fee: 15 },
    { name: 'الجامعة ومساكن الشباب', fee: 15 },
    { name: 'حي المصالح والشوؤن', fee: 12 },
  ];

  stores = [
    {
      id: 1,
      name: 'مطعم الكرنك (تجريبي)',
      type: 'restaurant',
      owner: 'أحمد محمود',
      phone: '01012345678',
      active: true,
    },
    {
      id: 2,
      name: 'بقالة الأمانة (تجريبي)',
      type: 'grocery',
      owner: 'إبراهيم علي',
      phone: '01123456789',
      active: true,
    },
    {
      id: 3,
      name: 'مطعم الشام (تجريبي)',
      type: 'restaurant',
      owner: 'خالد سليم',
      phone: '01234567890',
      active: false,
    },
  ];

  orders = [
    {
      id: 101,
      orderNumber: 'ORD-QNA-001',
      storeName: 'مطعم الكرنك (تجريبي)',
      customerName: 'محمود حسن',
      customerPhone: '01098765432',
      grandTotal: 175.00,
      status: 'new',
      minutesAgo: 14,
      isDelayed: true,
    },
    {
      id: 102,
      orderNumber: 'ORD-QNA-002',
      storeName: 'بقالة الأمانة (تجريبي)',
      customerName: 'سارة مصطفى',
      customerPhone: '01144556677',
      grandTotal: 95.50,
      status: 'preparing',
      minutesAgo: 5,
      isDelayed: false,
    },
  ];

  customers = [
    {
      id: 1,
      name: 'محمود حسن',
      phone: '01098765432',
      email: 'mahmoud@example.com',
      status: 'active',
    },
    {
      id: 2,
      name: 'سارة مصطفى',
      phone: '01144556677',
      email: 'sara@example.com',
      status: 'active',
    },
    {
      id: 3,
      name: 'مستخدم محظور (تجريبي)',
      phone: '01511223344',
      email: 'suspended@example.com',
      status: 'suspended',
    },
  ];

  unacceptedAlertCount() {
    return this.orders.filter(o => o.status === 'new' && o.minutesAgo >= this.settings.unaccepted_order_alert_minutes).length;
  }

  filteredOrders() {
    if (this.orderStatusFilter === 'all') return this.orders;
    return this.orders.filter(o => o.status === this.orderStatusFilter);
  }

  filteredCustomers() {
    const q = this.customerSearchQuery.trim().toLowerCase();
    if (!q) return this.customers;
    return this.customers.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.email.toLowerCase().includes(q));
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      new: 'جديد',
      accepted: 'مقبول',
      preparing: 'جاري التجهيز',
      out_for_delivery: 'خرج للتوصيل',
      delivered: 'تم التوصيل',
      cancelled: 'ملغي',
      rejected: 'مرفوض',
    };
    return map[status] || status;
  }

  toggleStoreStatus(store: any) {
    store.active = !store.active;
  }

  toggleCustomerStatus(cust: any) {
    cust.status = cust.status === 'active' ? 'suspended' : 'active';
  }

  openStatusOverrideModal(order: any) {
    this.selectedOrderForOverride.set(order);
    this.overrideReason = '';
  }

  confirmStatusOverride() {
    const ord = this.selectedOrderForOverride();
    if (ord && this.overrideReason.trim()) {
      ord.status = this.overrideNewStatus;
      ord.isDelayed = false;
      this.selectedOrderForOverride.set(null);
    }
  }

  saveSettings() {
    alert('تم حفظ إعدادات منصة أوردرات بنجاح');
  }
}
