import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AR_TRANSLATIONS } from '../../../core/constants/translations';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ApiService, ApiStore } from '../../../core/services/api.service';

const PLACEHOLDER_IMG =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="160" viewBox="0 0 300 160"><rect width="300" height="160" fill="%230E5A6B"/><text x="50%" y="50%" fill="%23FFFFFF" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="18">أوردرات - قنا</text></svg>';

@Component({
  selector: 'app-stores-list',
  standalone: true,
  imports: [CommonModule, EmptyStateComponent, ErrorStateComponent, IconComponent],
  template: `
    <div class="stores-page">
      <div class="tabs-header">
        <button
          class="tab-btn"
          [class.active]="selectedTab === 'restaurants'"
          (click)="selectedTab = 'restaurants'"
        >
          <app-icon name="utensils" [size]="18" />
          {{ t.customer.storesList.tabs.restaurants }}
        </button>
        <button
          class="tab-btn"
          [class.active]="selectedTab === 'groceries'"
          (click)="selectedTab = 'groceries'"
        >
          <app-icon name="shopping-basket" [size]="18" />
          {{ t.customer.storesList.tabs.groceries }}
        </button>
      </div>

      <!-- Skeleton cards keep the page layout stable while stores load -->
      <div
        class="stores-grid"
        *ngIf="loading"
        aria-busy="true"
        [attr.aria-label]="t.customer.storesList.loading"
      >
        <div class="store-card skeleton-card" *ngFor="let i of skeletonCards">
          <div class="skeleton skeleton-img"></div>
          <div class="store-body">
            <div class="skeleton skeleton-line wide"></div>
            <div class="skeleton skeleton-line narrow"></div>
          </div>
        </div>
      </div>

      <app-error-state
        *ngIf="!loading && loadError"
        [title]="errorTitle"
        [message]="loadError"
        (retry)="loadStores()"
      ></app-error-state>

      <div class="stores-grid" *ngIf="!loading && !loadError && filteredStores.length > 0">
        <div *ngFor="let store of filteredStores" class="store-card" (click)="viewStore(store.id)">
          <div class="store-image-wrap">
            <img
              [src]="store.image_url || placeholderImg"
              [alt]="store.name"
              class="store-img"
              loading="lazy"
            />
            <span
              class="status-badge"
              [class.open]="store.is_accepting_orders"
              [class.closed]="!store.is_accepting_orders"
            >
              {{
                store.is_accepting_orders
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

      <ng-container *ngIf="!loading && !loadError && filteredStores.length === 0">
        <app-empty-state
          [title]="
            selectedTab === 'restaurants'
              ? t.customer.storesList.emptyRestaurants
              : t.customer.storesList.emptyGroceries
          "
        ></app-empty-state>
      </ng-container>
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
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
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
        grid-template-columns: repeat(auto-fill, minmax(min(280px, 100%), 1fr));
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
      .skeleton-card {
        cursor: default;
        pointer-events: none;
      }
      .skeleton-card:hover {
        transform: none;
        box-shadow: none;
      }
      .skeleton {
        background: linear-gradient(90deg, #f1ead9 25%, #faf6ec 45%, #f1ead9 65%);
        background-size: 200% 100%;
        animation: shimmer 1.3s ease-in-out infinite;
        border-radius: 6px;
      }
      .skeleton-img {
        height: 160px;
        border-radius: 0;
      }
      .skeleton-line {
        height: 14px;
        margin-bottom: 0.6rem;
      }
      .skeleton-line.wide {
        width: 70%;
      }
      .skeleton-line.narrow {
        width: 40%;
        margin-bottom: 0;
      }
      @keyframes shimmer {
        0% {
          background-position: 200% 0;
        }
        100% {
          background-position: -200% 0;
        }
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
export class StoresListComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly api = inject(ApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  protected readonly t = AR_TRANSLATIONS;

  readonly placeholderImg = PLACEHOLDER_IMG;

  selectedTab: 'restaurants' | 'groceries' = 'restaurants';

  stores: ApiStore[] = [];
  loading = true;
  loadError = '';
  errorTitle = 'الخدمة مش متاحة دلوقتي';
  readonly skeletonCards = [1, 2, 3, 4, 5, 6];

  ngOnInit(): void {
    this.loadStores();
  }

  loadStores(): void {
    this.loading = true;
    this.loadError = '';
    this.api.getStores().subscribe({
      next: (stores) => {
        this.stores = stores;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err: { kind?: string; message?: string }) => {
        this.loadError = err?.message || 'تعذر تحميل المتاجر. حاول مرة تانية';
        // Match the title to the failure class so the page never shows two
        // conflicting explanations (e.g. blaming the network on a server fault).
        this.errorTitle =
          err?.kind === 'network' ? 'الخدمة مش متاحة دلوقتي' : 'حصل خطأ أثناء تحميل المتاجر';
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  get filteredStores(): ApiStore[] {
    return this.stores.filter(
      (s) => s.type === (this.selectedTab === 'restaurants' ? 'restaurant' : 'grocery'),
    );
  }

  viewStore(id: number): void {
    this.router.navigate(['/customer/stores', id]);
  }
}
