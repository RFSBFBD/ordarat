import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AR_TRANSLATIONS } from '../../../core/constants/translations';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { LoadingService } from '../../../core/services/loading.service';
import { ApiPendingBusiness, ApiService, ApiStore } from '../../../core/services/api.service';

const PLACEHOLDER_IMG =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="160" viewBox="0 0 300 160"><rect width="300" height="160" fill="%230E5A6B"/><text x="50%" y="50%" fill="%23FFFFFF" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="18">أوردرات - قنا</text></svg>';

interface StoreCard {
  id: number;
  name: string;
  logoUrl: string | null;
  open: boolean;
  pending: boolean;
}

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
          (click)="switchTab('restaurants')"
        >
          <app-icon name="utensils" [size]="18" />
          {{ t.customer.storesList.tabs.restaurants }}
        </button>
        <button
          class="tab-btn"
          [class.active]="selectedTab === 'groceries'"
          (click)="switchTab('groceries')"
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
          <div class="skeleton skeleton-logo"></div>
          <div class="skeleton skeleton-line wide"></div>
        </div>
      </div>

      <app-error-state
        *ngIf="!loading && loadError"
        [title]="errorTitle"
        [message]="loadError"
        (retry)="loadStores()"
      ></app-error-state>

      <div class="stores-grid" *ngIf="!loading && !loadError && cards.length > 0">
        <div
          *ngFor="let card of cards"
          class="store-card"
          [class.pending-card]="card.pending"
          [attr.role]="card.pending ? null : 'link'"
          (click)="card.pending ? null : viewStore(card.id)"
        >
          <div class="logo-wrap">
            <img
              [src]="card.logoUrl || placeholderImg"
              [alt]="card.name"
              class="logo-img"
              loading="lazy"
            />
          </div>
          <h3 class="store-name">{{ card.name }}</h3>
        </div>
      </div>

      <ng-container *ngIf="!loading && !loadError && cards.length === 0">
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
        grid-template-columns: repeat(auto-fill, minmax(min(150px, 45%), 1fr));
        gap: 1.75rem 1rem;
      }
      /* No card: just the logo with the name under it. */
      .store-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 0.65rem;
        padding: 0;
        background: none;
        border: 0;
        cursor: pointer;
      }
      .store-card:hover .logo-wrap {
        transform: translateY(-3px);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1);
      }
      .logo-wrap {
        width: 120px;
        height: 120px;
        border-radius: 26px;
        background: #f4efe6;
        border: 1px solid var(--color-border);
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        transition:
          transform 0.2s,
          box-shadow 0.2s;
      }
      .logo-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .store-name {
        margin: 0;
        font-family: var(--font-heading);
        font-size: 1.05rem;
        line-height: 1.4;
        color: var(--color-text);
      }
      .pending-card {
        cursor: default;
        opacity: 0.55;
      }
      .pending-card:hover .logo-wrap {
        transform: none;
        box-shadow: none;
      }
      .skeleton-card {
        cursor: default;
        pointer-events: none;
      }
      .skeleton-card:hover .logo-wrap {
        transform: none;
      }
      .skeleton {
        background: linear-gradient(90deg, #f1ead9 25%, #faf6ec 45%, #f1ead9 65%);
        background-size: 200% 100%;
        animation: shimmer 1.3s ease-in-out infinite;
        border-radius: 6px;
      }
      .skeleton-logo {
        width: 120px;
        height: 120px;
        border-radius: 26px;
      }
      .skeleton-line {
        height: 14px;
        margin-bottom: 0.6rem;
      }
      .skeleton-line.wide {
        width: 70%;
      }
      @keyframes shimmer {
        0% {
          background-position: 200% 0;
        }
        100% {
          background-position: -200% 0;
        }
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
  pendingBusinesses: ApiPendingBusiness[] = [];
  loading = true;
  loadError = '';
  errorTitle = 'الخدمة مش متاحة دلوقتي';
  readonly skeletonCards = [1, 2, 3, 4, 5, 6];

  private readonly loadingService = inject(LoadingService);

  ngOnInit(): void {
    this.loadStores();
  }

  /** Switching between restaurants and stores shows the branded loading screen for a moment. */
  switchTab(tab: 'restaurants' | 'groceries'): void {
    if (tab === this.selectedTab) {
      return;
    }
    this.loadingService.show(
      tab === 'restaurants' ? 'جاري تحميل المطاعم...' : 'جاري تحميل المتاجر...',
    );
    setTimeout(() => {
      this.selectedTab = tab;
      this.loadingService.hide();
      this.cdr.markForCheck();
    }, 600);
  }

  loadStores(): void {
    this.loading = true;
    this.loadError = '';
    // The teaser list is optional: a failure there must never hide the real stores.
    this.api.getPendingBusinesses().subscribe({
      next: (items) => {
        this.pendingBusinesses = items;
        this.cdr.markForCheck();
      },
      error: () => {
        this.pendingBusinesses = [];
      },
    });
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

  /** Approved stores (clickable) followed by registered-but-pending businesses (name + logo only). */
  get cards(): StoreCard[] {
    const type = this.selectedTab === 'restaurants' ? 'restaurant' : 'grocery';
    const approved = this.stores
      .filter((s) => s.type === type)
      .map((s) => ({
        id: s.id,
        name: s.name,
        logoUrl: s.logo_url || s.image_url,
        open: s.is_accepting_orders,
        pending: false,
      }));
    const pending = this.pendingBusinesses
      .filter((b) => b.type === type)
      .map((b) => ({ id: b.id, name: b.name, logoUrl: b.logo_url, open: false, pending: true }));
    return [...approved, ...pending];
  }

  viewStore(id: number): void {
    this.router.navigate(['/customer/stores', id]);
  }
}
