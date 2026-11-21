import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AR_TRANSLATIONS } from '../../../core/constants/translations';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-stores-list',
  standalone: true,
  imports: [CommonModule, EmptyStateComponent],
  template: `
    <div class="stores-page">
      <div class="tabs-header">
        <button
          class="tab-btn"
          [class.active]="selectedTab === 'restaurants'"
          (click)="selectedTab = 'restaurants'"
        >
          🍔 {{ t.customer.storesList.tabs.restaurants }}
        </button>
        <button
          class="tab-btn"
          [class.active]="selectedTab === 'groceries'"
          (click)="selectedTab = 'groceries'"
        >
          🛒 {{ t.customer.storesList.tabs.groceries }}
        </button>
      </div>

      <div class="stores-grid" *ngIf="stores.length > 0; else emptyBlock">
        <div *ngFor="let store of filteredStores" class="store-card" (click)="viewStore(store.id)">
          <div class="store-image-wrap">
            <img [src]="store.image_url" [alt]="store.name" class="store-img" />
            <span class="status-badge" [class.open]="store.is_open" [class.closed]="!store.is_open">
              {{
                store.is_open
                  ? t.customer.storesList.statusOpen
                  : t.customer.storesList.statusClosed
              }}
            </span>
          </div>
          <div class="store-body">
            <h3 class="store-name">{{ store.name }}</h3>
            <p class="store-type">
              {{
                store.type === 'restaurant'
                  ? t.customer.storesList.tabs.restaurants
                  : t.customer.storesList.tabs.groceries
              }}
            </p>
          </div>
        </div>
      </div>

      <ng-template #emptyBlock>
        <app-empty-state
          [title]="
            selectedTab === 'restaurants'
              ? t.customer.storesList.emptyRestaurants
              : t.customer.storesList.emptyGroceries
          "
        ></app-empty-state>
      </ng-template>
    </div>
  `,
  styles: [
    `
      .stores-page {
        max-width: 1200px;
        margin: 0 auto;
      }
      .tabs-header {
        display: flex;
        gap: 1rem;
        border-bottom: 2px solid var(--color-border);
        margin-bottom: 1.5rem;
      }
      .tab-btn {
        padding: 0.75rem 1.5rem;
        border: none;
        background: transparent;
        font-family: var(--font-heading);
        font-size: 1.15rem;
        color: var(--color-text-muted);
        cursor: pointer;
        position: relative;
      }
      .tab-btn.active {
        color: var(--color-primary);
        font-weight: 700;
      }
      .tab-btn.active::after {
        content: '';
        position: absolute;
        bottom: -2px;
        right: 0;
        width: 100%;
        height: 3px;
        background: var(--color-primary);
      }
      .stores-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 1.5rem;
      }
      .store-card {
        background: #ffffff;
        border-radius: 12px;
        overflow: hidden;
        border: 1px solid var(--color-border);
        cursor: pointer;
        transition:
          transform 0.2s,
          box-shadow 0.2s;
      }
      .store-card:hover {
        transform: translateY(-3px);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.06);
      }
      .store-image-wrap {
        height: 160px;
        position: relative;
        background: #f4efe6;
      }
      .store-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .status-badge {
        position: absolute;
        top: 10px;
        left: 10px;
        padding: 0.25rem 0.65rem;
        border-radius: 6px;
        font-size: 0.8rem;
        font-weight: 700;
      }
      .status-badge.open {
        background: rgba(40, 167, 69, 0.9);
        color: #fff;
      }
      .status-badge.closed {
        background: rgba(108, 117, 125, 0.9);
        color: #fff;
      }
      .store-body {
        padding: 1rem;
      }
      .store-name {
        margin: 0 0 0.25rem 0;
        font-family: var(--font-heading);
        font-size: 1.15rem;
        color: var(--color-text);
      }
      .store-type {
        margin: 0;
        font-size: 0.85rem;
        color: var(--color-text-muted);
      }
    `,
  ],
})
export class StoresListComponent {
  private readonly router = inject(Router);
  protected readonly t = AR_TRANSLATIONS;

  selectedTab: 'restaurants' | 'groceries' = 'restaurants';

  // Seeded preview stores for Qena
  stores = [
    {
      id: 1,
      name: 'مطعم الكرنك (تجريبي - قنا)',
      type: 'restaurant',
      is_open: true,
      image_url:
        'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="160" viewBox="0 0 300 160"><rect width="300" height="160" fill="%230E5A6B"/><text x="50%" y="50%" fill="%23FFFFFF" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="18">مطعم الكرنك - قنا</text></svg>',
    },
    {
      id: 2,
      name: 'بقالة الأمانة (تجريبي - قنا)',
      type: 'grocery',
      is_open: true,
      image_url:
        'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="160" viewBox="0 0 300 160"><rect width="300" height="160" fill="%23F5B335"/><text x="50%" y="50%" fill="%231E2A2F" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="18">بقالة الأمانة - قنا</text></svg>',
    },
  ];

  get filteredStores() {
    return this.stores.filter(
      (s) => s.type === (this.selectedTab === 'restaurants' ? 'restaurant' : 'grocery'),
    );
  }

  viewStore(id: number) {
    this.router.navigate(['/customer/stores', id]);
  }
}
