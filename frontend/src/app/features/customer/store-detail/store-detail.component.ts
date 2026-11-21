import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AR_TRANSLATIONS } from '../../../core/constants/translations';
import {
  ProductCardComponent,
  ProductItem,
} from '../../../shared/components/product-card/product-card.component';
import { MenuItemRowComponent } from '../../../shared/components/menu-item-row/menu-item-row.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-store-detail',
  standalone: true,
  imports: [CommonModule, ProductCardComponent, MenuItemRowComponent, EmptyStateComponent],
  template: `
    <div class="store-detail-page">
      <div class="store-header">
        <button class="back-btn" (click)="goBack()">← رجوع للمتاجر</button>
        <h2 class="store-title">{{ storeName }}</h2>
        <span class="city-tag">مدينة قنا</span>
      </div>

      <!-- View Switcher (Cards vs List) -->
      <div class="view-controls">
        <div class="view-toggle">
          <button
            class="toggle-btn"
            [class.active]="viewMode === 'cards'"
            (click)="viewMode = 'cards'"
          >
            🔲 {{ t.customer.storePage.cardsViewBtn }}
          </button>
          <button
            class="toggle-btn"
            [class.active]="viewMode === 'list'"
            (click)="viewMode = 'list'"
          >
            📋 {{ t.customer.storePage.fullMenuBtn }}
          </button>
        </div>

        <button class="cart-pill-btn" (click)="goToCheckout()">
          🛒 السلة ({{ cartCount }}) · {{ cartTotal }} جنيه
        </button>
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
        background-color: var(--color-accent);
        color: #1e2a2f;
        border: none;
        padding: 0.55rem 1.25rem;
        border-radius: 30px;
        font-weight: 700;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(245, 179, 53, 0.3);
      }
      .products-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
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
export class StoreDetailComponent {
  private readonly router = inject(Router);
  protected readonly t = AR_TRANSLATIONS;

  storeName = 'مطعم الكرنك (تجريبي - قنا)';
  viewMode: 'cards' | 'list' = 'cards';

  cartCount = 0;
  cartTotal = 0;

  // Sample items for demonstration & visual check
  products: ProductItem[] = [
    {
      id: 101,
      name: 'كباب وكفتة مشوي (ربع كيلو)',
      description: 'كباب بلدي مع طحينة وعيش وسلطة خضراء',
      price: 120,
      is_available: true,
    },
    {
      id: 102,
      name: 'فراخ مشوية على الفحم',
      description: 'نصف دجاجة متبلة بتتبيلة الكرنك الخاصة',
      price: 85,
      is_available: true,
    },
    {
      id: 103,
      name: 'طاجن لحمة بالبصل قناوي',
      description: 'لحم بقري بلدي في طاجن فخار مع صوص البصل المكرمل',
      price: 110,
      is_available: false,
    },
  ];

  addToCart(product: ProductItem) {
    this.cartCount++;
    this.cartTotal += product.price;
  }

  goToCheckout() {
    this.router.navigate(['/customer/checkout']);
  }

  goBack() {
    this.router.navigate(['/customer/stores']);
  }
}
