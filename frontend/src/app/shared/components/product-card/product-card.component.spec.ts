import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProductCardComponent, ProductItem } from './product-card.component';

describe('ProductCardComponent', () => {
  let component: ProductCardComponent;
  let fixture: ComponentFixture<ProductCardComponent>;

  const mockProduct: ProductItem = {
    id: 1,
    name: 'كباب قناوي مشوي',
    description: 'كباب بلدي طازج',
    price: 120,
    is_available: true,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('product', mockProduct);
    fixture.detectChanges();
  });

  it('should display product name and price in EGP', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.product-name')?.textContent).toContain('كباب قناوي مشوي');
    expect(el.querySelector('.product-price')?.textContent).toContain('120 جنيه');
  });

  it('should emit add event when add button clicked on available product', () => {
    const spy = vi.spyOn(component.add, 'emit');
    const btn = fixture.nativeElement.querySelector('.btn-add') as HTMLButtonElement;
    btn.click();
    expect(spy).toHaveBeenCalledWith(mockProduct);
  });

  it('should show finished badge when product is unavailable', () => {
    fixture.componentRef.setInput('product', {
      ...mockProduct,
      is_available: false,
    });
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const badge = el.querySelector('.stock-badge');
    expect(badge).not.toBeNull();
    expect(badge?.textContent?.trim()).toBe('خلصان');
    const btn = el.querySelector('.btn-add') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });
});
