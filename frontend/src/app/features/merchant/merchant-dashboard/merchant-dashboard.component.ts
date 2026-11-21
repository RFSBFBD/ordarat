import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AR_TRANSLATIONS } from '../../../core/constants/translations';

@Component({
  selector: 'app-merchant-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="merchant-dashboard">
      <div class="dash-header">
        <h2 class="title">لوحة تحكم المتجر (تجريبي - قنا)</h2>
        <div class="toggle-wrap">
          <span>استقبال الطلبات:</span>
          <button class="toggle-btn" [class.active]="isReceivingOrders" (click)="toggleReceiving()">
            {{ isReceivingOrders ? 'شغّال' : 'واقف' }}
          </button>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-num">٣</span>
          <span class="stat-label">طلبات جديدة</span>
        </div>
        <div class="stat-card">
          <span class="stat-num">١٢</span>
          <span class="stat-label">طلبات اليوم</span>
        </div>
        <div class="stat-card">
          <span class="stat-num">١,٤٥٠ جنيه</span>
          <span class="stat-label">مبيعات اليوم (كاش)</span>
        </div>
      </div>

      <!-- Orders Section -->
      <div class="orders-section">
        <div class="section-top">
          <h3>الطلبات الأخيرة</h3>
          <span class="sound-badge">🔔 تنبيه صوتي مفعّل</span>
        </div>

        <div class="orders-table-wrapper">
          <table class="orders-table">
            <thead>
              <tr>
                <th>رقم الطلب</th>
                <th>العميل</th>
                <th>الأصناف</th>
                <th>الإجمالي</th>
                <th>الحالة</th>
                <th>الإجراء</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let order of sampleOrders">
                <td>#{{ order.id }}</td>
                <td>{{ order.customer_name }}</td>
                <td>{{ order.items_summary }}</td>
                <td>{{ order.total }} جنيه</td>
                <td>
                  <span
                    class="badge"
                    [class.new]="order.status === 'new'"
                    [class.preparing]="order.status === 'preparing'"
                  >
                    {{ order.status_text }}
                  </span>
                </td>
                <td>
                  <button class="btn btn-sm btn-action">عرض والتفاصيل</button>
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
      }
      .title {
        font-family: var(--font-heading);
        color: var(--color-primary);
        margin: 0;
        font-size: 1.6rem;
      }
      .toggle-wrap {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-weight: 600;
      }
      .toggle-btn {
        padding: 0.45rem 1.25rem;
        border-radius: 20px;
        border: none;
        cursor: pointer;
        font-weight: 700;
        background: #718096;
        color: #fff;
        transition: background 0.2s;
      }
      .toggle-btn.active {
        background: var(--color-success);
      }
      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        margin-bottom: 2rem;
      }
      .stat-card {
        background: #ffffff;
        padding: 1.5rem;
        border-radius: 12px;
        border: 1px solid var(--color-border);
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
      }
      .stat-num {
        font-size: 2rem;
        font-weight: 700;
        color: var(--color-primary);
      }
      .stat-label {
        color: var(--color-text-muted);
        font-size: 0.9rem;
        margin-top: 0.25rem;
      }
      .orders-section {
        background: #ffffff;
        border-radius: 12px;
        border: 1px solid var(--color-border);
        padding: 1.5rem;
      }
      .section-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
      }
      .section-top h3 {
        font-family: var(--font-heading);
        margin: 0;
        color: var(--color-text);
      }
      .sound-badge {
        background: #ebf8ff;
        color: #2b6cb0;
        padding: 0.25rem 0.65rem;
        border-radius: 6px;
        font-size: 0.8rem;
        font-weight: 600;
      }
      .orders-table-wrapper {
        overflow-x: auto;
      }
      .orders-table {
        width: 100%;
        border-collapse: collapse;
        text-align: right;
      }
      .orders-table th,
      .orders-table td {
        padding: 0.85rem 1rem;
        border-bottom: 1px solid var(--color-border);
        font-size: 0.9rem;
      }
      .orders-table th {
        background: #faf8f2;
        color: var(--color-text-muted);
        font-weight: 600;
      }
      .badge {
        padding: 0.2rem 0.6rem;
        border-radius: 4px;
        font-size: 0.8rem;
        font-weight: 600;
      }
      .badge.new {
        background: #fefcbf;
        color: #744210;
      }
      .badge.preparing {
        background: #ebf8ff;
        color: #2b6cb0;
      }
      .btn-action {
        background: var(--color-primary);
        color: #fff;
        border: none;
        padding: 0.35rem 0.75rem;
        border-radius: 4px;
        cursor: pointer;
      }
    `,
  ],
})
export class MerchantDashboardComponent {
  isReceivingOrders = true;

  sampleOrders = [
    {
      id: 201,
      customer_name: 'أحمد محمود',
      items_summary: '١x كباب وكفتة مشوي، ٢x بيبسي',
      total: 155,
      status: 'new',
      status_text: 'جديد',
    },
    {
      id: 200,
      customer_name: 'محمد عبد الله',
      items_summary: '١x فراخ مشوية',
      total: 85,
      status: 'preparing',
      status_text: 'بيتحضّر',
    },
  ];

  toggleReceiving() {
    this.isReceivingOrders = !this.isReceivingOrders;
  }
}
