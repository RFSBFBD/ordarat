import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BranchDashboardComponent, BranchOrder } from './branch-dashboard.component';

describe('BranchDashboardComponent', () => {
  let component: BranchDashboardComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BranchDashboardComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(BranchDashboardComponent);
    component = fixture.componentInstance;
  });

  it('should create the branch dashboard component', () => {
    expect(component).toBeTruthy();
    expect(component.currentBranch.name).toContain('فرع وسط البلد');
  });

  it('should display orders strictly assigned to current branch', () => {
    const orders = component.filteredOrders();
    expect(orders.length).toBeGreaterThan(0);
    orders.forEach((o) => {
      expect(o.branchId).toBe(component.currentBranch.id);
    });
  });

  it('should toggle order reception for the branch', () => {
    expect(component.currentBranch.is_accepting_orders).toBe(true);
    component.toggleReceiving();
    expect(component.currentBranch.is_accepting_orders).toBe(false);
    component.toggleReceiving();
    expect(component.currentBranch.is_accepting_orders).toBe(true);
  });

  it('should advance order status lifecycle on branch manager action', () => {
    const newOrder = component.orders.find((o) => o.status === 'new');
    expect(newOrder).toBeTruthy();
    if (newOrder) {
      component.updateOrderStatus(newOrder, 'accepted');
      expect(newOrder.status).toBe('accepted');

      component.updateOrderStatus(newOrder, 'preparing');
      expect(newOrder.status).toBe('preparing');

      component.updateOrderStatus(newOrder, 'out_for_delivery');
      expect(newOrder.status).toBe('out_for_delivery');

      component.updateOrderStatus(newOrder, 'delivered');
      expect(newOrder.status).toBe('delivered');
    }
  });

  it('should reject order with recorded reason', () => {
    const newOrder = component.orders.find((o) => o.status === 'new');
    expect(newOrder).toBeTruthy();
    if (newOrder) {
      component.openRejectModal(newOrder);
      expect(component.selectedOrderForRejection()).toBe(newOrder);

      component.rejectionReason = 'نفاد صنف الكباب بالمطبخ';
      component.confirmOrderRejection();
      expect(newOrder.status).toBe('rejected');
      expect(component.selectedOrderForRejection()).toBeNull();
    }
  });

  it('should prevent branch manager from modifying order of another branch (isolation)', () => {
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});

    const foreignOrder: BranchOrder = {
      id: 999,
      orderNumber: 'ORD-FOREIGN-999',
      branchId: 99, // foreign branch
      branchName: 'فرع نجع حمادي',
      storeName: 'مطعم أجنبي',
      customerName: 'مستخدم آخر',
      customerPhone: '01011112222',
      deliveryAddress: 'عنوان خارجي',
      zoneName: 'وسط البلد',
      status: 'new',
      timeAgo: 'منذ دقيقة',
      itemsTotal: 100,
      deliveryFee: 10,
      grandTotal: 110,
      items: [],
    };

    component.updateOrderStatus(foreignOrder, 'accepted');
    expect(foreignOrder.status).toBe('new'); // Did not change
    expect(alertMock).toHaveBeenCalledWith('الطلب ده مش على فرعك');

    alertMock.mockRestore();
  });
});
