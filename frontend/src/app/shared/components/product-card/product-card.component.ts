import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ProductItem {
  id: number | string;
  name: string;
  description?: string;
  price: number; // in EGP
  image_url?: string;
  is_available: boolean;
}

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="product-card" [class.out-of-stock]="!product.is_available">
      <div class="image-wrapper">
        <img
          [src]="product.image_url || defaultImage"
          [alt]="product.name"
          class="product-image"
          loading="lazy"
        />
        <span *ngIf="!product.is_available" class="stock-badge">خلصان</span>
      </div>

      <div class="product-info">
        <h4 class="product-name" [title]="product.name">{{ product.name }}</h4>
        <p *ngIf="product.description" class="product-desc">{{ product.description }}</p>

        <div class="product-footer">
          <span class="product-price">{{ product.price }} جنيه</span>

          <button class="btn btn-add" [disabled]="!product.is_available" (click)="onAdd()">
            {{ product.is_available ? 'أضف' : 'غير متاح' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .product-card {
        background: #ffffff;
        border: 1px solid var(--color-border);
        border-radius: 12px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        transition:
          transform 0.2s,
          box-shadow 0.2s;
        width: 100%;
        aspect-ratio: 1 / 1;
        position: relative;
      }
      .product-card:hover:not(.out-of-stock) {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      }
      .product-card.out-of-stock {
        opacity: 0.75;
      }
      .image-wrapper {
        position: relative;
        width: 100%;
        height: 52%;
        background: #fafafa;
        overflow: hidden;
      }
      .product-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .stock-badge {
        position: absolute;
        top: 8px;
        right: 8px;
        background: rgba(217, 56, 58, 0.9);
        color: #ffffff;
        padding: 0.2rem 0.55rem;
        border-radius: 6px;
        font-size: 0.75rem;
        font-weight: 700;
      }
      .product-info {
        padding: 0.65rem 0.85rem;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        flex: 1;
      }
      .product-name {
        margin: 0;
        font-size: 0.95rem;
        font-family: var(--font-heading);
        color: var(--color-text);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .product-desc {
        margin: 2px 0 0 0;
        font-size: 0.75rem;
        color: var(--color-text-muted);
        overflow: hidden;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        line-height: 1.25;
      }
      .product-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 0.4rem;
      }
      .product-price {
        font-weight: 700;
        color: var(--color-primary);
        font-size: 0.95rem;
      }
      .btn-add {
        background-color: var(--color-primary);
        color: #ffffff;
        border: none;
        padding: 0.35rem 0.85rem;
        border-radius: 6px;
        font-weight: 600;
        font-size: 0.85rem;
        cursor: pointer;
        transition: background 0.15s;
      }
      .btn-add:hover:not(:disabled) {
        background-color: var(--color-primary-dark);
      }
      .btn-add:disabled {
        background-color: #a0aec0;
        cursor: not-allowed;
      }
    `,
  ],
})
export class ProductCardComponent {
  @Input({ required: true }) product!: ProductItem;
  @Output() add = new EventEmitter<ProductItem>();

  defaultImage =
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="%23f0ece1"/><text x="50%" y="50%" fill="%238c9ba5" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="16">أوردرات</text></svg>';

  onAdd() {
    if (this.product.is_available) {
      this.add.emit(this.product);
    }
  }
}
