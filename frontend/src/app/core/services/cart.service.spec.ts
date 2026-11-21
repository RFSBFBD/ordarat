import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { CartService } from './cart.service';

describe('CartService (Guest to Auth Cart Preservation)', () => {
  let service: CartService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(CartService);
  });

  it('should start with an empty cart for guest', () => {
    expect(service.itemsCount()).toBe(0);
    expect(service.itemsTotal()).toBe(0);
    expect(service.storeId()).toBeNull();
  });

  it('should add items as guest and persist to localStorage', () => {
    const res = service.addItem(1, 'مطعم الكرنك', {
      id: 101,
      name: 'كباب مشوي',
      price: 120
    });

    expect(res.success).toBe(true);
    expect(service.itemsCount()).toBe(1);
    expect(service.itemsTotal()).toBe(120);
    expect(service.storeName()).toBe('مطعم الكرنك');

    // Verify localStorage has it preserved
    const stored = JSON.parse(localStorage.getItem('ordarat_active_cart') || '{}');
    expect(stored.items.length).toBe(1);
    expect(stored.items[0].name).toBe('كباب مشوي');
  });

  it('should reject adding item from a different store without confirmation', () => {
    service.addItem(1, 'مطعم الكرنك', { id: 101, name: 'كباب مشوي', price: 120 });

    // Attempt to add from Store 2 (بقالة الأمانة)
    const res = service.addItem(2, 'بقالة الأمانة', { id: 201, name: 'لبن بخيره', price: 35 });

    expect(res.success).toBe(false);
    expect(res.conflictStore).toBe('مطعم الكرنك');
    // Cart must remain untouched from Store 1
    expect(service.storeId()).toBe(1);
    expect(service.itemsCount()).toBe(1);
  });

  it('should preserve guest cart when simulated user sign-in happens', () => {
    // 1. Guest prepares cart
    service.addItem(1, 'مطعم الكرنك', { id: 101, name: 'كباب مشوي', price: 120 });
    service.addItem(1, 'مطعم الكرنك', { id: 102, name: 'فراخ مشوية', price: 85 });

    expect(service.itemsCount()).toBe(2);
    expect(service.itemsTotal()).toBe(205);

    // 2. Simulate page reload or service re-instantiation after login
    const reloadedService = new CartService();
    expect(reloadedService.itemsCount()).toBe(2);
    expect(reloadedService.itemsTotal()).toBe(205);
    expect(reloadedService.items()[0].name).toBe('كباب مشوي');
  });
});
