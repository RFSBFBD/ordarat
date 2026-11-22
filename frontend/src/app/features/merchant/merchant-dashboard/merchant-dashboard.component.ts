import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AR_TRANSLATIONS } from '../../../core/constants/translations';

@Component({
  selector: 'app-merchant-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="merchant-dashboard">
      <!-- Header -->
      <div class="dash-header">
        <div>
          <h2 class="title">{{ currentStore.name }}</h2>
          <span class="store-type-badge"
            >{{ currentStore.type === 'restaurant' ? 'مطعم' : 'بقالة' }} - قنا</span
          >
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
            <span class="status-label">استقبال الطلبات:</span>
            <button
              class="toggle-btn"
              [class.active]="currentStore.is_accepting_orders"
              (click)="toggleReceiving()"
            >
              {{ currentStore.is_accepting_orders ? 'مفتوح للطلبات' : 'مغلق حالياً' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="tabs-nav">
        <button
          class="tab-btn"
          [class.active]="activeTab() === 'orders'"
          (click)="activeTab.set('orders')"
        >
          قائمة الطلبات
          <span class="badge-new" *ngIf="newOrdersCount() > 0">{{ newOrdersCount() }} جديد</span>
        </button>
        <button
          class="tab-btn"
          [class.active]="activeTab() === 'products'"
          (click)="activeTab.set('products')"
        >
          المنتجات والأصناف ({{ products.length }})
        </button>
        <button
          class="tab-btn"
          [class.active]="activeTab() === 'branches'"
          (click)="activeTab.set('branches')"
        >
          الفروع ومواعيد العمل
        </button>
        <button
          class="tab-btn"
          [class.active]="activeTab() === 'zones'"
          (click)="activeTab.set('zones')"
        >
          مناطق وأسعار التوصيل
        </button>
        <button
          class="tab-btn"
          [class.active]="activeTab() === 'ai_tools'"
          (click)="activeTab.set('ai_tools')"
        >
          ✨ {{ t.store.aiTools.tabTitle }}
        </button>
      </div>

      <!-- TAB 1: ORDERS QUEUE -->
      <div *ngIf="activeTab() === 'orders'">
        <!-- Branch Cards Summary Overview -->
        <div class="branches-overview-section" *ngIf="branches.length > 0">
          <div class="section-subtitle-row">
            <h4>📍 نظرة عامة على فروع المتجر في قنا</h4>
            <span class="hint-text">تُوجّه الطلبات تلقائياً لأقرب فرع لموقع العميل</span>
          </div>
          <div class="branch-summary-cards">
            <div class="branch-summary-card" *ngFor="let b of branches">
              <div class="bsc-header">
                <strong>{{ b.name }}</strong>
                <span class="bsc-status" [class.open]="b.is_accepting_orders">
                  {{ b.is_accepting_orders ? 'مفتوح للطلبات' : 'مغلق مؤقتاً' }}
                </span>
              </div>
              <div class="bsc-body">
                <p>⏰ مواعيد العمل: {{ b.working_hours.open }} - {{ b.working_hours.close }}</p>
                <p>
                  🔔 طلبات الفرع الجديدة: <strong>{{ getBranchNewOrdersCount(b.id) }}</strong>
                </p>
              </div>
              <div class="bsc-footer">
                <button
                  class="btn btn-sm"
                  [class.btn-warning]="b.is_accepting_orders"
                  [class.btn-success]="!b.is_accepting_orders"
                  (click)="toggleBranchReceiving(b)"
                >
                  {{ b.is_accepting_orders ? 'إيقاف استقبال الطلبات' : 'فتح استقبال الطلبات' }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Stats Grid -->
        <div class="stats-grid">
          <div class="stat-card alert-stat" [class.has-new]="newOrdersCount() > 0">
            <span class="stat-num">{{ newOrdersCount() }}</span>
            <span class="stat-label">طلبات بانتظار القبول</span>
          </div>
          <div class="stat-card">
            <span class="stat-num">{{ activeOrdersCount() }}</span>
            <span class="stat-label">طلبات جارية (تحضير / توصيل)</span>
          </div>
          <div class="stat-card">
            <span class="stat-num">{{ completedOrdersCount() }}</span>
            <span class="stat-label">طلبات مكتملة اليوم</span>
          </div>
          <div class="stat-card">
            <span class="stat-num">{{ todayCashTotal() }} ج.م</span>
            <span class="stat-label">إجمالي الكاش المحصّل</span>
          </div>
        </div>

        <div class="orders-section">
          <div class="section-top">
            <div class="section-title-wrap">
              <h3>الطلبات المباشرة ({{ filteredOrders().length }})</h3>
              <div class="branch-selector-wrap" *ngIf="branches.length > 0">
                <label>فرع الطلبات:</label>
                <select [(ngModel)]="selectedBranchFilter" class="select-input select-sm">
                  <option value="all">كل الفروع ({{ branches.length }})</option>
                  <option *ngFor="let b of branches" [value]="b.id.toString()">{{ b.name }}</option>
                </select>
              </div>
            </div>
            <div class="filter-pills">
              <button
                class="pill-btn"
                [class.active]="orderFilter === 'all'"
                (click)="orderFilter = 'all'"
              >
                الكل
              </button>
              <button
                class="pill-btn"
                [class.active]="orderFilter === 'new'"
                (click)="orderFilter = 'new'"
              >
                جديد ({{ newOrdersCount() }})
              </button>
              <button
                class="pill-btn"
                [class.active]="orderFilter === 'in_progress'"
                (click)="orderFilter = 'in_progress'"
              >
                قيد التنفيذ
              </button>
              <button
                class="pill-btn"
                [class.active]="orderFilter === 'delivered'"
                (click)="orderFilter = 'delivered'"
              >
                تم التوصيل
              </button>
            </div>
          </div>

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
                  <span class="branch-pill">📍 {{ ord.branchName || 'فرع غير محدد' }}</span>
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
                  📝 <em>ملاحظة: {{ ord.notes }}</em>
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

              <div class="order-actions-bar">
                <button
                  *ngIf="ord.status === 'new'"
                  class="btn btn-success"
                  (click)="updateOrderStatus(ord, 'accepted')"
                >
                  ✅ قبول الطلب
                </button>
                <button
                  *ngIf="ord.status === 'new'"
                  class="btn btn-danger-outline"
                  (click)="openRejectModal(ord)"
                >
                  ❌ اعتذار / رفض
                </button>

                <button
                  *ngIf="ord.status === 'accepted'"
                  class="btn btn-primary"
                  (click)="updateOrderStatus(ord, 'preparing')"
                >
                  🍳 بدء التحضير
                </button>

                <button
                  *ngIf="ord.status === 'preparing'"
                  class="btn btn-warning"
                  (click)="updateOrderStatus(ord, 'out_for_delivery')"
                >
                  🛵 تسليم لمندوب المتجر (خرج للتوصيل)
                </button>

                <button
                  *ngIf="ord.status === 'out_for_delivery'"
                  class="btn btn-success"
                  (click)="updateOrderStatus(ord, 'delivered')"
                >
                  🎉 تأكيد استلام العميل وتحصيل الكاش
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 2: PRODUCTS & AVAILABILITY -->
      <div *ngIf="activeTab() === 'products'">
        <div class="products-section">
          <div class="section-top">
            <div>
              <h3>قائمة المنتجات والأسعار</h3>
              <p class="subtitle">
                اضغط على زر التوفر لتحديد الصنف كـ (خلصان) بدون حذفه من القائمة
              </p>
            </div>
            <button class="btn btn-primary" (click)="showNewProductModal.set(true)">
              + إضافة صنف جديد
            </button>
          </div>

          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>اسم الصنف</th>
                  <th>القسم</th>
                  <th>السعر (ج.م)</th>
                  <th>الوصف</th>
                  <th>حالة التوفر</th>
                  <th>الإجراء</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let p of products">
                  <td>
                    <strong>{{ p.name }}</strong>
                  </td>
                  <td>{{ p.categoryName || 'عام' }}</td>
                  <td>
                    <strong>{{ p.price | number: '1.2-2' }} ج.م</strong>
                  </td>
                  <td>{{ p.description || '—' }}</td>
                  <td>
                    <button
                      class="badge-toggle-btn"
                      [class.available]="p.is_available"
                      [class.finished]="!p.is_available"
                      (click)="toggleProductAvailability(p)"
                    >
                      {{ p.is_available ? 'متاح للطلب' : 'خلصان ⚠️' }}
                    </button>
                  </td>
                  <td>
                    <button class="btn btn-sm btn-outline" (click)="editProduct(p)">تعديل</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- TAB 3: BRANCHES & HOURS -->
      <div *ngIf="activeTab() === 'branches'">
        <div class="card-section">
          <div class="section-top">
            <div>
              <h3>فروع المتجر في مدينة قنا</h3>
              <p class="subtitle">
                عند طلب العميل، يحدد النظام أقرب فرع لموقع العميل تلقائياً ويوجّه الطلب إليه
              </p>
            </div>
          </div>

          <div class="branches-grid" *ngIf="branches.length > 0">
            <div class="branch-card" *ngFor="let b of branches">
              <h4>{{ b.name }}</h4>
              <p>📍 {{ b.address }}</p>
              <p>📞 {{ b.phone }}</p>
              <p>⏰ مواعيد العمل: {{ b.working_hours.open }} - {{ b.working_hours.close }}</p>
              <div style="margin-top: 0.75rem; display: flex; gap: 0.5rem; align-items: center;">
                <span class="status-tag" [class.active]="b.is_accepting_orders">
                  {{ b.is_accepting_orders ? 'يستقبل الطلبات' : 'موقف مؤقتاً' }}
                </span>
                <button class="btn btn-sm btn-outline" (click)="toggleBranchReceiving(b)">
                  {{ b.is_accepting_orders ? 'إيقاف' : 'تشغيل' }}
                </button>
              </div>
            </div>
          </div>

          <div class="empty-branches-state" *ngIf="branches.length === 0">
            <p>{{ t.store.branches.emptyBranches }}</p>
          </div>
        </div>
      </div>

      <!-- TAB 4: ZONE PRICING (STORE OWNER DECISION) -->
      <div *ngIf="activeTab() === 'zones'">
        <div class="card-section">
          <div class="section-top">
            <div>
              <h3>تعريف وتعديل أسعار التوصيل لمناطق قنا</h3>
              <p class="subtitle">
                صاحب المتجر هو المسؤول عن تحديد قيمة التوصيل والمناطق المشمولة لكل فرع
              </p>
            </div>
            <button class="btn btn-primary" (click)="saveZoneFees()">حفظ أسعار التوصيل</button>
          </div>

          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>المنطقة في مدينة قنا</th>
                  <th>حالة التغطية</th>
                  <th>سعر التوصيل (ج.م)</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let z of branchZones">
                  <td>
                    <strong>{{ z.name }}</strong>
                  </td>
                  <td>
                    <button
                      class="badge-toggle-btn"
                      [class.available]="z.is_served"
                      [class.finished]="!z.is_served"
                      (click)="z.is_served = !z.is_served"
                    >
                      {{ z.is_served ? 'مشمولة بالتوصيل' : 'غير مغطاة ⚠️' }}
                    </button>
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.5"
                      [(ngModel)]="z.fee"
                      [disabled]="!z.is_served"
                      class="text-input"
                      style="max-width: 120px;"
                    />
                    ج.م
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- TAB 5: AI TOOLS -->
      <div *ngIf="activeTab() === 'ai_tools'" class="ai-tools-tab">
        <!-- Notice if unavailable -->
        <div class="ai-unavailable-card" *ngIf="!aiAvailable()">
          <span class="warning-icon">⚠️</span>
          <div>
            <strong>{{ t.store.aiTools.unavailableNotice }}</strong>
            <p>تم إيقاف المساعد الذكي مؤقتاً أو بانتظار ضبط ميزانية الاستخدام من إدارة المنصة.</p>
          </div>
        </div>

        <div class="ai-grid" *ngIf="aiAvailable()">
          <!-- OCR Menu Card -->
          <div class="ai-feature-card">
            <div class="card-header-badge">
              <h3>📸 {{ t.store.aiTools.menuOcrTitle }}</h3>
              <span class="badge badge-preparing">استخراج مسودة</span>
            </div>
            <p class="feature-desc">{{ t.store.aiTools.menuOcrDesc }}</p>

            <div class="ai-warning-box">
              <span class="warn-icon">🔒</span>
              <div>
                <strong>تنبيه الخصوصية والأمان:</strong>
                <p>{{ t.store.aiTools.consentNotice }}</p>
                <small>{{ t.store.aiTools.cropBlurHelp }}</small>
              </div>
            </div>

            <!-- Upload and Privacy Controls -->
            <div class="upload-zone">
              <input
                type="file"
                id="menuFileInput"
                accept="image/*"
                (change)="onMenuFileSelected($event)"
                class="file-input-hidden"
              />
              <label for="menuFileInput" class="btn btn-outline upload-label">
                📁 اختيار صورة المنيو من جهازك
              </label>
              <span class="file-name" *ngIf="menuImageFileName()">{{ menuImageFileName() }}</span>
            </div>

            <!-- Image Preview & Privacy Crop/Blur -->
            <div class="image-preview-wrapper" *ngIf="menuImagePreview()">
              <div class="preview-toolbar">
                <span class="preview-title">معاينة الصورة قبل الإرسال:</span>
                <button
                  class="btn btn-sm"
                  [class.btn-warning]="isBlurActive()"
                  [class.btn-outline]="!isBlurActive()"
                  (click)="toggleBlur()"
                >
                  {{
                    isBlurActive()
                      ? '🔲 إلغاء طمس البيانات'
                      : '🛡️ تطبيق طمس الخصوصية (أرقام الهواتف)'
                  }}
                </button>
              </div>
              <div class="preview-frame" [class.blurred-overlay]="isBlurActive()">
                <img [src]="menuImagePreview()" alt="معاينة المنيو" class="preview-img" />
                <div class="blur-indicator" *ngIf="isBlurActive()">
                  <span>🛡️ تم تطبيق تمويه الخصوصية للبيانات الحساسة</span>
                </div>
              </div>
            </div>

            <div class="feature-actions">
              <button
                class="btn btn-primary"
                [disabled]="!menuImagePreview() || isExtractingMenu()"
                (click)="extractMenuFromImage()"
              >
                {{
                  isExtractingMenu()
                    ? '⏳ جاري استخراج وقراءة الأصناف...'
                    : '✨ استخراج مسودة المنيو'
                }}
              </button>
            </div>

            <!-- Extracted Drafts Section -->
            <div class="drafts-section" *ngIf="menuDrafts().length > 0">
              <hr class="section-divider" />
              <div class="draft-header-row">
                <h4>📋 {{ t.store.aiTools.draftTitle }}</h4>
                <span class="hint-text"
                  >تظهر كمسودة فقط ولا تُضاف لمتجرك إلا بعد مراجعتك واعتمادك</span
                >
              </div>

              <div class="draft-review-card" *ngFor="let draft of menuDrafts()">
                <div class="draft-meta">
                  <strong>{{ draft.title }}</strong>
                  <span class="badge badge-new">{{ draft.items.length }} صنف مستخرج</span>
                </div>

                <div class="table-responsive">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>الصنف المستخرج</th>
                        <th>التصنيف</th>
                        <th>السعر المقترح</th>
                        <th>ملاحظة التدقيق</th>
                        <th>الاعتماد</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr *ngFor="let item of draft.items">
                        <td>
                          <strong>{{ item.name }}</strong>
                        </td>
                        <td>
                          <span class="category-tag">{{ item.category_name }}</span>
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.5"
                            [(ngModel)]="item.price"
                            class="text-input price-input"
                          />
                          ج.م
                        </td>
                        <td>
                          <span class="badge badge-warning-custom" *ngIf="item.is_ambiguous">
                            ⚠️ سعر غامض (يُرجى التأكيد)
                          </span>
                          <span class="badge badge-accepted" *ngIf="!item.is_ambiguous">
                            ✅ واضح
                          </span>
                        </td>
                        <td>
                          <div class="action-btn-group">
                            <button
                              class="btn btn-sm"
                              [class.btn-success]="item.is_accepted"
                              [class.btn-outline]="!item.is_accepted"
                              (click)="item.is_accepted = !item.is_accepted"
                            >
                              {{ item.is_accepted ? 'معتمد ✅' : 'استبعاد' }}
                            </button>
                            <button
                              class="btn btn-sm btn-danger-outline"
                              (click)="removeDraftItem(draft, item)"
                            >
                              حذف
                            </button>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div class="draft-actions-footer">
                  <button class="btn btn-success" (click)="importAcceptedDraftItems(draft)">
                    🚀 {{ t.store.aiTools.importBtn }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Product Illustrative Image Generator Card -->
          <div class="ai-feature-card">
            <div class="card-header-badge">
              <h3>🎨 {{ t.store.aiTools.imageGenTitle }}</h3>
              <span class="badge badge-accepted">توليد توضيحي</span>
            </div>
            <p class="feature-desc">{{ t.store.aiTools.imageGenDesc }}</p>

            <div class="form-group">
              <label>اسم المنتج المراد توليد صورته:</label>
              <input
                type="text"
                [(ngModel)]="imageGenProductName"
                class="text-input"
                placeholder="مثال: فطيرة مشلتت بالسمن البلدي"
              />
            </div>

            <div class="form-group">
              <label>تصنيف الصنف:</label>
              <select [(ngModel)]="imageGenCategory" class="select-input">
                <option value="مشويات">مشويات</option>
                <option value="طواجن">طواجن</option>
                <option value="سندوتشات">سندوتشات</option>
                <option value="فطائر ومخبوزات">فطائر ومخبوزات</option>
                <option value="مقبلات وسلطات">مقبلات وسلطات</option>
                <option value="مشروبات">مشروبات</option>
                <option value="بقالة وتموين">بقالة وتموين</option>
              </select>
            </div>

            <div class="feature-actions">
              <button
                class="btn btn-primary"
                [disabled]="!imageGenProductName || isGeneratingImage()"
                (click)="generateProductImage()"
              >
                {{
                  isGeneratingImage()
                    ? '⏳ جاري توليد الصورة التوضيحية...'
                    : '✨ توليد صورة توضيحية'
                }}
              </button>
            </div>

            <!-- Generated Image Preview -->
            <div class="generated-preview-card" *ngIf="generatedImage()">
              <div class="preview-badge-row">
                <span class="badge badge-illustrative"
                  >🎨 {{ t.store.aiTools.illustrativeBadge }}</span
                >
                <span class="dedup-hint">تم تحسين الاسم ومطابقته لمنع الازدواجية</span>
              </div>
              <div class="gen-img-container">
                <img [src]="generatedImage()?.url" alt="صورة توضيحية للمنتج" class="gen-img" />
              </div>
              <p class="gen-product-title">
                <strong>{{ generatedImage()?.name }}</strong>
              </p>
              <p class="gen-disclaimer">
                هذه الصورة توضيحية من الذكاء الاصطناعي للمعاينة، ولن تظهر للعملاء إلا بعد اعتمادك
                البشري.
              </p>
              <div class="card-footer-actions">
                <button
                  class="btn btn-success"
                  [disabled]="generatedImage()?.is_approved"
                  (click)="approveGeneratedImage()"
                >
                  {{
                    generatedImage()?.is_approved
                      ? 'تم الاعتماد بنجاح ✅'
                      : t.store.aiTools.approveImageBtn
                  }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- REJECT MODAL -->
      <div class="modal-backdrop" *ngIf="selectedOrderForRejection()">
        <div class="modal-dialog">
          <h4>الاعتذار عن قبول الطلب #{{ selectedOrderForRejection()?.orderNumber }}</h4>
          <p class="modal-desc">برجاء تحديد سبب الاعتذار ليظهر للعميل في شاشة التتبع فوراً.</p>

          <div class="form-group">
            <label>سبب الاعتذار (إلزامي):</label>
            <select [(ngModel)]="rejectionReason" class="select-input">
              <option value="نفاد أحد الأصناف المطلوبة حالياً">
                نفاد أحد الأصناف المطلوبة حالياً
              </option>
              <option value="ضغط طلبات كثيف واكتمال طاقة المطبخ">
                ضغط طلبات كثيف واكتمال طاقة المطبخ
              </option>
              <option value="المحل على وشك الإغلاق">المحل على وشك الإغلاق</option>
              <option value="خارج نطاق تغطية مندوبي المحل">خارج نطاق تغطية مندوبي المحل</option>
            </select>
          </div>

          <div class="modal-actions">
            <button class="btn btn-outline" (click)="selectedOrderForRejection.set(null)">
              تراجع
            </button>
            <button
              class="btn btn-danger"
              [disabled]="!rejectionReason"
              (click)="confirmOrderRejection()"
            >
              تأكيد الاعتذار
            </button>
          </div>
        </div>
      </div>

      <!-- NEW PRODUCT MODAL -->
      <div class="modal-backdrop" *ngIf="showNewProductModal()">
        <div class="modal-dialog">
          <h4>إضافة صنف جديد للمتجر</h4>
          <div class="form-group">
            <label>اسم الصنف:</label>
            <input
              type="text"
              [(ngModel)]="newProduct.name"
              class="text-input"
              placeholder="مثال: بيتزا مارجريتا"
            />
          </div>
          <div class="form-group">
            <label>السعر بالجنيه المصري (دقيق):</label>
            <input
              type="number"
              step="0.5"
              [(ngModel)]="newProduct.price"
              class="text-input"
              placeholder="مثال: 65.00"
            />
          </div>
          <div class="form-group">
            <label>الوصف:</label>
            <textarea
              [(ngModel)]="newProduct.description"
              class="text-input"
              rows="2"
              placeholder="مكونات الصنف..."
            ></textarea>
          </div>
          <div class="modal-actions">
            <button class="btn btn-outline" (click)="showNewProductModal.set(false)">إلغاء</button>
            <button
              class="btn btn-primary"
              [disabled]="!newProduct.name || !newProduct.price"
              (click)="saveNewProduct()"
            >
              حفظ الصنف
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .merchant-dashboard {
        max-width: 1200px;
        margin: 0 auto;
      }
      .dash-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
        border-bottom: 1px solid var(--color-border);
        padding-bottom: 1rem;
        flex-wrap: wrap;
        gap: 1rem;
      }
      .title {
        font-family: var(--font-heading);
        color: var(--color-primary);
        margin: 0;
        font-size: 1.6rem;
      }
      .store-type-badge {
        background: #edf2f7;
        color: var(--color-text-muted);
        padding: 0.2rem 0.6rem;
        border-radius: 4px;
        font-size: 0.85rem;
        margin-top: 0.25rem;
        display: inline-block;
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
        padding: 0.45rem 0.9rem;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.85rem;
        font-weight: 600;
      }
      .sound-toggle-btn.sound-on {
        background: #ebf8ff;
        color: #2b6cb0;
        border-color: #bee3f8;
      }
      .toggle-wrap {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .status-label {
        font-weight: 600;
        font-size: 0.9rem;
      }
      .toggle-btn {
        padding: 0.45rem 1.25rem;
        border-radius: 20px;
        border: none;
        cursor: pointer;
        font-weight: 700;
        background: #e53e3e;
        color: #fff;
        transition: background 0.2s;
      }
      .toggle-btn.active {
        background: #38a169;
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
      .badge-new {
        background: #e53e3e;
        color: #fff;
        padding: 0.15rem 0.45rem;
        border-radius: 10px;
        font-size: 0.75rem;
      }
      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        margin-bottom: 1.5rem;
      }
      .stat-card {
        background: #ffffff;
        padding: 1.25rem;
        border-radius: 12px;
        border: 1px solid var(--color-border);
        text-align: center;
      }
      .stat-card.alert-stat.has-new {
        background: #fff5f5;
        border-color: #feb2b2;
      }
      .stat-num {
        font-size: 1.8rem;
        font-weight: 700;
        color: var(--color-primary);
        display: block;
      }
      .alert-stat.has-new .stat-num {
        color: #e53e3e;
      }
      .stat-label {
        color: var(--color-text-muted);
        font-size: 0.85rem;
        margin-top: 0.25rem;
        display: block;
      }
      .orders-section,
      .products-section,
      .card-section {
        background: #ffffff;
        border-radius: 12px;
        border: 1px solid var(--color-border);
        padding: 1.5rem;
        margin-bottom: 2rem;
      }
      .branches-overview-section {
        background: #ffffff;
        border: 1px solid var(--color-border);
        border-radius: 12px;
        padding: 1.25rem 1.5rem;
        margin-bottom: 1.5rem;
      }
      .section-subtitle-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
        gap: 0.5rem;
        flex-wrap: wrap;
      }
      .section-subtitle-row h4 {
        margin: 0;
        font-family: var(--font-heading);
        color: var(--color-primary);
        font-size: 1.15rem;
      }
      .hint-text {
        font-size: 0.82rem;
        color: var(--color-text-muted);
      }
      .branch-summary-cards {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        gap: 1rem;
      }
      .branch-summary-card {
        background: #fdfbf7;
        border: 1px solid var(--color-border);
        border-radius: 10px;
        padding: 1rem;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        gap: 0.75rem;
      }
      .bsc-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .bsc-status {
        font-size: 0.78rem;
        font-weight: 700;
        padding: 0.2rem 0.55rem;
        border-radius: 4px;
        background: #fed7d7;
        color: #742a2a;
      }
      .bsc-status.open {
        background: #c6f6d5;
        color: #22543d;
      }
      .bsc-body p {
        margin: 0.25rem 0;
        font-size: 0.85rem;
        color: var(--color-text-muted);
      }
      .section-title-wrap {
        display: flex;
        align-items: center;
        gap: 1rem;
        flex-wrap: wrap;
      }
      .branch-selector-wrap {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        font-size: 0.88rem;
        font-weight: 600;
      }
      .select-sm {
        padding: 0.35rem 0.65rem;
        font-size: 0.85rem;
      }
      .order-id-wrap {
        display: flex;
        align-items: center;
        gap: 0.65rem;
        flex-wrap: wrap;
      }
      .branch-pill {
        background: #e2e8f0;
        color: #2d3748;
        padding: 0.2rem 0.55rem;
        border-radius: 4px;
        font-size: 0.78rem;
        font-weight: 600;
      }
      .empty-orders-state,
      .empty-branches-state {
        text-align: center;
        padding: 2.5rem 1rem;
        color: var(--color-text-muted);
        font-size: 0.95rem;
      }
      .section-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.25rem;
        flex-wrap: wrap;
        gap: 1rem;
      }
      .section-top h3 {
        font-family: var(--font-heading);
        margin: 0;
      }
      .subtitle {
        color: var(--color-text-muted);
        font-size: 0.85rem;
        margin: 0.25rem 0 0;
      }
      .filter-pills {
        display: flex;
        gap: 0.4rem;
      }
      .pill-btn {
        background: #f7fafc;
        border: 1px solid var(--color-border);
        padding: 0.35rem 0.75rem;
        border-radius: 20px;
        font-size: 0.85rem;
        cursor: pointer;
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
      }
      .order-num {
        font-family: var(--font-heading);
        font-weight: 700;
        font-size: 1.1rem;
        color: var(--color-primary);
      }
      .order-time {
        margin-right: 0.75rem;
        color: var(--color-text-muted);
        font-size: 0.85rem;
      }
      .customer-info-box {
        font-size: 0.9rem;
        color: var(--color-text);
        margin-bottom: 0.75rem;
      }
      .customer-info-box p {
        margin: 0.2rem 0;
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
      .btn-sm {
        padding: 0.35rem 0.65rem;
        font-size: 0.85rem;
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
      .badge-toggle-btn {
        padding: 0.3rem 0.75rem;
        border-radius: 20px;
        border: none;
        cursor: pointer;
        font-weight: 600;
        font-size: 0.85rem;
      }
      .badge-toggle-btn.available {
        background: #c6f6d5;
        color: #22543d;
      }
      .badge-toggle-btn.finished {
        background: #fed7d7;
        color: #742a2a;
      }
      .branches-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1rem;
        margin-top: 1rem;
      }
      .branch-card {
        border: 1px solid var(--color-border);
        border-radius: 8px;
        padding: 1rem;
      }
      .branch-card h4 {
        margin: 0 0 0.5rem;
        color: var(--color-primary);
      }
      .branch-card p {
        margin: 0.25rem 0;
        font-size: 0.88rem;
        color: var(--color-text-muted);
      }
      .status-tag {
        padding: 0.2rem 0.55rem;
        border-radius: 4px;
        font-size: 0.8rem;
        font-weight: 600;
        background: #cbd5e0;
      }
      .status-tag.active {
        background: #c6f6d5;
        color: #22543d;
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
      .text-input,
      .select-input {
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

      /* AI Tools Styles */
      .ai-tools-tab {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }
      .ai-unavailable-card {
        background: #fffaf0;
        border: 1px solid #feebc8;
        border-radius: 8px;
        padding: 1.25rem;
        display: flex;
        gap: 1rem;
        align-items: center;
        color: #744210;
      }
      .warning-icon {
        font-size: 2rem;
      }
      .ai-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
        gap: 1.5rem;
      }
      .ai-feature-card {
        background: #fff;
        border: 1px solid var(--color-border);
        border-radius: 10px;
        padding: 1.5rem;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      }
      .card-header-badge {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
      }
      .card-header-badge h3 {
        margin: 0;
        color: var(--color-primary);
        font-size: 1.2rem;
      }
      .feature-desc {
        font-size: 0.9rem;
        color: var(--color-text-muted);
        margin: 0.25rem 0 1rem;
      }
      .ai-warning-box {
        background: #f0f7f9;
        border: 1px solid #bce1ec;
        border-radius: 6px;
        padding: 0.85rem;
        display: flex;
        gap: 0.75rem;
        margin-bottom: 1.25rem;
        font-size: 0.85rem;
      }
      .ai-warning-box .warn-icon {
        font-size: 1.3rem;
      }
      .ai-warning-box p {
        margin: 0.2rem 0;
        color: #0c4a6e;
      }
      .ai-warning-box small {
        color: #0369a1;
        display: block;
      }
      .upload-zone {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-bottom: 1rem;
      }
      .file-input-hidden {
        display: none;
      }
      .upload-label {
        cursor: pointer;
      }
      .file-name {
        font-size: 0.85rem;
        color: var(--color-text-muted);
      }
      .image-preview-wrapper {
        border: 1px solid var(--color-border);
        border-radius: 8px;
        padding: 0.75rem;
        margin-bottom: 1rem;
        background: #fafafa;
      }
      .preview-toolbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
      }
      .preview-title {
        font-size: 0.85rem;
        font-weight: 600;
      }
      .preview-frame {
        position: relative;
        max-height: 250px;
        overflow: hidden;
        border-radius: 6px;
        display: flex;
        justify-content: center;
        background: #eee;
      }
      .preview-img {
        max-width: 100%;
        max-height: 250px;
        object-fit: contain;
        transition: filter 0.3s;
      }
      .blurred-overlay .preview-img {
        filter: blur(14px);
      }
      .blur-indicator {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.75);
        color: #fff;
        padding: 0.5rem 1rem;
        border-radius: 20px;
        font-size: 0.85rem;
        font-weight: 600;
      }
      .feature-actions {
        margin-top: 1rem;
        display: flex;
        justify-content: flex-end;
      }
      .drafts-section {
        margin-top: 1.5rem;
      }
      .section-divider {
        border: 0;
        border-top: 1px solid var(--color-border);
        margin: 1.25rem 0;
      }
      .draft-header-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
        flex-wrap: wrap;
        gap: 0.5rem;
      }
      .draft-header-row h4 {
        margin: 0;
        color: var(--color-primary);
      }
      .hint-text {
        font-size: 0.82rem;
        color: var(--color-text-muted);
      }
      .draft-review-card {
        border: 1px solid var(--color-border);
        border-radius: 8px;
        padding: 1rem;
        margin-bottom: 1rem;
        background: #fdfcf9;
      }
      .draft-meta {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.75rem;
      }
      .category-tag {
        background: #edf2f7;
        padding: 0.2rem 0.5rem;
        border-radius: 4px;
        font-size: 0.8rem;
      }
      .price-input {
        max-width: 90px;
        display: inline-block;
        padding: 0.25rem 0.5rem;
      }
      .badge-warning-custom {
        background: #feebc8;
        color: #9c4221;
      }
      .action-btn-group {
        display: flex;
        gap: 0.35rem;
      }
      .draft-actions-footer {
        margin-top: 1rem;
        display: flex;
        justify-content: flex-end;
      }
      .generated-preview-card {
        margin-top: 1.5rem;
        border: 1px solid var(--color-border);
        border-radius: 8px;
        padding: 1rem;
        background: #faf8f5;
        text-align: center;
      }
      .preview-badge-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.75rem;
      }
      .badge-illustrative {
        background: #e9d8fd;
        color: #553c9a;
      }
      .dedup-hint {
        font-size: 0.8rem;
        color: #2b6cb0;
      }
      .gen-img-container {
        display: flex;
        justify-content: center;
        margin-bottom: 0.75rem;
      }
      .gen-img {
        max-width: 100%;
        max-height: 220px;
        border-radius: 8px;
        object-fit: cover;
      }
      .gen-product-title {
        font-size: 1.05rem;
        color: var(--color-primary);
        margin: 0.5rem 0 0.25rem;
      }
      .gen-disclaimer {
        font-size: 0.82rem;
        color: var(--color-text-muted);
        margin: 0 0 1rem;
      }
      .card-footer-actions {
        display: flex;
        justify-content: center;
      }
    `,
  ],
})
export class MerchantDashboardComponent {
  protected readonly t = AR_TRANSLATIONS;

  activeTab = signal<'orders' | 'products' | 'branches' | 'zones' | 'ai_tools'>('orders');
  soundEnabled = signal<boolean>(true);
  showNewProductModal = signal<boolean>(false);
  selectedOrderForRejection = signal<any | null>(null);

  // AI Tools Signals & State
  aiAvailable = signal<boolean>(true);
  menuImagePreview = signal<string | null>(null);
  menuImageFileName = signal<string | null>(null);
  isBlurActive = signal<boolean>(false);
  isExtractingMenu = signal<boolean>(false);
  menuDrafts = signal<any[]>([
    {
      id: 1,
      title: 'مسودة منيو تجريبية مستخرجة',
      created_at: 'الآن',
      status: 'draft',
      items: [
        {
          id: 101,
          name: 'فراخ مشوية على الفحم شيش',
          category_name: 'مشويات',
          price: 120.0,
          is_ambiguous: false,
          is_accepted: true,
        },
        {
          id: 102,
          name: 'طاجن عكاوي بلدي بالبصل',
          category_name: 'طواجن',
          price: 160.0,
          is_ambiguous: true,
          is_accepted: false,
        },
        {
          id: 103,
          name: 'سلطة طحينة قناوية فاخرة',
          category_name: 'مقبلات',
          price: 15.0,
          is_ambiguous: false,
          is_accepted: true,
        },
      ],
    },
  ]);

  imageGenProductName = '';
  imageGenCategory = 'مشويات';
  isGeneratingImage = signal<boolean>(false);
  generatedImage = signal<{
    name: string;
    url: string;
    is_illustrative: boolean;
    is_approved: boolean;
  } | null>(null);

  orderFilter = 'all';
  selectedBranchFilter = 'all';
  rejectionReason = 'نفاد أحد الأصناف المطلوبة حالياً';

  currentStore = {
    id: 1,
    name: 'مطعم الكرنك الأصيل (قنا)',
    type: 'restaurant',
    is_accepting_orders: true,
  };

  newProduct = {
    name: '',
    price: null,
    description: '',
  };

  branches = [
    {
      id: 1,
      name: 'فرع وسط البلد',
      address: 'شارع الجمهورية - أمام المحطة، قنا',
      phone: '01012345678',
      is_active: true,
      is_accepting_orders: true,
      working_hours: { open: '09:00 ص', close: '11:00 م' },
    },
    {
      id: 2,
      name: 'فرع المعنا',
      address: 'طريق مصر أسوان الزراعي، قنا',
      phone: '01099887766',
      is_active: true,
      is_accepting_orders: true,
      working_hours: { open: '10:00 ص', close: '12:00 م' },
    },
  ];

  branchZones = [
    { id: 1, name: 'وسط البلد', fee: 10.0, is_served: true },
    { id: 2, name: 'المعنا', fee: 15.0, is_served: true },
    { id: 3, name: 'الجامعة ومساكن الشباب', fee: 15.0, is_served: true },
    { id: 4, name: 'حي المصالح والشوؤن', fee: 12.0, is_served: true },
  ];

  saveZoneFees() {
    alert('تم حفظ وتحديث أسعار التوصيل لمناطق قنا بنجاح');
  }

  products = [
    {
      id: 1,
      name: 'وجبة كباب وكفتة مشوي على الفحم',
      categoryName: 'مشويات',
      price: 130.0,
      description: 'نصف كيلو كفتة وكباب مع أرز وطحينة وسلطة خضراء وعيش بلدي',
      is_available: true,
    },
    {
      id: 2,
      name: 'ساندوتش كفتة قناوي',
      categoryName: 'سندوتشات',
      price: 45.0,
      description: 'عيش بلدي سخن مع طحينة وخضار',
      is_available: true,
    },
    {
      id: 3,
      name: 'طاجن بامية باللحمة البلدي',
      categoryName: 'طواجن',
      price: 110.0,
      description: 'طاجن فخار بامية صعيدي مسبكة بلحمة طازة',
      is_available: false, // خلصان
    },
  ];

  orders = [
    {
      id: 101,
      orderNumber: 'ORD-QNA-501',
      branchId: 1,
      branchName: 'فرع وسط البلد',
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
      branchId: 2,
      branchName: 'فرع المعنا',
      customerName: 'إبراهيم ناصر',
      customerPhone: '01122334455',
      deliveryAddress: 'مساكن عثمان، شقة 4',
      zoneName: 'الجامعة ومساكن الشباب',
      notes: '',
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
      customerName: 'ياسر فاروق',
      customerPhone: '01233445566',
      deliveryAddress: 'حي المصالح، قنا',
      zoneName: 'حي المصالح',
      notes: '',
      status: 'delivered',
      timeAgo: 'منذ ساعة',
      itemsTotal: 260.0,
      deliveryFee: 12.0,
      grandTotal: 272.0,
      items: [{ name: 'وجبة كباب وكفتة مشوي على الفحم', quantity: 2, price: 130.0 }],
    },
  ];

  getBranchNewOrdersCount(branchId: number): number {
    return this.orders.filter((o) => o.branchId === branchId && o.status === 'new').length;
  }

  toggleBranchReceiving(branch: any) {
    branch.is_accepting_orders = !branch.is_accepting_orders;
  }

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
    let result = this.orders;
    if (this.selectedBranchFilter !== 'all') {
      const bId = Number(this.selectedBranchFilter);
      result = result.filter((o) => o.branchId === bId);
    }
    if (this.orderFilter === 'new') {
      return result.filter((o) => o.status === 'new');
    }
    if (this.orderFilter === 'in_progress') {
      return result.filter((o) => ['accepted', 'preparing', 'out_for_delivery'].includes(o.status));
    }
    if (this.orderFilter === 'delivered') {
      return result.filter((o) => o.status === 'delivered');
    }
    return result;
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      new: 'طلب جديد 🔔',
      accepted: 'تم القبول',
      preparing: 'جاري التحضير بالمطبخ',
      out_for_delivery: 'خرج للتوصيل مع مندوب المتجر',
      delivered: 'تم التوصيل بنجاح',
      cancelled: 'ملغي',
      rejected: 'اعتذر عنه المحل',
    };
    return map[status] || status;
  }

  toggleReceiving() {
    this.currentStore.is_accepting_orders = !this.currentStore.is_accepting_orders;
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
      // AudioContext unavailable or restricted
    }
  }

  updateOrderStatus(order: any, nextStatus: string) {
    order.status = nextStatus;
  }

  openRejectModal(order: any) {
    this.selectedOrderForRejection.set(order);
  }

  confirmOrderRejection() {
    const ord = this.selectedOrderForRejection();
    if (ord) {
      ord.status = 'rejected';
      this.selectedOrderForRejection.set(null);
    }
  }

  toggleProductAvailability(product: any) {
    product.is_available = !product.is_available;
  }

  editProduct(product: any) {
    const newPrice = prompt(`تعديل سعر ${product.name} (ج.م):`, product.price.toString());
    if (newPrice && !isNaN(Number(newPrice))) {
      product.price = Number(newPrice);
    }
  }

  saveNewProduct() {
    if (this.newProduct.name && this.newProduct.price) {
      this.products.unshift({
        id: Date.now(),
        name: this.newProduct.name,
        categoryName: 'عام',
        price: Number(this.newProduct.price),
        description: this.newProduct.description,
        is_available: true,
      });
      this.newProduct = { name: '', price: null, description: '' };
      this.showNewProductModal.set(false);
    }
  }

  // AI Methods
  onMenuFileSelected(event: any) {
    const file = event.target.files?.[0];
    if (file) {
      this.menuImageFileName.set(file.name);
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.menuImagePreview.set(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  }

  toggleBlur() {
    this.isBlurActive.set(!this.isBlurActive());
  }

  extractMenuFromImage() {
    this.isExtractingMenu.set(true);
    setTimeout(() => {
      this.isExtractingMenu.set(false);
      const newDraft = {
        id: Date.now(),
        title: `مسودة منيو (${this.menuImageFileName() || 'صورة منيو'})`,
        created_at: 'الآن',
        status: 'draft',
        items: [
          {
            id: Date.now() + 1,
            name: 'كباب حلة صعيدي',
            category_name: 'طواجن',
            price: 135.0,
            is_ambiguous: false,
            is_accepted: true,
          },
          {
            id: Date.now() + 2,
            name: 'شوربة لسان عصفور بلدي',
            category_name: 'شوربة',
            price: 25.0,
            is_ambiguous: false,
            is_accepted: true,
          },
          {
            id: Date.now() + 3,
            name: 'حمام محشي أرز بالخلطة',
            category_name: 'مشويات',
            price: 150.0,
            is_ambiguous: true,
            is_accepted: false,
          },
        ],
      };
      this.menuDrafts.update((drafts) => [newDraft, ...drafts]);
      alert('تم استخراج مسودة المنيو بنجاح! يرجى مراجعة وتدقيق الأسعار قبل الاستيراد.');
    }, 600);
  }

  removeDraftItem(draft: any, item: any) {
    draft.items = draft.items.filter((i: any) => i.id !== item.id);
  }

  importAcceptedDraftItems(draft: any) {
    const acceptedItems = draft.items.filter((i: any) => i.is_accepted);
    if (acceptedItems.length === 0) {
      alert('يرجى اعتماد صنف واحد على الأقل للاستيراد');
      return;
    }

    acceptedItems.forEach((item: any) => {
      this.products.unshift({
        id: Date.now() + Math.floor(Math.random() * 1000),
        name: item.name,
        categoryName: item.category_name,
        price: Number(item.price),
        description: 'مستورد من مسودة المنيو بالذكاء الاصطناعي',
        is_available: true,
      });
    });

    draft.status = 'imported';
    alert(`تم استيراد ${acceptedItems.length} صنف بنجاح إلى قائمة منتجات متجرك!`);
  }

  generateProductImage() {
    if (!this.imageGenProductName) return;
    this.isGeneratingImage.set(true);
    setTimeout(() => {
      this.isGeneratingImage.set(false);
      this.generatedImage.set({
        name: this.imageGenProductName,
        url:
          'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="%230E5A6B"/><text x="50%25" y="45%25" dominant-baseline="middle" text-anchor="middle" fill="%23F5B335" font-size="20" font-family="sans-serif">صورة توضيحية بالذكاء الاصطناعي</text><text x="50%25" y="60%25" dominant-baseline="middle" text-anchor="middle" fill="%23FFFFFF" font-size="16" font-family="sans-serif">' +
          encodeURIComponent(this.imageGenProductName) +
          '</text></svg>',
        is_illustrative: true,
        is_approved: false,
      });
    }, 500);
  }

  approveGeneratedImage() {
    const img = this.generatedImage();
    if (img) {
      img.is_approved = true;
      this.generatedImage.set({ ...img });
      alert(`تم اعتماد الصورة التوضيحية لمنتج "${img.name}" بنجاح!`);
    }
  }
}
