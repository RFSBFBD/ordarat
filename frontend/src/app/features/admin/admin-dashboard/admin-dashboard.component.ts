import { ChangeDetectorRef, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AR_TRANSLATIONS } from '../../../core/constants/translations';
import { ApiService } from '../../../core/services/api.service';
import { squareLogoFromFile } from '../../../core/utils/logo-image';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-dashboard">
      <div class="preview-banner" role="note" *ngIf="loading">جاري تحميل بيانات المنصة...</div>
      <div class="preview-banner" role="alert" *ngIf="!loading && loadError">
        {{ loadError }}
        <button class="tab-btn" (click)="loadAll()">إعادة المحاولة</button>
      </div>
      <div class="preview-banner" role="alert" *ngIf="actionError">{{ actionError }}</div>
      <div class="preview-banner" role="status" *ngIf="actionSuccess">{{ actionSuccess }}</div>

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
          (click)="activeTab.set('stores')"
        >
          المتاجر ({{ stores.length }})
        </button>
        <button
          class="tab-btn"
          [class.active]="activeTab() === 'orders'"
          (click)="activeTab.set('orders')"
        >
          متابعة الطلبات
          <span class="badge-alert" *ngIf="unacceptedAlertCount() > 0">{{
            unacceptedAlertCount()
          }}</span>
        </button>
        <button
          class="tab-btn"
          [class.active]="activeTab() === 'customers'"
          (click)="activeTab.set('customers')"
        >
          العملاء
        </button>
        <button
          class="tab-btn"
          [class.active]="activeTab() === 'join_requests'"
          (click)="activeTab.set('join_requests')"
        >
          {{ t.admin.joinRequests.tabTitle }}
          <span class="badge-alert" *ngIf="pendingJoinCount() > 0">{{ pendingJoinCount() }}</span>
        </button>
        <button
          class="tab-btn"
          [class.active]="activeTab() === 'branch_managers'"
          (click)="activeTab.set('branch_managers')"
        >
          {{ t.admin.branchManagers.tabTitle }} ({{ branchManagers.length }})
        </button>
        <button
          class="tab-btn"
          [class.active]="activeTab() === 'settings'"
          (click)="activeTab.set('settings')"
        >
          إعدادات النظام والمناطق
        </button>
        <button
          class="tab-btn"
          [class.active]="activeTab() === 'analytics'"
          (click)="activeTab.set('analytics')"
        >
          {{ t.admin.analytics.tabTitle }}
        </button>
        <button class="tab-btn" [class.active]="activeTab() === 'ai'" (click)="activeTab.set('ai')">
          {{ t.admin.ai.tabTitle }}
        </button>
      </div>

      <!-- Approved Decision Notice -->
      <div class="approved-decision-box">
        <strong>قرار معتمد:</strong> تسعير رسوم التوصيل بمناطق قنا مسند بالكامل لأصحاب المطاعم
        والبقالات لكل فرع، ورقم التواصل المعتمد للاشتراك هو: <strong>+201055370118</strong>
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
          <button class="btn btn-primary" (click)="showNewStoreModal.set(true)">
            + {{ t.admin.stores.openStoreAccount }}
          </button>
        </div>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>المتجر</th>
                <th>النوع</th>
                <th>المالك</th>
                <th>تليفون النشاط</th>
                <th>الاشتراك</th>
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
                <td class="ltr" dir="ltr">{{ s.businessPhone || '-' }}</td>
                <td>
                  <span class="status-tag sub-tag" [class.active]="s.subscriptionActive">{{
                    s.subscriptionActive
                      ? (s.subscriptionEnds ? 'شغال لحد ' + s.subscriptionEnds : 'شغال بدون نهاية')
                      : 'غير مفعّل'
                  }}</span>
                  <button class="btn btn-sm btn-outline" (click)="activateSubscription(s)">
                    {{ s.subscriptionActive ? 'تعديل' : 'تفعيل الاشتراك' }}
                  </button>
                  <button *ngIf="s.subscriptionActive" class="btn btn-sm btn-danger" (click)="endSubscription(s)">إنهاء</button>
                </td>
                <td>
                  <span class="status-tag" [class.active]="s.active">{{
                    s.active ? 'نشط' : 'متوقف'
                  }}</span>
                </td>
                <td>
                  <button
                    class="btn btn-sm"
                    [class.btn-danger]="s.active"
                    [class.btn-outline]="!s.active"
                    (click)="toggleStoreStatus(s)"
                  >
                    {{
                      s.active
                        ? t.admin.stores.suspendAccountBtn
                        : t.admin.stores.activateAccountBtn
                    }}
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
                <td>
                  <strong>{{ ord.orderNumber }}</strong>
                </td>
                <td>{{ ord.storeName }}</td>
                <td>{{ ord.customerName }} ({{ ord.customerPhone }})</td>
                <td>{{ ord.grandTotal }} ج.م</td>
                <td>
                  <span class="status-tag" [ngClass]="'status-' + ord.status">{{
                    getStatusLabel(ord.status)
                  }}</span>
                  <span *ngIf="ord.isDelayed" class="tag-delayed">تأخر في القبول </span>
                </td>
                <td>{{ ord.minutesAgo }} دقيقة</td>
                <td>
                  <button class="btn btn-sm btn-outline" (click)="openStatusOverrideModal(ord)">
                    تدخل يدوي
                  </button>
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
            class="search-input"
          />
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
                <td>
                  <strong>{{ cust.name }}</strong>
                </td>
                <td dir="ltr">{{ cust.phone }}</td>
                <td>{{ cust.email }}</td>
                <td>
                  <span class="status-tag" [class.active]="cust.status === 'active'">{{
                    cust.status === 'active' ? 'نشط' : 'موقوف'
                  }}</span>
                </td>
                <td>
                  <button
                    class="btn btn-sm"
                    [class.btn-danger]="cust.status === 'active'"
                    [class.btn-outline]="cust.status !== 'active'"
                    (click)="toggleCustomerStatus(cust)"
                  >
                    {{ cust.status === 'active' ? 'إيقاف الحساب' : 'تنشيط الحساب' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- TAB 3b: BRANCH MANAGERS PROVISIONING (Admin Only) -->
      <!-- TAB: BUSINESS JOIN REQUESTS -->
      <div class="card-section" *ngIf="activeTab() === 'join_requests'">
        <div class="section-title-row">
          <h3>{{ t.admin.joinRequests.title }}</h3>
        </div>

        <div class="empty-state" *ngIf="joinRequests.length === 0">
          {{ t.admin.joinRequests.empty }}
        </div>

        <div class="table-responsive" *ngIf="joinRequests.length > 0">
          <table class="data-table">
            <thead>
              <tr>
                <th>{{ t.admin.joinRequests.businessName }}</th>
                <th>{{ t.admin.joinRequests.owner }}</th>
                <th>{{ t.admin.joinRequests.type }}</th>
                <th>{{ t.admin.joinRequests.area }}</th>
                <th>{{ t.admin.joinRequests.phone }}</th>
                <th>{{ t.admin.joinRequests.address }}</th>
                <th>{{ t.admin.joinRequests.hasBranches }}</th>
                <th>{{ t.admin.joinRequests.date }}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let req of joinRequests">
                <td>
                  <img
                    *ngIf="req.logo_url"
                    [src]="req.logo_url"
                    [alt]="req.business_name"
                    width="48"
                    height="48"
                    style="border-radius: 12px; object-fit: cover; display: block; margin-bottom: 4px"
                  />
                  <strong>{{ req.business_name }}</strong>
                  <div *ngIf="req.status !== 'pending'">
                    <small [style.color]="req.status === 'approved' ? 'var(--color-success)' : 'var(--color-danger)'">
                      {{ req.status === 'approved' ? t.admin.joinRequests.statusApproved : t.admin.joinRequests.statusRejected }}
                    </small>
                  </div>
                </td>
                <td>
                  {{ req.owner?.name || '-' }}
                  <div><small>{{ req.owner?.email || '' }}</small></div>
                </td>
                <td>{{ req.type === 'restaurant' ? t.admin.stores.typeRestaurant : t.admin.stores.typeGrocery }}</td>
                <td>{{ req.area_name }}</td>
                <td class="ltr">{{ req.phone }}</td>
                <td>
                  {{ req.address }}
                  <div *ngIf="req.opens_at"><small>مواعيد العمل: {{ req.opens_at }} - {{ req.closes_at }}</small></div>
                  <div *ngIf="req.commercial_register"><small>سجل تجاري: <span class="ltr">{{ req.commercial_register }}</span></small></div>
                </td>
                <td>
                  {{ req.has_branches ? t.admin.joinRequests.yes : t.admin.joinRequests.no }}
                  <div *ngFor="let br of req.extra_branches || []" class="extra-branch">
                    <small>
                      <strong>{{ br.name }}</strong> - {{ br.address }}
                      <span *ngIf="br.phone" class="ltr">({{ br.phone }})</span>
                    </small>
                  </div>
                </td>
                <td>{{ req.created_at | date: 'short' }}</td>
                <td *ngIf="req.status === 'pending'">
                  <button class="btn btn-primary btn-sm" (click)="approveJoinRequest(req)">
                    {{ t.admin.joinRequests.approveBtn }}
                  </button>
                  <button class="btn btn-danger btn-sm" (click)="rejectJoinRequest(req)">
                    {{ t.admin.joinRequests.rejectBtn }}
                  </button>
                </td>
                <td *ngIf="req.status !== 'pending'">
                  <small *ngIf="req.admin_note">{{ req.admin_note }}</small>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="card-section" *ngIf="activeTab() === 'branch_managers'">
        <div class="section-title-row">
          <div>
            <h3>{{ t.admin.branchManagers.title }}</h3>
            <p class="subtitle">حسابات مسؤولي الفروع تُنشأ وتُدار حصراً بواسطة إدارة المنصة</p>
          </div>
          <button class="btn btn-primary" (click)="openBranchManagerModal()">
            + {{ t.admin.branchManagers.addBtn }}
          </button>
        </div>

        <div class="table-responsive" *ngIf="branchManagers.length > 0">
          <table class="data-table">
            <thead>
              <tr>
                <th>{{ t.admin.branchManagers.managerName }}</th>
                <th>{{ t.admin.branchManagers.phone }}</th>
                <th>{{ t.admin.branchManagers.email }}</th>
                <th>{{ t.admin.branchManagers.branchSelect }}</th>
                <th>المتجر</th>
                <th>حالة الحساب</th>
                <th>الإجراء</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let bm of branchManagers">
                <td>
                  <strong>{{ bm.name }}</strong>
                </td>
                <td dir="ltr">{{ bm.phone }}</td>
                <td>{{ bm.email }}</td>
                <td>
                  <span class="branch-pill">{{ bm.branchName }}</span>
                </td>
                <td>{{ bm.storeName }}</td>
                <td>
                  <span class="status-tag" [class.active]="bm.status === 'active'">
                    {{ bm.status === 'active' ? 'نشط' : 'معطل' }}
                  </span>
                </td>
                <td>
                  <button
                    class="btn btn-sm"
                    [class.btn-danger]="bm.status === 'active'"
                    [class.btn-outline]="bm.status !== 'active'"
                    (click)="toggleBranchManagerStatus(bm)"
                  >
                    {{
                      bm.status === 'active'
                        ? t.admin.branchManagers.suspendManager
                        : t.admin.branchManagers.activateManager
                    }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="empty-state" *ngIf="branchManagers.length === 0">
          <p>{{ t.admin.branchManagers.emptyList }}</p>
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
            <input
              type="text"
              [(ngModel)]="settings.subscription_contact_number"
              class="text-input"
            />
            <small class="hint"
              >يظهر في كارت البداية وهيدر الموقع عند طلب الانضمام لمنصة أوردرات</small
            >
          </div>

          <div class="form-group">
            <label>مهلة تنبيه الطلبات غير المقبولة (بالدقائق):</label>
            <input
              type="number"
              [(ngModel)]="settings.unaccepted_order_alert_minutes"
              min="1"
              max="120"
              class="text-input"
            />
            <small class="hint"
              >عند تجاوز هذه المهلة بدون قبول المحل للطلب يظهر تنبيه للأدمن للمتابعة</small
            >
          </div>

          <div class="form-group">
            <label>الحد الأقصى لمحاولات الطلب في الدقيقة (Rate Limit):</label>
            <input
              type="number"
              [(ngModel)]="settings.order_rate_limit_per_minute"
              min="1"
              max="30"
              class="text-input"
            />
          </div>

          <div class="decision-gate-card approved">
            <h4>القرار المعتمد: تسعير التوصيل بواسطة صاحب المتجر</h4>
            <p>
              بناءً على القرار المعتمد من صاحب المشروع: يقوم كل صاحب مطعم أو بقالة بتحديد قيمة
              التوصيل الخاصة بفروعه لكل منطقة في قنا، مع إمكانية استبعاد أي منطقة لا يغطيها مندوبوه.
            </p>
            <div class="zones-preview-grid">
              <div class="zone-pill" *ngFor="let z of testZones">
                <strong>{{ z.name }}</strong> (يحددها المحل)
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 5: PLATFORM ANALYTICS (Reliable SQL Stats) -->
      <div class="card-section" *ngIf="activeTab() === 'analytics'">
        <div class="section-title-row">
          <div>
            <h3>{{ t.admin.analytics.title }}</h3>
            <p class="subtitle">
              بيانات دقيقة مستخرجة مباشرة من استعلامات قاعدة البيانات بتوقيت قنا (Africa/Cairo)
            </p>
          </div>
          <div class="period-filter-wrap">
            <label>{{ t.admin.analytics.periodLabel }}</label>
            <div class="filter-pills">
              <button
                class="pill-btn"
                [class.active]="analyticsPeriod === 'today'"
                (click)="setAnalyticsPeriod('today')"
              >
                {{ t.admin.analytics.periods.today }}
              </button>
              <button
                class="pill-btn"
                [class.active]="analyticsPeriod === 'week'"
                (click)="setAnalyticsPeriod('week')"
              >
                {{ t.admin.analytics.periods.week }}
              </button>
              <button
                class="pill-btn"
                [class.active]="analyticsPeriod === 'month'"
                (click)="setAnalyticsPeriod('month')"
              >
                {{ t.admin.analytics.periods.month }}
              </button>
              <button
                class="pill-btn"
                [class.active]="analyticsPeriod === 'all'"
                (click)="setAnalyticsPeriod('all')"
              >
                {{ t.admin.analytics.periods.all }}
              </button>
            </div>
          </div>
        </div>

        <!-- Delivered Cash Banner (Accurate COD Label) -->
        <div class="cash-stat-banner">
          <div class="cash-icon"></div>
          <div>
            <span class="cash-title">{{ t.admin.analytics.deliveredCashLabel }}</span>
            <span class="cash-value"
              >{{
                analyticsData.cash_summary.delivered_cash_total_egp | number: '1.2-2'
              }}
              جنيه</span
            >
            <small class="cash-note"
              >كاش محصل عند الاستلام بواسطة مندوبي المتاجر — لا تمثل أرباح المنصة</small
            >
          </div>
        </div>

        <!-- Users KPIs -->
        <h4 class="sub-heading">{{ t.admin.analytics.usersTitle }}</h4>
        <div class="kpi-grid">
          <div class="kpi-card">
            <span class="kpi-val">{{ analyticsData.users.total_customers }}</span>
            <span class="kpi-label">{{ t.admin.analytics.customersCount }}</span>
            <small class="hint">إجمالي الحسابات المسجلة</small>
          </div>
          <div class="kpi-card">
            <span class="kpi-val">{{ analyticsData.users.active_customers_in_period }}</span>
            <span class="kpi-label">{{ t.admin.analytics.activeCustomersCount }}</span>
            <small class="hint">طلبوا مرة على الأقل بالفترة</small>
          </div>
          <div class="kpi-card">
            <span class="kpi-val">{{ analyticsData.users.total_merchants }}</span>
            <span class="kpi-label">{{ t.admin.analytics.merchantsCount }}</span>
            <small class="hint">مطاعم وبقالات معتمدة</small>
          </div>
          <div class="kpi-card">
            <span class="kpi-val">{{ analyticsData.users.total_branch_managers }}</span>
            <span class="kpi-label">{{ t.admin.analytics.branchManagersCount }}</span>
            <small class="hint">مسؤولو فروع قنا</small>
          </div>
        </div>

        <!-- Orders by Status -->
        <h4 class="sub-heading">{{ t.admin.analytics.ordersTitle }}</h4>
        <div class="status-summary-grid">
          <div class="status-box new">
            <span>جديدة</span><strong>{{ analyticsData.orders.by_status.new }}</strong>
          </div>
          <div class="status-box accepted">
            <span>مقبولة</span><strong>{{ analyticsData.orders.by_status.accepted }}</strong>
          </div>
          <div class="status-box preparing">
            <span>جاري التحضير</span><strong>{{ analyticsData.orders.by_status.preparing }}</strong>
          </div>
          <div class="status-box out">
            <span>خرجت للتوصيل</span
            ><strong>{{ analyticsData.orders.by_status.out_for_delivery }}</strong>
          </div>
          <div class="status-box delivered">
            <span>تم التسليم</span><strong>{{ analyticsData.orders.by_status.delivered }}</strong>
          </div>
          <div class="status-box rejected">
            <span>مرفوضة من المحل</span
            ><strong>{{ analyticsData.orders.by_status.rejected }}</strong>
          </div>
          <div class="status-box cancelled">
            <span>ملغية</span><strong>{{ analyticsData.orders.by_status.cancelled }}</strong>
          </div>
        </div>

        <!-- Locations Breakdown & Privacy Policy -->
        <div class="breakdown-two-cols">
          <div class="breakdown-card">
            <h4 class="sub-heading">{{ t.admin.analytics.zonesTitle }}</h4>
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>المنطقة المجمعة في قنا</th>
                    <th>عدد الطلبات</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let loc of analyticsData.locations_aggregated">
                    <td>
                      <strong>{{ loc.zone }}</strong>
                    </td>
                    <td>
                      <span class="count-tag">{{ loc.count }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="privacy-note">{{ t.admin.analytics.zonesPrivacyNote }}</p>
          </div>

          <div class="breakdown-card">
            <h4 class="sub-heading">{{ t.admin.analytics.storesTitle }}</h4>
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>اسم المتجر</th>
                    <th>الطلبات</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let st of analyticsData.stores_activity">
                    <td>{{ st.store_name }}</td>
                    <td>
                      <span class="count-tag">{{ st.orders_count }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 6: AI CONFIGURATION & PLATFORM INSIGHTS (Admin Only) -->
      <div class="card-section" *ngIf="activeTab() === 'ai'">
        <div class="section-title-row">
          <div>
            <h3>{{ t.admin.ai.title }}</h3>
            <p class="subtitle">
              إدارة مفاتيح ومزودي الذكاء الاصطناعي، ضبط سقوف التكلفة، وإجراء التحليل الكلي
            </p>
          </div>
          <div class="ai-top-actions">
            <button class="btn btn-warning" (click)="openAiAnalyzePreviewModal()">
              {{ t.admin.ai.analyzeBtn }}
            </button>
            <button
              class="btn"
              [class.btn-danger]="!aiKillSwitchActive"
              [class.btn-success]="aiKillSwitchActive"
              (click)="toggleKillSwitch()"
            >
              {{
                aiKillSwitchActive
                  ? 'إلغاء الإيقاف الطارئ للـ AI'
                  : 'تفعيل الإيقاف الطارئ (Kill Switch)'
              }}
            </button>
          </div>
        </div>

        <!-- Emergency Kill Switch Alert if active -->
        <div class="alert-box-danger" *ngIf="aiKillSwitchActive">
          <strong>تنبيه طوارئ:</strong> تم تفعيل الإيقاف الطارئ لخدمات الذكاء الاصطناعي. جميع
          طلبات التجار والنظام متوقفة ومحظورة فوراً.
        </div>

        <!-- AI Function Settings Grid -->
        <div class="ai-functions-grid">
          <!-- Text Analysis -->
          <div class="ai-config-card">
            <h4>1. تحليل المنصة والاقتراحات الإحصائية</h4>
            <div class="form-group">
              <label>المزود:</label>
              <select [(ngModel)]="aiSettings.text_analysis.provider_name" class="select-input">
                <option value="mock">مزود تجريبي محلي (Mock Provider - مجاني)</option>
                <option value="gemini">Google Gemini 1.5 Flash (Official API)</option>
              </select>
            </div>
            <div class="form-group">
              <label>{{ t.admin.ai.apiKeyLabel }}:</label>
              <input
                type="password"
                [(ngModel)]="aiSettings.text_analysis.api_key_input"
                class="text-input"
                placeholder="أدخل المفتاح لتحديثه أو اتركه فارغاً"
              />
              <small class="hint"
                >الحالة:
                <strong [class.text-success]="aiSettings.text_analysis.is_configured">{{
                  aiSettings.text_analysis.is_configured
                    ? t.admin.ai.configured + ' (' + aiSettings.text_analysis.masked_key + ')'
                    : t.admin.ai.notConfigured
                }}</strong></small
              >
            </div>
            <div class="form-row">
              <div class="form-group col">
                <label>{{ t.admin.ai.dailyLimitLabel }}:</label>
                <input
                  type="number"
                  step="0.5"
                  [(ngModel)]="aiSettings.text_analysis.cost_limit_daily_usd"
                  class="text-input"
                />
              </div>
              <div class="form-group col">
                <label>{{ t.admin.ai.monthlyLimitLabel }}:</label>
                <input
                  type="number"
                  step="1"
                  [(ngModel)]="aiSettings.text_analysis.cost_limit_monthly_usd"
                  class="text-input"
                />
              </div>
            </div>
            <div class="card-footer-actions">
              <button class="btn btn-sm btn-outline" (click)="testAiConnection('text_analysis')">
                {{ t.admin.ai.testConnectionBtn }}
              </button>
              <button class="btn btn-sm btn-primary" (click)="saveAiSettings('text_analysis')">
                حفظ الإعدادات
              </button>
            </div>
          </div>

          <!-- Menu OCR Extraction -->
          <div class="ai-config-card">
            <h4>2. قراءة واستخراج المنيو من الصورة (للتجار)</h4>
            <div class="form-group">
              <label>المزود:</label>
              <select [(ngModel)]="aiSettings.image_ocr_menu.provider_name" class="select-input">
                <option value="mock">مزود تجريبي محلي (Mock Provider - مجاني)</option>
                <option value="gemini">Google Gemini 1.5 Flash (Vision)</option>
              </select>
            </div>
            <div class="form-group">
              <label>{{ t.admin.ai.apiKeyLabel }}:</label>
              <input
                type="password"
                [(ngModel)]="aiSettings.image_ocr_menu.api_key_input"
                class="text-input"
                placeholder="أدخل المفتاح لتحديثه أو اتركه فارغاً"
              />
              <small class="hint"
                >الحالة:
                <strong [class.text-success]="aiSettings.image_ocr_menu.is_configured">{{
                  aiSettings.image_ocr_menu.is_configured
                    ? t.admin.ai.configured + ' (' + aiSettings.image_ocr_menu.masked_key + ')'
                    : t.admin.ai.notConfigured
                }}</strong></small
              >
            </div>
            <div class="form-row">
              <div class="form-group col">
                <label>{{ t.admin.ai.storeQuotaLabel }}:</label>
                <input
                  type="number"
                  [(ngModel)]="aiSettings.image_ocr_menu.store_daily_quota"
                  class="text-input"
                />
              </div>
              <div class="form-group col">
                <label>{{ t.admin.ai.dailyLimitLabel }}:</label>
                <input
                  type="number"
                  step="0.5"
                  [(ngModel)]="aiSettings.image_ocr_menu.cost_limit_daily_usd"
                  class="text-input"
                />
              </div>
            </div>
            <div class="card-footer-actions">
              <button class="btn btn-sm btn-outline" (click)="testAiConnection('image_ocr_menu')">
                {{ t.admin.ai.testConnectionBtn }}
              </button>
              <button class="btn btn-sm btn-primary" (click)="saveAiSettings('image_ocr_menu')">
                حفظ الإعدادات
              </button>
            </div>
          </div>

          <!-- Product Image Generation -->
          <div class="ai-config-card">
            <h4>3. توليد صور المنتجات التوضيحية (للتجار)</h4>
            <div class="form-group">
              <label>المزود:</label>
              <select [(ngModel)]="aiSettings.image_generation.provider_name" class="select-input">
                <option value="mock">مزود تجريبي محلي (Mock Provider - مجاني وآمن)</option>
              </select>
            </div>
            <div class="form-group">
              <label>{{ t.admin.ai.apiKeyLabel }}:</label>
              <input
                type="password"
                [(ngModel)]="aiSettings.image_generation.api_key_input"
                class="text-input"
                placeholder="أدخل المفتاح أو اتركه للمزود المحلي"
              />
              <small class="hint"
                >الحالة:
                <strong [class.text-success]="aiSettings.image_generation.is_configured">{{
                  aiSettings.image_generation.is_configured
                    ? t.admin.ai.configured
                    : t.admin.ai.notConfigured
                }}</strong></small
              >
            </div>
            <div class="form-row">
              <div class="form-group col">
                <label>{{ t.admin.ai.storeQuotaLabel }}:</label>
                <input
                  type="number"
                  [(ngModel)]="aiSettings.image_generation.store_daily_quota"
                  class="text-input"
                />
              </div>
              <div class="form-group col">
                <label>{{ t.admin.ai.dailyLimitLabel }}:</label>
                <input
                  type="number"
                  step="0.5"
                  [(ngModel)]="aiSettings.image_generation.cost_limit_daily_usd"
                  class="text-input"
                />
              </div>
            </div>
            <div class="card-footer-actions">
              <button class="btn btn-sm btn-outline" (click)="testAiConnection('image_generation')">
                {{ t.admin.ai.testConnectionBtn }}
              </button>
              <button class="btn btn-sm btn-primary" (click)="saveAiSettings('image_generation')">
                حفظ الإعدادات
              </button>
            </div>
          </div>
        </div>

        <!-- Store AI Quota & Freeze Controls -->
        <h4 class="sub-heading" style="margin-top: 2rem;">
          التحكم في تفعيل وتجميد الـ AI للمتاجر
        </h4>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>المتجر</th>
                <th>الحالة للـ AI</th>
                <th>الإجراء الإداري</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let st of aiStores">
                <td>
                  <strong>{{ st.name }}</strong>
                </td>
                <td>
                  <span class="status-tag" [class.active]="!st.is_frozen">
                    {{
                      st.is_frozen
                        ? 'مجمد مؤقتاً (' + (st.freeze_reason || 'إيقاف إداري') + ')'
                        : 'مفعل لاستخدام الـ AI'
                    }}
                  </span>
                </td>
                <td>
                  <button
                    class="btn btn-sm"
                    [class.btn-danger]="!st.is_frozen"
                    [class.btn-outline]="st.is_frozen"
                    (click)="toggleStoreFreeze(st)"
                  >
                    {{ st.is_frozen ? t.admin.ai.unfreezeStoreBtn : t.admin.ai.freezeStoreBtn }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Usage Logs Table -->
        <h4 class="sub-heading" style="margin-top: 2rem;">
          {{ t.admin.ai.usageLogsTitle }} (بدون بيانات شخصية)
        </h4>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>الوظيفة</th>
                <th>المزود</th>
                <th>المتجر</th>
                <th>المخرجات</th>
                <th>التكلفة التقديرية</th>
                <th>الحالة</th>
                <th>الوقت</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let log of aiUsageLogs">
                <td>{{ log.function_type }}</td>
                <td>{{ log.provider_name }}</td>
                <td>{{ log.store_name || 'إدارة المنصة' }}</td>
                <td>{{ log.output_size }}</td>
                <td>\${{ log.estimated_cost_usd | number: '1.4-4' }}</td>
                <td>
                  <span class="status-tag" [class.active]="log.status === 'success'">{{
                    log.status
                  }}</span>
                </td>
                <td>{{ log.created_at }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- MODAL: MANUAL STATUS OVERRIDE -->
      <div class="modal-backdrop" *ngIf="selectedOrderForOverride()">
        <div class="modal-dialog">
          <h4>تدخل يدوي في حالة الطلب #{{ selectedOrderForOverride()?.orderNumber }}</h4>
          <p class="modal-desc">
            يتطلب التدخل اليدوي من الأدمن تسجيل سبب التعديل لأغراض الرقابة وسجل التعديلات (Audit
            Log).
          </p>

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
            <textarea
              [(ngModel)]="overrideReason"
              class="text-input"
              rows="3"
              placeholder="اكتب سبب التعديل بالتفصيل..."
            ></textarea>
          </div>

          <div class="modal-actions">
            <button class="btn btn-outline" (click)="selectedOrderForOverride.set(null)">
              إلغاء
            </button>
            <button
              class="btn btn-primary"
              [disabled]="!overrideReason.trim()"
              (click)="confirmStatusOverride()"
            >
              تأكيد التعديل
            </button>
          </div>
        </div>
      </div>

      <!-- MODAL: OPEN STORE ACCOUNT -->
      <div class="modal-backdrop" *ngIf="showNewStoreModal()">
        <div class="modal-dialog">
          <h4>{{ t.admin.stores.openStoreAccount }}</h4>
          <p class="modal-desc">{{ t.admin.stores.openStoreDesc }}</p>

          <div class="form-group">
            <label>{{ t.admin.stores.storeName }} *</label>
            <input type="text" [(ngModel)]="newStore.name" class="text-input" placeholder="مثال: مطعم الوردة" />
          </div>

          <div class="form-group">
            <label>{{ t.admin.stores.storeType }} *</label>
            <div style="display: flex; gap: 0.5rem;">
              <button type="button" class="btn" [class.btn-primary]="newStore.type === 'restaurant'" [class.btn-outline]="newStore.type !== 'restaurant'" (click)="newStore.type = 'restaurant'">{{ t.admin.stores.typeRestaurant }}</button>
              <button type="button" class="btn" [class.btn-primary]="newStore.type === 'grocery'" [class.btn-outline]="newStore.type !== 'grocery'" (click)="newStore.type = 'grocery'">{{ t.admin.stores.typeGrocery }}</button>
            </div>
          </div>

          <div class="form-group">
            <label>لوجو النشاط *</label>
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <div style="width: 72px; height: 72px; border-radius: 16px; overflow: hidden; background: #f4efe6; border: 1px dashed #ccc; display: flex; align-items: center; justify-content: center; font-size: 0.75rem;">
                <img *ngIf="newStore.logo" [src]="newStore.logo" alt="" style="width: 100%; height: 100%; object-fit: cover;" />
                <span *ngIf="!newStore.logo">مفيش لوجو</span>
              </div>
              <label class="btn btn-outline" style="cursor: pointer;">
                اختار اللوجو
                <input type="file" accept="image/png,image/jpeg,image/webp" (change)="onStoreLogo($event)" style="display: none;" />
              </label>
            </div>
          </div>

          <div class="form-group">
            <label>رقم تليفون النشاط * <small>(مصري، ١١ رقم يبدأ بـ01)</small></label>
            <input type="tel" inputmode="numeric" [(ngModel)]="newStore.phone" class="text-input" placeholder="01012345678" maxlength="11" />
          </div>

          <div class="form-group">
            <label>المنطقة جوه مدينة قنا *</label>
            <input type="text" [(ngModel)]="newStore.area" class="text-input" placeholder="مثال: وسط البلد، الحميدات" />
          </div>

          <div class="form-group">
            <label>عنوان الفرع الرئيسي بالتفصيل *</label>
            <input type="text" [(ngModel)]="newStore.address" class="text-input" placeholder="الشارع ورقم العقار وأقرب علامة" />
          </div>

          <div class="form-group">
            <label>{{ t.admin.stores.ownerDetails }} (إيميل حساب صاحب النشاط المسجل) *</label>
            <input type="email" [(ngModel)]="newStore.ownerEmail" class="text-input" placeholder="owner@example.com" />
          </div>

          <div *ngIf="storeCreationError" class="error-msg-box">{{ storeCreationError }}</div>

          <div class="modal-actions">
            <button class="btn btn-outline" (click)="closeStoreModal()">إلغاء</button>
            <button class="btn btn-primary" [disabled]="storeSaving" (click)="createStore()">
              {{ t.admin.stores.createAccountBtn }}
            </button>
          </div>
        </div>
      </div>

      <!-- MODAL: CREATE BRANCH MANAGER -->
      <div class="modal-backdrop" *ngIf="showNewBranchManagerModal()">
        <div class="modal-dialog">
          <h4>{{ t.admin.branchManagers.addBtn }}</h4>
          <p class="modal-desc">
            حساب مسؤول الفرع يمنحه صلاحية إدارة واستقبال طلبات الفرع المخصص له فقط.
          </p>

          <div class="form-group">
            <label>{{ t.admin.branchManagers.managerName }} *</label>
            <input
              type="text"
              [(ngModel)]="newManager.name"
              class="text-input"
              placeholder="مثال: يوسف محمود"
            />
          </div>

          <div class="form-group">
            <label>{{ t.admin.branchManagers.email }} *</label>
            <input
              type="email"
              [(ngModel)]="newManager.email"
              class="text-input"
              placeholder="manager@example.com"
            />
          </div>

          <div class="form-group">
            <label>{{ t.admin.branchManagers.phone }} *</label>
            <input
              type="tel"
              [(ngModel)]="newManager.phone"
              class="text-input"
              placeholder="01012345678"
              maxlength="11"
            />
          </div>

          <div class="form-group">
            <label>{{ t.admin.branchManagers.branchSelect }} *</label>
            <select [(ngModel)]="newManager.branchId" class="select-input">
              <option value="">-- {{ t.admin.branchManagers.selectBranchPrompt }} --</option>
              <option *ngFor="let b of availableBranches" [value]="b.id">
                {{ b.name }} ({{ b.storeName }})
              </option>
            </select>
          </div>

          <div *ngIf="managerCreationError" class="error-msg-box">
            {{ managerCreationError }}
          </div>

          <div class="modal-actions">
            <button class="btn btn-outline" (click)="closeBranchManagerModal()">إلغاء</button>
            <button class="btn btn-primary" (click)="createBranchManager()">
              حفظ وإنشاء الحساب
            </button>
          </div>
        </div>
      </div>

      <!-- MODAL: AI ANALYSIS PREVIEW (Transparency & Privacy confirmation) -->
      <div class="modal-backdrop" *ngIf="showAiAnalyzePreviewModal()">
        <div class="modal-dialog">
          <h4>{{ t.admin.ai.analyzePreviewTitle }}</h4>
          <p class="modal-desc">{{ t.admin.ai.analyzePreviewNotice }}</p>

          <div class="preview-payload-box">
            <pre>{{ aiPayloadPreviewJson() }}</pre>
          </div>

          <div class="disclaimer-banner">
            <strong>إقرار وتنبيه:</strong> سيتم إرسال الأرقام الإحصائية المجمعة فقط إلى المزود
            (بدون أي محادثات أو بيانات شخصية)، وستظهر المخرجات كـ
            <em>«{{ t.admin.ai.analyzeDisclaimer }}»</em>.
          </div>

          <div class="modal-actions">
            <button class="btn btn-outline" (click)="showAiAnalyzePreviewModal.set(false)">
              إلغاء
            </button>
            <button
              class="btn btn-warning"
              [disabled]="isAnalyzingAi"
              (click)="confirmAndRunAiAnalysis()"
            >
              {{ isAnalyzingAi ? 'جاري التحليل واستدعاء المزود...' : 'تأكيد وإجراء التحليل' }}
            </button>
          </div>
        </div>
      </div>

      <!-- MODAL: AI ANALYSIS RESULTS -->
      <div class="modal-backdrop" *ngIf="showAiAnalyzeResultModal()">
        <div class="modal-dialog" style="max-width: 650px;">
          <h4>نتائج وتوصيات تحليل الذكاء الاصطناعي</h4>
          <div class="disclaimer-pill">{{ t.admin.ai.analyzeDisclaimer }}</div>

          <div class="ai-result-content">
            <div class="insights-text">
              <p *ngFor="let p of aiResultParagraphs()">{{ p }}</p>
            </div>

            <div class="hypotheses-box" *ngIf="aiResultHypotheses().length > 0">
              <h5>فرضيات مقترحة للاختبار العملي:</h5>
              <ul>
                <li *ngFor="let h of aiResultHypotheses()">{{ h }}</li>
              </ul>
            </div>
          </div>

          <div class="modal-actions">
            <button class="btn btn-primary" (click)="showAiAnalyzeResultModal.set(false)">
              تم الاطلاع وإغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .preview-banner {
        background: #fff8e6;
        border: 1px dashed var(--color-accent);
        color: #7a5b00;
        border-radius: 8px;
        padding: 0.6rem 1rem;
        margin-bottom: 1rem;
        font-size: 0.85rem;
        font-weight: 600;
        text-align: center;
      }

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
      .approved-decision-box {
        background: #f0fff4;
        border: 1px solid #9ae6b4;
        border-radius: 8px;
        padding: 0.85rem 1.25rem;
        margin-bottom: 1.5rem;
        color: #22543d;
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
      .status-tag.active,
      .status-delivered,
      .status-accepted {
        background: #c6f6d5;
        color: #22543d;
      }
      .status-new,
      .status-preparing {
        background: #feebc8;
        color: #744210;
      }
      .status-cancelled,
      .status-rejected {
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
      .search-input,
      .select-input,
      .text-input {
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
        max-height: 92vh;
        max-height: 92dvh;
        overflow-y: auto;
        overscroll-behavior: contain;
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
        position: sticky;
        bottom: -1.75rem;
        background: #fff;
        padding: 0.75rem 0 0.25rem;
        border-top: 1px solid #eee;
      }
      .branch-pill {
        background: #e2e8f0;
        color: #2d3748;
        padding: 0.2rem 0.55rem;
        border-radius: 4px;
        font-size: 0.78rem;
        font-weight: 600;
      }
      .error-msg-box {
        margin-top: 0.75rem;
        padding: 0.65rem 0.85rem;
        background: #fff5f5;
        border: 1px solid #feb2b2;
        border-radius: 6px;
        color: #c53030;
        font-size: 0.88rem;
      }
      .period-filter-wrap {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex-wrap: wrap;
      }
      .cash-stat-banner {
        background: #fdfbf7;
        border: 2px solid var(--color-accent);
        border-radius: 12px;
        padding: 1.25rem 1.5rem;
        margin-bottom: 2rem;
        display: flex;
        align-items: center;
        gap: 1.25rem;
      }
      .cash-icon {
        font-size: 2.5rem;
      }
      .cash-title {
        display: block;
        font-size: 1rem;
        font-weight: 700;
        color: var(--color-primary);
      }
      .cash-value {
        display: block;
        font-size: 1.8rem;
        font-weight: 700;
        color: #276749;
        margin: 0.25rem 0;
      }
      .cash-note {
        display: block;
        font-size: 0.8rem;
        color: var(--color-text-muted);
      }
      .sub-heading {
        margin: 1.5rem 0 1rem;
        font-family: var(--font-heading);
        color: var(--color-primary);
        font-size: 1.15rem;
      }
      .status-summary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
        gap: 0.75rem;
        margin-bottom: 2rem;
      }
      .status-box {
        background: #f7fafc;
        border: 1px solid var(--color-border);
        border-radius: 8px;
        padding: 0.85rem;
        text-align: center;
      }
      .status-box span {
        display: block;
        font-size: 0.82rem;
        color: var(--color-text-muted);
        margin-bottom: 0.35rem;
      }
      .status-box strong {
        font-size: 1.4rem;
        color: var(--color-text);
      }
      .breakdown-two-cols {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
        gap: 1.5rem;
        margin-top: 1.5rem;
      }
      .breakdown-card {
        background: #fdfbf7;
        border: 1px solid var(--color-border);
        border-radius: 10px;
        padding: 1.25rem;
      }
      .privacy-note {
        font-size: 0.8rem;
        color: var(--color-text-muted);
        margin-top: 0.75rem;
        line-height: 1.4;
      }
      .count-tag {
        background: #edf2f7;
        padding: 0.2rem 0.6rem;
        border-radius: 12px;
        font-weight: 700;
      }
      .ai-top-actions {
        display: flex;
        gap: 0.75rem;
        flex-wrap: wrap;
      }
      .alert-box-danger {
        background: #fff5f5;
        border: 1.5px solid #feb2b2;
        border-radius: 8px;
        padding: 1rem 1.25rem;
        margin-bottom: 1.5rem;
        color: #c53030;
        font-size: 0.95rem;
      }
      .ai-functions-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
        gap: 1.25rem;
        margin-bottom: 2rem;
      }
      .ai-config-card {
        background: #fdfbf7;
        border: 1px solid var(--color-border);
        border-radius: 10px;
        padding: 1.25rem;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        gap: 1rem;
      }
      .ai-config-card h4 {
        margin: 0;
        font-family: var(--font-heading);
        color: var(--color-primary);
        font-size: 1.05rem;
      }
      .form-row {
        display: flex;
        gap: 0.75rem;
      }
      .col {
        flex: 1;
      }
      .card-footer-actions {
        display: flex;
        justify-content: space-between;
        gap: 0.5rem;
        border-top: 1px dashed var(--color-border);
        padding-top: 0.85rem;
      }
      .text-success {
        color: #276749;
      }
      .preview-payload-box {
        background: #2d3748;
        color: #e2e8f0;
        padding: 1rem;
        border-radius: 8px;
        max-height: 200px;
        overflow-y: auto;
        font-family: monospace;
        font-size: 0.82rem;
        direction: ltr;
        text-align: left;
        margin-bottom: 1rem;
      }
      .disclaimer-banner {
        background: #fffaf0;
        border: 1px solid #fbd38d;
        border-radius: 8px;
        padding: 0.85rem;
        font-size: 0.85rem;
        color: #9c4221;
        margin-bottom: 1.25rem;
      }
      .disclaimer-pill {
        display: inline-block;
        background: #fffaf0;
        border: 1px solid #fbd38d;
        border-radius: 20px;
        padding: 0.35rem 0.85rem;
        font-size: 0.82rem;
        color: #9c4221;
        margin-bottom: 1rem;
      }
      .ai-result-content {
        line-height: 1.6;
        font-size: 0.92rem;
      }
      .hypotheses-box {
        background: #f0fff4;
        border: 1px solid #9ae6b4;
        border-radius: 8px;
        padding: 1rem;
        margin-top: 1rem;
      }
      .hypotheses-box h5 {
        margin: 0 0 0.5rem;
        color: #22543d;
      }
      .hypotheses-box ul {
        margin: 0;
        padding-right: 1.25rem;
      }
      .empty-state {
        text-align: center;
        padding: 2.5rem 1rem;
        color: var(--color-text-muted);
        font-size: 0.95rem;
      }
    `,
  ],
})
export class AdminDashboardComponent implements OnInit {
  protected readonly t = AR_TRANSLATIONS;

  private readonly api = inject(ApiService);
  private readonly cdr = inject(ChangeDetectorRef);

  activeTab = signal<
    | 'stores'
    | 'orders'
    | 'customers'
    | 'join_requests'
    | 'branch_managers'
    | 'settings'
    | 'analytics'
    | 'ai'
  >('stores');
  showNewStoreModal = signal<boolean>(false);
  showNewBranchManagerModal = signal<boolean>(false);
  newStore = this.emptyStore();
  storeCreationError = '';
  storeSaving = false;
  showAiAnalyzePreviewModal = signal<boolean>(false);
  showAiAnalyzeResultModal = signal<boolean>(false);
  selectedOrderForOverride = signal<any | null>(null);

  loading = true;
  loadError = '';
  actionError = '';
  actionSuccess = '';

  orderStatusFilter = 'all';
  customerSearchQuery = '';
  overrideNewStatus = 'cancelled';
  overrideReason = '';
  managerCreationError = '';

  analyticsPeriod: 'today' | 'week' | 'month' | 'all' = 'all';
  aiKillSwitchActive: boolean = false;
  isAnalyzingAi: boolean = false;
  aiResultText: string = '';
  aiResultHypothesesList: string[] = [];

  analyticsData: any = {
    period: 'all',
    users: {
      total_customers: 0,
      active_customers_in_period: 0,
      total_merchants: 0,
      total_branch_managers: 0,
    },
    orders: {
      total_orders: 0,
      by_status: {},
      unaccepted_delayed_count: 0,
    },
    cash_summary: {
      delivered_cash_total_egp: 0,
      currency: 'EGP',
      label: 'قيمة الطلبات المسلّمة (كاش عند الاستلام، غير محصّلة إلكترونيًا)',
    },
    locations_aggregated: [],
    stores_activity: [],
  };

  aiSettings: any = {
    text_analysis: { provider_name: '', api_key_input: '', is_configured: false, masked_key: '', cost_limit_daily_usd: 0, cost_limit_monthly_usd: 0 },
    image_ocr_menu: { provider_name: '', api_key_input: '', is_configured: false, masked_key: '', store_daily_quota: 0, cost_limit_daily_usd: 0 },
    image_generation: { provider_name: '', api_key_input: '', is_configured: false, masked_key: '', store_daily_quota: 0, cost_limit_daily_usd: 0 },
  };

  aiStores: any[] = [];
  aiUsageLogs: any[] = [];

  newManager = { name: '', email: '', phone: '', branchId: '' };

  availableBranches: any[] = [];
  branchManagers: any[] = [];

  settings: any = {
    subscription_contact_number: '',
    unaccepted_order_alert_minutes: 10,
    order_rate_limit_per_minute: 5,
  };

  testZones: any[] = [];

  stores: any[] = [];
  orders: any[] = [];
  customers: any[] = [];
  joinRequests: any[] = [];
  joinRequestsLoaded = false;
  pendingJoinCount = () => this.joinRequests.filter((r) => r.status === 'pending').length;

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.loading = true;
    this.loadError = '';
    let failed = false;
    const fail = (err: { message?: string }) => {
      failed = true;
      this.loadError = err?.message || 'تعذر تحميل بيانات اللوحة';
      this.loading = false;
      this.cdr.markForCheck();
    };

    this.api.getAdminStores().subscribe({
      next: (stores) => {
        this.stores = stores.map((s: any) => ({
          id: s.id,
          name: s.name,
          type: s.type,
          owner: s.users?.[0]?.name ?? '',
          phone: s.users?.[0]?.phone ?? '',
          active: !!s.is_active,
          is_frozen: !!s.ai_frozen,
          freeze_reason: s.ai_freeze_reason ?? '',
          businessPhone: s.branches?.[0]?.phone ?? '',
          subscriptionActive: !!s.subscription_active,
          subscriptionEnds: s.subscription_ends_at ?? '',
        }));
        this.availableBranches = stores.flatMap((s: any) =>
          (s.branches ?? []).map((b: any) => ({ id: b.id, name: b.name, storeName: s.name })),
        );
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: fail,
    });

    this.api.getAdminOrders().subscribe({
      next: (data: any) => {
        const list = Array.isArray(data) ? data : (data.orders ?? []);
        this.orders = list.map((o: any) => this.toViewOrder(o));
        this.cdr.markForCheck();
      },
      error: fail,
    });

    this.api.getAdminCustomers().subscribe({
      next: (customers) => {
        this.customers = customers.map((c: any) => ({
          id: c.id,
          name: c.name,
          phone: c.phone ?? '',
          email: c.email ?? '',
          status: c.status,
        }));
        this.cdr.markForCheck();
      },
      error: fail,
    });

    this.api.getAdminMerchantApplications().subscribe({
      next: (apps) => {
        this.joinRequests = apps;
        this.joinRequestsLoaded = true;
        this.cdr.markForCheck();
      },
      error: fail,
    });

    this.api.getAdminBranchManagers().subscribe({
      next: (managers) => {
        this.branchManagers = managers.map((m: any) => {
          const branch = m.managed_branches?.[0];
          return {
            id: m.id,
            name: m.name,
            phone: m.phone ?? '',
            email: m.email ?? '',
            branchId: branch?.id ?? null,
            branchName: branch?.name ?? '',
            storeName: branch?.store?.name ?? '',
            status: m.status,
          };
        });
        this.cdr.markForCheck();
      },
      error: fail,
    });

    this.api.getAdminSettings().subscribe({
      next: (settings) => {
        this.settings = { ...this.settings, ...settings };
        this.cdr.markForCheck();
      },
      error: fail,
    });

    this.loadAnalytics();
    this.loadAiData();
  }

  approveJoinRequest(req: any): void {
    this.actionError = '';
    this.actionSuccess = '';
    this.api.approveMerchantApplication(req.id).subscribe({
      next: () => {
        req.status = 'approved';
        const message = this.t.admin.joinRequests.approvedSuccess + ': ' + req.business_name;
        this.actionSuccess = message;
        // The approval created a real store and branches: refresh the stores,
        // branch managers and counters so the admin sees them immediately.
        this.loadAll();
        this.actionSuccess = message;
        this.cdr.markForCheck();
      },
      error: (err: { message?: string }) => {
        this.actionError = err?.message || 'الإجراء ما تمش. جرّب تاني';
        this.cdr.markForCheck();
      },
    });
  }

  rejectJoinRequest(req: any): void {
    const note = window.prompt(this.t.admin.joinRequests.rejectReasonPrompt);
    if (!note) {
      return;
    }
    this.actionError = '';
    this.actionSuccess = '';
    this.api.rejectMerchantApplication(req.id, note).subscribe({
      next: () => {
        req.status = 'rejected';
        req.admin_note = note;
        this.actionSuccess = this.t.admin.joinRequests.rejectedSuccess;
        this.cdr.markForCheck();
      },
      error: (err: { message?: string }) => {
        this.actionError = err?.message || 'الإجراء ما تمش. جرّب تاني';
        this.cdr.markForCheck();
      },
    });
  }

  private toViewOrder(o: any): any {
    const minutesAgo = o.created_at
      ? Math.max(0, Math.round((Date.now() - new Date(o.created_at).getTime()) / 60000))
      : 0;
    return {
      id: o.id,
      orderNumber: o.order_number,
      storeName: o.store?.name ?? '',
      customerName: o.customer_name,
      customerPhone: o.customer_phone,
      grandTotal: parseFloat(o.grand_total),
      status: o.status,
      minutesAgo,
      isDelayed:
        o.status === 'new' && minutesAgo >= (this.settings.unaccepted_order_alert_minutes || 10),
    };
  }

  private loadAnalytics(): void {
    this.api.getAdminAnalytics(this.analyticsPeriod).subscribe({
      next: (data) => {
        this.analyticsData = { ...this.analyticsData, ...data };
        this.cdr.markForCheck();
      },
      error: () => this.cdr.markForCheck(),
    });
  }

  private loadAiData(): void {
    this.api.getAdminAiSettings().subscribe({
      next: (data: any) => {
        if (data?.functions) {
          for (const key of Object.keys(this.aiSettings)) {
            if (data.functions[key]) {
              this.aiSettings[key] = { ...this.aiSettings[key], ...data.functions[key], api_key_input: '' };
            }
          }
          this.aiKillSwitchActive = !!data.kill_switch_active;
        } else if (data) {
          this.aiSettings = { ...this.aiSettings, ...data };
        }
        this.cdr.markForCheck();
      },
      error: () => this.cdr.markForCheck(),
    });
    this.api.getAdminAiStoresQuota().subscribe({
      next: (data: any) => {
        const list = Array.isArray(data) ? data : (data.stores ?? []);
        this.aiStores = list.map((s: any) => ({
          id: s.id ?? s.store_id,
          name: s.name ?? s.store_name,
          is_frozen: !!(s.is_frozen ?? s.ai_frozen),
          freeze_reason: s.freeze_reason ?? '',
        }));
        this.cdr.markForCheck();
      },
      error: () => this.cdr.markForCheck(),
    });
    this.api.getAdminAiUsageLogs().subscribe({
      next: (data: any) => {
        const list = Array.isArray(data) ? data : (data.logs ?? []);
        this.aiUsageLogs = list;
        this.cdr.markForCheck();
      },
      error: () => this.cdr.markForCheck(),
    });
  }

  unacceptedAlertCount() {
    return this.orders.filter(
      (o) => o.status === 'new' && o.minutesAgo >= this.settings.unaccepted_order_alert_minutes,
    ).length;
  }

  filteredOrders() {
    if (this.orderStatusFilter === 'all') return this.orders;
    return this.orders.filter((o) => o.status === this.orderStatusFilter);
  }

  filteredCustomers() {
    if (!this.customerSearchQuery.trim()) return this.customers;
    const q = this.customerSearchQuery.trim();
    return this.customers.filter(
      (c) => c.name.includes(q) || c.phone.includes(q) || c.email.includes(q),
    );
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      new: 'طلب جديد',
      accepted: 'تم القبول',
      preparing: 'جاري التحضير',
      out_for_delivery: 'خرج للتوصيل',
      delivered: 'تم التوصيل',
      cancelled: 'ملغي',
      rejected: 'معتذر عنه',
    };
    return map[status] || status;
  }

  emptyStore() {
    return {
      name: '',
      type: '' as '' | 'restaurant' | 'grocery',
      logo: '',
      phone: '',
      area: '',
      address: '',
      ownerEmail: '',
    };
  }

  closeStoreModal() {
    this.showNewStoreModal.set(false);
    this.newStore = this.emptyStore();
    this.storeCreationError = '';
  }

  async onStoreLogo(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const data = await squareLogoFromFile(file);
    this.storeCreationError = data ? '' : 'الصورة دي مش مناسبة. اختار صورة PNG أو JPG أو WebP أصغر من ٨ ميجا';
    if (data) this.newStore.logo = data;
    this.cdr.markForCheck();
  }

  createStore() {
    const s = this.newStore;
    this.storeCreationError = '';
    if (!s.name.trim() || !s.type || !s.logo || !s.area.trim() || !s.address.trim() || !s.ownerEmail.trim()) {
      this.storeCreationError = 'كمّل كل البيانات المطلوبة: الاسم والنوع واللوجو والمنطقة والعنوان وإيميل المالك';
      return;
    }
    if (!/^01[0125][0-9]{8}$/.test(s.phone)) {
      this.storeCreationError = 'رقم التليفون لازم يكون مصري (يبدأ بـ01 ويتكوّن من ١١ رقم)';
      return;
    }
    this.storeSaving = true;
    this.api
      .createAdminStore({
        name: s.name.trim(),
        type: s.type,
        owner_email: s.ownerEmail.trim(),
        branch_name: 'الفرع الرئيسي',
        branch_address: s.address.trim(),
        branch_phone: s.phone,
        area_name: s.area.trim(),
        logo: s.logo,
      })
      .subscribe({
        next: (store) => {
          this.storeSaving = false;
          this.actionSuccess = this.t.admin.stores.accountOpenedSuccess.replace('{name}', s.name.trim());
          this.closeStoreModal();
          this.stores = [
            { id: store?.id, name: store?.name ?? s.name, type: s.type, owner: store?.users?.[0]?.name ?? '', phone: s.phone, active: true, is_frozen: false, freeze_reason: '' },
            ...this.stores,
          ];
          this.cdr.markForCheck();
        },
        error: (err: { message?: string }) => {
          this.storeSaving = false;
          this.storeCreationError = err?.message || this.t.admin.stores.accountOpenError;
          this.cdr.markForCheck();
        },
      });
  }

  activateSubscription(store: any) {
    const ends = prompt(
      'تاريخ نهاية الاشتراك (مثال 2026-12-31). سيبه فاضي لو من غير نهاية:',
      store.subscriptionEnds || '',
    );
    if (ends === null) return;
    const endsAt = ends.trim();
    if (endsAt && !/^\d{4}-\d{2}-\d{2}$/.test(endsAt)) {
      this.actionError = 'اكتب التاريخ بالشكل ده: 2026-12-31';
      this.cdr.markForCheck();
      return;
    }
    this.actionError = '';
    this.api.setStoreSubscription(store.id, { active: true, ends_at: endsAt || null }).subscribe({
      next: (s) => {
        store.subscriptionActive = !!s.subscription_active;
        store.subscriptionEnds = s.subscription_ends_at ?? '';
        this.cdr.markForCheck();
      },
      error: (err: { message?: string }) => {
        this.actionError = err?.message || 'تعذر تفعيل الاشتراك';
        this.cdr.markForCheck();
      },
    });
  }

  endSubscription(store: any) {
    if (!confirm('إنهاء اشتراك ' + store.name + '؟ هيفضل ظاهر بس مش هيقدر يضيف أطباق.')) return;
    this.actionError = '';
    this.api.setStoreSubscription(store.id, { active: false }).subscribe({
      next: () => {
        store.subscriptionActive = false;
        store.subscriptionEnds = '';
        this.cdr.markForCheck();
      },
      error: (err: { message?: string }) => {
        this.actionError = err?.message || 'تعذر إنهاء الاشتراك';
        this.cdr.markForCheck();
      },
    });
  }

  toggleStoreStatus(store: any) {
    const next = !store.active;
    const reason = prompt(next ? 'سبب إعادة تفعيل المتجر:' : 'سبب إيقاف المتجر:');
    if (!reason || !reason.trim()) return;
    this.actionError = '';
    this.api.toggleAdminStoreStatus(store.id, next, reason.trim()).subscribe({
      next: () => {
        store.active = next;
        this.cdr.markForCheck();
      },
      error: (err: { message?: string }) => {
        this.actionError = err?.message || 'تعذر تحديث حالة المتجر';
        this.cdr.markForCheck();
      },
    });
  }

  toggleCustomerStatus(cust: any) {
    const next = cust.status === 'active' ? 'suspended' : 'active';
    const reason = prompt(next === 'suspended' ? 'سبب إيقاف العميل:' : 'سبب إعادة تفعيل العميل:');
    if (!reason || !reason.trim()) return;
    this.actionError = '';
    this.api.toggleAdminCustomerStatus(cust.id, next, reason.trim()).subscribe({
      next: () => {
        cust.status = next;
        this.cdr.markForCheck();
      },
      error: (err: { message?: string }) => {
        this.actionError = err?.message || 'تعذر تحديث حالة العميل';
        this.cdr.markForCheck();
      },
    });
  }

  openStatusOverrideModal(order: any) {
    this.selectedOrderForOverride.set(order);
  }

  confirmStatusOverride() {
    const ord = this.selectedOrderForOverride();
    if (!ord) return;
    if (!this.overrideReason.trim()) {
      this.actionError = 'سبب التدخل اليدوي إلزامي';
      this.cdr.markForCheck();
      return;
    }
    this.actionError = '';
    this.api.overrideAdminOrderStatus(ord.id, this.overrideNewStatus, this.overrideReason.trim()).subscribe({
      next: () => {
        ord.status = this.overrideNewStatus;
        this.selectedOrderForOverride.set(null);
        this.overrideReason = '';
        this.cdr.markForCheck();
      },
      error: (err: { message?: string }) => {
        this.actionError = err?.message || 'تعذر تعديل حالة الطلب';
        this.selectedOrderForOverride.set(null);
        this.cdr.markForCheck();
      },
    });
  }

  openBranchManagerModal() {
    this.managerCreationError = '';
    this.showNewBranchManagerModal.set(true);
  }

  closeBranchManagerModal() {
    this.showNewBranchManagerModal.set(false);
    this.newManager = { name: '', email: '', phone: '', branchId: '' };
    this.managerCreationError = '';
  }

  createBranchManager() {
    this.managerCreationError = '';

    if (
      !this.newManager.name.trim() ||
      !this.newManager.email.trim() ||
      !this.newManager.phone.trim()
    ) {
      this.managerCreationError = 'يرجى استكمال جميع بيانات المسؤول المطلوبة';
      return;
    }

    if (!this.newManager.branchId) {
      this.managerCreationError = this.t.admin.branchManagers.branchRequired;
      return;
    }

    if (!/^01[0125][0-9]{8}$/.test(this.newManager.phone.trim())) {
      this.managerCreationError = this.t.customer.checkout.phoneInvalid;
      return;
    }

    const exists = this.branchManagers.some(
      (bm) =>
        bm.email.toLowerCase() === this.newManager.email.trim().toLowerCase() ||
        bm.phone === this.newManager.phone.trim(),
    );
    if (exists) {
      this.managerCreationError = this.t.admin.branchManagers.accountExists;
      return;
    }

    const branch = this.availableBranches.find((b) => b.id === Number(this.newManager.branchId));
    if (!branch) {
      this.managerCreationError = this.t.admin.branchManagers.branchRequired;
      return;
    }

    this.api
      .createAdminBranchManager({
        name: this.newManager.name.trim(),
        email: this.newManager.email.trim(),
        phone: this.newManager.phone.trim(),
        branch_id: branch.id,
      })
      .subscribe({
        next: (created: any) => {
          this.branchManagers.push({
            id: created?.id ?? created?.user?.id ?? Date.now(),
            name: this.newManager.name.trim(),
            email: this.newManager.email.trim(),
            phone: this.newManager.phone.trim(),
            branchId: branch.id,
            branchName: branch.name,
            storeName: branch.storeName,
            status: 'active',
          });
          this.closeBranchManagerModal();
          const successMsg = this.t.admin.branchManagers.createdSuccess.replace(
            '{branchName}',
            branch.name,
          );
          this.actionSuccess = successMsg;
          this.cdr.markForCheck();
        },
        error: (err: { message?: string }) => {
          this.managerCreationError = err?.message || 'تعذر إنشاء حساب المسؤول';
          this.cdr.markForCheck();
        },
      });
  }

  toggleBranchManagerStatus(bm: any) {
    const reason = prompt(this.t.admin.branchManagers.confirmReasonPrompt);
    if (!reason || !reason.trim()) return;
    const next = bm.status === 'active' ? 'suspended' : 'active';
    this.actionError = '';
    this.api.toggleAdminBranchManagerStatus(bm.id, next, reason.trim()).subscribe({
      next: () => {
        bm.status = next;
        this.cdr.markForCheck();
      },
      error: (err: { message?: string }) => {
        this.actionError = err?.message || 'تعذر تحديث حالة المسؤول';
        this.cdr.markForCheck();
      },
    });
  }

  setAnalyticsPeriod(period: 'today' | 'week' | 'month' | 'all') {
    this.analyticsPeriod = period;
    this.loadAnalytics();
  }

  toggleKillSwitch() {
    const next = !this.aiKillSwitchActive;
    this.actionError = '';
    this.api.toggleAdminAiKillSwitch(next).subscribe({
      next: () => {
        this.aiKillSwitchActive = next;
        this.actionSuccess = next
          ? 'تم تفعيل الإيقاف الطارئ لخدمات الذكاء الاصطناعي بنجاح'
          : 'تم إلغاء الإيقاف الطارئ وإعادة تفعيل خدمات الذكاء الاصطناعي';
        this.cdr.markForCheck();
      },
      error: (err: { message?: string }) => {
        this.actionError = err?.message || 'تعذر تحديث مفتاح الإيقاف الطارئ';
        this.cdr.markForCheck();
      },
    });
  }

  saveAiSettings(fnType: string) {
    const s = this.aiSettings[fnType];
    if (!s) return;
    this.actionError = '';
    const payload: Record<string, unknown> = {
      provider_name: s.provider_name,
      cost_limit_daily_usd: s.cost_limit_daily_usd,
      cost_limit_monthly_usd: s.cost_limit_monthly_usd,
      store_daily_quota: s.store_daily_quota,
    };
    if (s.api_key_input) payload['api_key'] = s.api_key_input;
    this.api.saveAdminAiSettings(fnType, payload).subscribe({
      next: () => {
        this.actionSuccess = 'تم حفظ إعدادات الوظيفة بنجاح';
        this.cdr.markForCheck();
      },
      error: (err: { message?: string }) => {
        this.actionError = err?.message || 'تعذر حفظ الإعدادات';
        this.cdr.markForCheck();
      },
    });
  }

  testAiConnection(fnType: string) {
    this.actionError = '';
    this.api.testAdminAiConnection(fnType).subscribe({
      next: () => {
        this.actionSuccess = 'الاتصال بالمزود ناجح ومستقر';
        this.cdr.markForCheck();
      },
      error: (err: { message?: string }) => {
        this.actionError = err?.message || 'فشل فحص الاتصال بالمزود';
        this.cdr.markForCheck();
      },
    });
  }

  toggleStoreFreeze(store: any) {
    const freeze = !store.is_frozen;
    const reason = freeze ? (prompt('اكتب سبب تجميد الـ AI لهذا المتجر:') || 'إيقاف إداري') : 'فك تجميد إداري';
    this.actionError = '';
    this.api.toggleAdminStoreFreeze(store.id, freeze, reason).subscribe({
      next: () => {
        store.is_frozen = freeze;
        store.freeze_reason = freeze ? reason : '';
        this.cdr.markForCheck();
      },
      error: (err: { message?: string }) => {
        this.actionError = err?.message || 'تعذر تحديث حالة تجميد المتجر';
        this.cdr.markForCheck();
      },
    });
  }

  openAiAnalyzePreviewModal() {
    this.showAiAnalyzePreviewModal.set(true);
  }

  aiPayloadPreviewJson(): string {
    return JSON.stringify(
      {
        scope: 'Qena City, Egypt',
        period: this.analyticsPeriod,
        total_orders: this.analyticsData.orders.total_orders,
        delivered_orders: this.analyticsData.orders.by_status?.delivered ?? 0,
        total_customers: this.analyticsData.users.total_customers,
        active_customers: this.analyticsData.users.active_customers_in_period,
        delivered_cash_value_egp: this.analyticsData.cash_summary.delivered_cash_total_egp,
        locations_summary: this.analyticsData.locations_aggregated,
        stores_count: this.analyticsData.stores_activity.length,
      },
      null,
      2,
    );
  }

  confirmAndRunAiAnalysis() {
    this.isAnalyzingAi = true;
    this.actionError = '';
    this.api.analyzeAdminPlatform(JSON.parse(this.aiPayloadPreviewJson())).subscribe({
      next: (result: any) => {
        this.isAnalyzingAi = false;
        this.showAiAnalyzePreviewModal.set(false);
        this.aiResultText = result?.analysis ?? result?.text ?? '';
        this.aiResultHypothesesList = result?.hypotheses ?? [];
        this.showAiAnalyzeResultModal.set(true);
        this.cdr.markForCheck();
      },
      error: (err: { message?: string }) => {
        this.isAnalyzingAi = false;
        this.showAiAnalyzePreviewModal.set(false);
        this.actionError = err?.message || 'تعذر تشغيل التحليل. تأكد من إعداد مزود الذكاء الاصطناعي';
        this.cdr.markForCheck();
      },
    });
  }

  aiResultParagraphs(): string[] {
    return this.aiResultText.split('\n').filter((p) => p.trim().length > 0);
  }

  aiResultHypotheses(): string[] {
    return this.aiResultHypothesesList;
  }

  saveSettings() {
    this.actionError = '';
    this.api
      .saveAdminSettings({
        subscription_contact_number: this.settings.subscription_contact_number,
        unaccepted_order_alert_minutes: this.settings.unaccepted_order_alert_minutes,
        order_rate_limit_per_minute: this.settings.order_rate_limit_per_minute,
      })
      .subscribe({
        next: () => {
          this.actionSuccess = 'تم حفظ إعدادات المنصة بنجاح';
          this.cdr.markForCheck();
        },
        error: (err: { message?: string }) => {
          this.actionError = err?.message || 'تعذر حفظ الإعدادات';
          this.cdr.markForCheck();
        },
      });
  }
}
