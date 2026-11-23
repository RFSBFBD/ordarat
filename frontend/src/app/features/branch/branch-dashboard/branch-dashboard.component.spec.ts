import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of } from 'rxjs';
import { BranchDashboardComponent, BranchOrder } from './branch-dashboard.component';
import { ApiService } from '../../../core/services/api.service';

const dashboardResponse = {
  branch: {
    id: 1,
    name: 'فرع وسط البلد',
    address: 'شارع المحطة',
    phone: null,
    is_active: true,
    is_accepting_orders: true,
    working_hours: { from: '09:00', to: '23:00' },
    store_name: 'مطعم الكرنك الأصيل',
    store_type: 'restaurant',
  },
  stats: { new_orders: 1, in_progress_orders: 1, delivered_orders: 1 },
  play_audio_alert: false,
};

const ordersResponse = {
  branch_id: 1,
  branch_name: 'فرع وسط البلد',
  new_orders_count: 1,
  play_audio_alert: false,
  orders: [
    {
      id: 101,
      order_number: 'ORD-QNA-501',
      branch_id: 1,
      status: 'new',
      customer_name: 'محمود حسن',
      customer_phone: '01098765432',
      customer_notes: 'الرجاء الاتصال عند الوصول',
      items_total: '175.00',
      delivery_fee: '15.00',
      grand_total: '190.00',
      payment_method: 'COD',
      created_at: new Date(Date.now() - 3 * 60000).toISOString(),
      zone: { id: 1, name: 'وسط البلد' },
      items: [
        { id: 1, product_name: 'وجبة كباب', unit_price: '130.00', quantity: 1, subtotal: '130.00' },
        { id: 2, product_name: 'ساندوتش كفتة', unit_price: '45.00', quantity: 1, subtotal: '45.00' },
      ],
    },
    {
      id: 102,
      order_number: 'ORD-QNA-502',
      branch_id: 1,
      status: 'preparing',
      customer_name: 'إبراهيم ناصر',
      customer_phone: '01122334455',
      customer_notes: null,
      items_total: '90.00',
      delivery_fee: '15.00',
      grand_total: '105.00',
      payment_method: 'COD',
      created_at: new Date(Date.now() - 18 * 60000).toISOString(),
      zone: { id: 2, name: 'الجامعة' },
      items: [
        { id: 3, product_name: 'ساندوتش كفتة', unit_price: '45.00', quantity: 2, subtotal: '90.00' },
      ],
    },
    {
      id: 103,
      order_number: 'ORD-QNA-498',
      branch_id: 1,
      status: 'delivered',
      customer_name: 'ياسر فاروق',
      customer_phone: '01233445566',
      customer_notes: null,
      items_total: '260.00',
      delivery_fee: '12.00',
      grand_total: '272.00',
      payment_method: 'COD',
      created_at: new Date(Date.now() - 60 * 60000).toISOString(),
      zone: { id: 3, name: 'حي المصالح' },
      items: [],
    },
  ],
};

describe('BranchDashboardComponent', () => {
  let component: BranchDashboardComponent;
  let api: {
    getBranchDashboard: ReturnType<typeof vi.fn>;
    getBranchOrders: ReturnType<typeof vi.fn>;
    toggleBranchStatus: ReturnType<typeof vi.fn>;
    updateBranchOrderStatus: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    api = {
      getBranchDashboard: vi.fn().mockReturnValue(of(dashboardResponse)),
      getBranchOrders: vi.fn().mockReturnValue(of(ordersResponse)),
      toggleBranchStatus: vi
        .fn()
        .mockReturnValue(of({ id: 1, is_accepting_orders: false, working_hours: null })),
      updateBranchOrderStatus: vi.fn().mockReturnValue(of(ordersResponse.orders[0])),
    };

    await TestBed.configureTestingModule({
      imports: [BranchDashboardComponent],
      providers: [{ provide: ApiService, useValue: api }],
    }).compileComponents();

    const fixture = TestBed.createComponent(BranchDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads branch info and orders from the API on init', () => {
    expect(component).toBeTruthy();
    expect(api.getBranchDashboard).toHaveBeenCalled();
    expect(api.getBranchOrders).toHaveBeenCalled();
    expect(component.currentBranch.name).toContain('فرع وسط البلد');
    expect(component.loading).toBe(false);
    expect(component.orders.length).toBe(3);
    expect(component.orders[0].orderNumber).toBe('ORD-QNA-501');
    expect(component.orders[0].grandTotal).toBe(190);
  });

  it('displays orders strictly assigned to current branch', () => {
    const orders = component.filteredOrders();
    expect(orders.length).toBeGreaterThan(0);
    orders.forEach((o) => {
      expect(o.branchId).toBe(component.currentBranch.id);
    });
  });

  it('toggles order reception through the API', () => {
    expect(component.currentBranch.is_accepting_orders).toBe(true);
    component.toggleReceiving();
    expect(api.toggleBranchStatus).toHaveBeenCalledWith(false);
    expect(component.currentBranch.is_accepting_orders).toBe(false);
  });

  it('advances order status lifecycle through the API', () => {
    const newOrder = component.orders.find((o) => o.status === 'new');
    expect(newOrder).toBeTruthy();
    if (newOrder) {
      component.updateOrderStatus(newOrder, 'accepted');
      expect(api.updateBranchOrderStatus).toHaveBeenCalledWith(101, 'accepted');
      expect(newOrder.status).toBe('accepted');
    }
  });

  it('rejects order with recorded reason through the API', () => {
    const newOrder = component.orders.find((o) => o.status === 'new');
    expect(newOrder).toBeTruthy();
    if (newOrder) {
      component.openRejectModal(newOrder);
      expect(component.selectedOrderForRejection()).toBe(newOrder);

      component.rejectionReason = 'نفاد صنف الكباب بالمطبخ';
      component.confirmOrderRejection();
      expect(api.updateBranchOrderStatus).toHaveBeenCalledWith(
        101,
        'rejected',
        'نفاد صنف الكباب بالمطبخ',
      );
      expect(newOrder.status).toBe('rejected');
      expect(component.selectedOrderForRejection()).toBeNull();
    }
  });

  it('prevents branch manager from modifying order of another branch (isolation)', () => {
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
    expect(api.updateBranchOrderStatus).not.toHaveBeenCalled();
    expect(alertMock).toHaveBeenCalledWith('الطلب ده مش على فرعك');

    alertMock.mockRestore();
  });
});
