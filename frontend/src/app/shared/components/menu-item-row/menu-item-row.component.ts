import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductItem } from '../product-card/product-card.component';

@Component({
  selector: 'app-menu-item-row',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="menu-item-row" [class.out-of-stock]="!product.is_available">
      <div class="item-main">
        <div class="title-line">
          <h4 class="item-name">{{ product.name }}</h4>
          <span *ngIf="!product.is_available" class="badge-finished">خلصان</span>
        </div>
        <p *ngIf="product.description" class="item-desc">{{ product.description }}</p>
      </div>

      <div class="item-actions">
        <span class="item-price">{{ product.price }} جنيه</span>
        <button class="btn btn-sm" [disabled]="!product.is_available" (click)="onAdd()">أضف</button>
      </div>
    </div>
  `,
  styles: [
    `
      .menu-item-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.85rem 1rem;
        border-bottom: 1px solid var(--color-border);
        background: #ffffff;
        transition: background 0.15s;
      }
      .menu-item-row:last-child {
        border-bottom: none;
      }
      .menu-item-row:hover:not(.out-of-stock) {
        background: #fdfbf7;
      }
      .menu-item-row.out-of-stock {
        opacity: 0.65;
      }
      .item-main {
        flex: 1;
        padding-left: 1rem;
      }
      .title-line {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .item-name {
        margin: 0;
        font-family: var(--font-heading);
        font-size: 1rem;
        color: var(--color-text);
      }
      .badge-finished {
        background: rgba(217, 56, 58, 0.12);
        color: var(--color-danger);
        padding: 0.15rem 0.45rem;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 700;
      }
      .item-desc {
        margin: 3px 0 0 0;
        font-size: 0.85rem;
        color: var(--color-text-muted);
      }
      .item-actions {
        display: flex;
        align-items: center;
        gap: 1rem;
      }
      .item-price {
        font-weight: 700;
        color: var(--color-primary);
        font-size: 1rem;
        white-space: nowrap;
      }
      .btn-sm {
        background-color: var(--color-primary);
        color: #ffffff;
        border: none;
        padding: 0.35rem 0.85rem;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 600;
        font-size: 0.85rem;
      }
      .btn-sm:disabled {
        background-color: #cbd5e0;
        cursor: not-allowed;
      }
    `,
  ],
})
export class MenuItemRowComponent {
  @Input({ required: true }) product!: ProductItem;
  @Output() add = new EventEmitter<ProductItem>();

  onAdd() {
    if (this.product.is_available) {
      this.add.emit(this.product);
    }
  }
}
