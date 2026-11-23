import { ChangeDetectorRef, Component, OnInit, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AR_TRANSLATIONS } from '../../../core/constants/translations';
import {
  ProductCardComponent,
  ProductItem,
} from '../../../shared/components/product-card/product-card.component';
import { MenuItemRowComponent } from '../../../shared/components/menu-item-row/menu-item-row.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ApiService, ApiProduct, ApiStoreDetail } from '../../../core/services/api.service';
import { CartService } from '../../../core/services/cart.service';

@Component({
  selector: 'app-store-detail',
  standalone: true,
  imports: [
    CommonModule,
    ProductCardComponent,
    MenuItemRowComponent,
    EmptyStateComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    IconComponent,
  ],
  template: `
    <div class="store-detail-page">
      <div class="store-header">
        <button class="back-btn" (click)="goBack()">
          <app-icon name="arrow-right" [size]="16" />
          رجوع للمتاجر
        </button>
        <h2 class="store-title">{{ storeName }}</h2>
        <span class="city-tag">مدينة قنا</span>
      </div>

      <app-loading-state *ngIf="loading" [message]="t.customer.storePage.loading"></app-loading-state>

      <app-error-state
        *ngIf="!loading && loadError"
        [message]="loadError"
        (retry)="loadStore()"
      ></app-error-state>

      <ng-container *ngIf="!loading && !loadError">
        <!-- View Switcher (Cards vs List) -->
        <div class="view-controls">
          <div class="view-toggle">
            <button
              class="toggle-btn"
              [class.active]="viewMode === 'cards'"
              (click)="viewMode = 'cards'"
            >
              <app-icon name="layout-grid" [size]="16" />
              {{ t.customer.storePage.cardsViewBtn }}
            </button>
            <button
              class="toggle-btn"
              [class.active]="viewMode === 'list'"
              (click)="viewMode = 'list'"
            >
              <app-icon name="list" [size]="16" />
              {{ t.customer.storePage.fullMenuBtn }}
            </button>
          </div>

          <button class="cart-pill-btn" (click)="goToCheckout()">
            <app-icon name="shopping-cart" [size]="18" />
            السلة ({{ cartCount() }}) · {{ cartTotal() }} جنيه
          </button>
        </div>

        <!-- Conflict banner when the cart belongs to another store -->
        <div class="conflict-banner" *ngIf="conflictStoreName">
          <span>
            {{ t.customer.cart.differentStoreNotice.replace('{storeName}', conflictStoreName) }}
          </span>
          <div class="conflict-actions">
            <button class="btn-conflict-confirm" (click)="confirmClearAndAdd()">
              {{ t.customer.cart.clearAndStartBtn }}
            </button>
            <button class="btn-conflict-cancel" (click)="cancelConflict()">
              {{ t.customer.cart.backBtn }}
            </button>
          </div>
        </div>

        <!-- Products View -->
        <div *ngIf="products.length > 0; else emptyBlock">
          <!-- Square Cards Mode -->
          <div *ngIf="viewMode === 'cards'" class="products-grid">
            <app-product-card
              *ngFor="let product of products"
              [product]="product"
              (add)="addToCart($event)"
            ></app-product-card>
          </div>

          <!-- Full Menu List Mode -->
          <div *ngIf="viewMode === 'list'" class="menu-list-wrapper">
            <app-menu-item-row
              *ngFor="let product of products"
              [product]="product"
              (add)="addToCart($event)"
            ></app-menu-item-row>
          </div>
        </div>

        <ng-template #emptyBlock>
          <app-empty-state [title]="t.customer.storePage.emptyProducts"></app-empty-state>
        </ng-template>
      </ng-container>
    </div>
  `,
  styles: [
    `
      .store-detail-page {
        max-width: 1200px;
        margin: 0 auto;
      }
      .store-header {
        margin-bottom: 1.5rem;
        border-bottom: 1px solid var(--color-border);
        padding-bottom: 1rem;
      }
      .back-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        background: none;
        border: none;
        color: var(--color-primary);
        font-weight: 600;
        cursor: pointer;
        margin-bottom: 0.5rem;
        padding: 0;
      }
      .store-title {
        font-family: var(--font-heading);
        font-size: 1.85rem;
        color: var(--color-primary);
        margin: 0.25rem 0;
      }
      .city-tag {
        background: #efe6d2;
        color: var(--color-text-muted);
        padding: 0.2rem 0.6rem;
        border-radius: 4px;
        font-size: 0.8rem;
        font-weight: 600;
      }
      .view-controls {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
        flex-wrap: wrap;
        gap: 1rem;
      }
      .view-toggle {
        display: flex;
        background: #efe8d6;
        border-radius: 8px;
        padding: 3px;
      }
      .toggle-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        border: none;
        background: transparent;
        padding: 0.45rem 1rem;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 600;
        font-size: 0.9rem;
        color: var(--color-text-muted);
      }
      .toggle-btn.active {
        background: #ffffff;
        color: var(--color-primary);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }
      .cart-pill-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
        background-color: var(--color-accent);
        color: #1e2a2f;
        border: none;
        padding: 0.55rem 1.25rem;
        border-radius: 30px;
        font-weight: 700;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(245, 179, 53, 0.3);
      }
      .conflict-banner {
        background: #fff8e6;
        border: 1.5px solid var(--color-accent);
        border-radius: 10px;
        padding: 1rem 1.25rem;
        margin-bottom: 1.25rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        flex-wrap: wrap;
        font-weight: 600;
      }
      .conflict-actions {
        display: flex;
        gap: 0.5rem;
      }
      .btn-conflict-confirm {
        background: var(--color-primary);
        color: #fff;
        border: none;
        border-radius: 6px;
        padding: 0.45rem 0.9rem;
        font-weight: 700;
        cursor: pointer;
      }
      .btn-conflict-cancel {
        background: transparent;
        border: 1px solid var(--color-border);
        border-radius: 6px;
        padding: 0.45rem 0.9rem;
        cursor: pointer;
      }
      .products-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(min(210px, 100%), 1fr));
        gap: 1.25rem;
      }
      .menu-list-wrapper {
        background: #ffffff;
        border-radius: 12px;
        border: 1px solid var(--color-border);
        overflow: hidden;
      }
    `,
  ],
})
export class StoreDetailComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);
  private readonly cart = inject(CartService);
  private readonly cdr = inject(ChangeDetectorRef);
  protected readonly t = AR_TRANSLATIONS;

  storeId = 0;
  storeName = '';
  viewMode: 'cards' | 'list' = 'cards';

  products: ProductItem[] = [];
  loading = true;
  loadError = '';

  conflictStoreName: string | null = null;
  private pendingProduct: ProductItem | null = null;

  readonly cartCount = computed(() => this.cart.itemsCount());
  readonly cartTotal = computed(() => this.cart.itemsTotal());

  ngOnInit(): void {
    this.storeId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadStore();
  }

  loadStore(): void {
    this.loading = true;
    this.loadError = '';
    this.api.getStore(this.storeId).subscribe({
      next: (store) => {
        this.applyStore(store);
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err: { message?: string }) => {
        this.loadError = err?.message || 'تعذر تحميل صفحة المتجر. حاول مرة تانية';
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  private applyStore(store: ApiStoreDetail): void {
    this.storeName = store.name;

    const fromCategories = (store.categories ?? []).flatMap((c) => c.products ?? []);
    const raw = fromCategories.length > 0 ? fromCategories : (store.products ?? []);

    this.products = raw.map((p: ApiProduct) => ({
      id: p.id,
      name: p.name,
      description: p.description ?? '',
      price: typeof p.price === 'string' ? parseFloat(p.price) : p.price,
      image_url: p.image_url ?? undefined,
      is_available: p.is_available,
    }));
  }

  addToCart(product: ProductItem): void {
    const result = this.cart.addItem(this.storeId, this.storeName, product);
    if (!result.success) {
      this.conflictStoreName = result.conflictStore ?? null;
      this.pendingProduct = product;
    }
  }

  confirmClearAndAdd(): void {
    this.cart.clearCart();
    if (this.pendingProduct) {
      this.cart.addItem(this.storeId, this.storeName, this.pendingProduct);
    }
    this.cancelConflict();
  }

  cancelConflict(): void {
    this.conflictStoreName = null;
    this.pendingProduct = null;
  }

  goToCheckout(): void {
    this.router.navigate(['/customer/checkout']);
  }

  goBack(): void {
    this.router.navigate(['/customer/stores']);
  }
}
