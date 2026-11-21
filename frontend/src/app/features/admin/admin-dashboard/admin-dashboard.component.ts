import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AR_TRANSLATIONS } from '../../../core/constants/translations';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="admin-dashboard">
      <div class="admin-header">
        <h2 class="title">لوحة تحكم إدارة منصة أوردرات</h2>
        <span class="role-badge">أدمن المنصة</span>
      </div>

      <!-- Pending Zones Notice (Design Decision Gate) -->
      <div class="pending-notice-box">
        ⚠️ <strong>ملاحظة هامة:</strong> {{ t.admin.zones.pendingNotice }}
      </div>

      <!-- Top KPI Stats -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <span class="kpi-val">٨</span>
          <span class="kpi-label">{{ t.admin.home.storesCount }}</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-val">٤٢</span>
          <span class="kpi-label">{{ t.admin.home.ordersCount }}</span>
        </div>
        <div class="kpi-card alert-card">
          <span class="kpi-val text-alert">١</span>
          <span class="kpi-label">{{ t.admin.home.unacceptedAlert }}</span>
        </div>
      </div>

      <!-- Stores Management Section -->
      <div class="card-section">
        <div class="section-title-row">
          <h3>{{ t.admin.stores.title }}</h3>
          <button class="btn btn-primary">+ {{ t.admin.stores.openStoreAccount }}</button>
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
                  <button class="btn btn-sm btn-outline">
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
      .role-badge {
        background: var(--color-primary);
        color: #fff;
        padding: 0.35rem 0.85rem;
        border-radius: 6px;
        font-weight: 600;
        font-size: 0.85rem;
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
      .kpi-val {
        font-size: 2.2rem;
        font-weight: 700;
        color: var(--color-primary);
        display: block;
      }
      .kpi-val.text-alert {
        color: var(--color-danger);
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
      }
      .section-title-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.25rem;
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
      .status-tag.active {
        background: #c6f6d5;
        color: #22543d;
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
      .btn-outline {
        background: transparent;
        border: 1px solid var(--color-border);
        color: var(--color-text);
      }
    `,
  ],
})
export class AdminDashboardComponent {
  protected readonly t = AR_TRANSLATIONS;

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
}
