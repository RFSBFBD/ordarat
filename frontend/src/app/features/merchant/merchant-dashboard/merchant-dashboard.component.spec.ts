import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of } from 'rxjs';
import { MerchantDashboardComponent } from './merchant-dashboard.component';
import { ApiService } from '../../../core/services/api.service';

const storesResponse = [
  { id: 1, name: 'مطعم الكرنك الأصيل (قنا)', type: 'restaurant', is_active: true, is_accepting_orders: true, working_hours: { from: '09:00', to: '23:00' } },
];

const branchesResponse = [
  { id: 1, name: 'فرع وسط البلد', address: 'شارع الجمهورية', phone: '01012345678', is_active: true, is_accepting_orders: true, working_hours: { from: '09:00', to: '23:00' } },
  { id: 2, name: 'فرع المعنا', address: 'طريق مصر أسوان', phone: '01099887766', is_active: true, is_accepting_orders: true, working_hours: { from: '10:00', to: '00:00' } },
];

const zonesResponse = {
  branch_id: 1,
  branch_name: 'فرع وسط البلد',
  pricing_policy: 'STORE_OWNER_PRICED',
  zones: [
    { zone_id: 1, zone_name: 'وسط البلد', delivery_fee: '10.00', is_served: true },
    { zone_id: 2, zone_name: 'المعنا', delivery_fee: '15.00', is_served: true },
  ],
};

const productsResponse = [
  { id: 1, name: 'وجبة كباب وكفتة', price: '130.00', description: 'نصف كيلو', is_available: true, category: { id: 1, name: 'مشويات' } },
  { id: 2, name: 'ساندوتش كفتة قناوي', price: '45.00', description: null, is_available: false, category: null },
];

const ordersResponse = {
  orders: [
    {
      id: 101, order_number: 'ORD-QNA-501', branch_id: 1, status: 'new',
      customer_name: 'محمود حسن', customer_phone: '01098765432', customer_notes: null,
      items_total: '175.00', delivery_fee: '15.00', grand_total: '190.00', payment_method: 'COD',
      created_at: new Date(Date.now() - 3 * 60000).toISOString(),
      branch: { id: 1, name: 'فرع وسط البلد' },
      zone: { id: 1, name: 'وسط البلد' },
      items: [{ id: 1, product_name: 'وجبة كباب', unit_price: '130.00', quantity: 1, subtotal: '130.00' }],
    },
    {
      id: 102, order_number: 'ORD-QNA-502', branch_id: 2, status: 'preparing',
      customer_name: 'إبراهيم ناصر', customer_phone: '01122334455', customer_notes: null,
      items_total: '90.00', delivery_fee: '15.00', grand_total: '105.00', payment_method: 'COD',
      created_at: new Date(Date.now() - 18 * 60000).toISOString(),
      branch: { id: 2, name: 'فرع المعنا' },
      zone: { id: 2, name: 'الجامعة' },
      items: [],
    },
  ],
  new_orders_count: 1,
  branches_overview: [],
  play_audio_alert: false,
};

describe('MerchantDashboardComponent', () => {
  let component: MerchantDashboardComponent;
  let api: any;

  beforeEach(async () => {
    api = {
      getMerchantStores: vi.fn().mockReturnValue(of(storesResponse)),
      getMerchantBranches: vi.fn().mockReturnValue(of(branchesResponse)),
      getMerchantBranchZones: vi.fn().mockReturnValue(of(zonesResponse)),
      getMerchantProducts: vi.fn().mockReturnValue(of(productsResponse)),
      getMerchantOrders: vi.fn().mockReturnValue(of(ordersResponse)),
      getMerchantMenuDrafts: vi.fn().mockReturnValue(of([])),
      updateMerchantStore: vi.fn().mockReturnValue(of({ ...storesResponse[0], is_accepting_orders: false })),
      updateMerchantBranch: vi.fn().mockReturnValue(of({ ...branchesResponse[0], is_accepting_orders: false })),
      updateMerchantOrderStatus: vi.fn().mockReturnValue(of(ordersResponse.orders[0])),
      toggleMerchantProductAvailability: vi.fn().mockReturnValue(of({ ...productsResponse[0], is_available: false })),
      updateMerchantProduct: vi.fn().mockReturnValue(of(productsResponse[0])),
      createMerchantProduct: vi.fn().mockReturnValue(of({ id: 99, name: 'صنف جديد', price: '50.00', description: '', is_available: true, category: null })),
      saveMerchantBranchZones: vi.fn().mockReturnValue(of({})),
      extractMerchantMenu: vi.fn(),
      importMerchantMenuDraft: vi.fn(),
      generateMerchantProductImage: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [MerchantDashboardComponent],
      providers: [{ provide: ApiService, useValue: api }],
    }).compileComponents();

    const fixture = TestBed.createComponent(MerchantDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads store, branches, zones, products and orders from the API on init', () => {
    expect(component).toBeTruthy();
    expect(component.currentStore.name).toContain('مطعم الكرنك');
    expect(api.getMerchantBranches).toHaveBeenCalledWith(1);
    expect(api.getMerchantProducts).toHaveBeenCalledWith(1);
    expect(api.getMerchantOrders).toHaveBeenCalled();
    expect(api.getMerchantBranchZones).toHaveBeenCalledWith(1, 1);
    expect(component.branches.length).toBe(2);
    expect(component.branchZones.length).toBe(2);
    expect(component.products.length).toBe(2);
    expect(component.orders.length).toBe(2);
    expect(component.loading).toBe(false);
  });

  it('filters orders by branch and status', () => {
    component.selectedBranchFilter = '1';
    expect(component.filteredOrders().length).toBe(1);
    component.selectedBranchFilter = 'all';
    component.orderFilter = 'in_progress';
    expect(component.filteredOrders().length).toBe(1);
    expect(component.filteredOrders()[0].status).toBe('preparing');
  });

  it('toggles store receiving through the API', () => {
    component.toggleReceiving();
    expect(api.updateMerchantStore).toHaveBeenCalledWith(1, { is_accepting_orders: false });
    expect(component.currentStore.is_accepting_orders).toBe(false);
  });

  it('toggles branch receiving through the API', () => {
    const branch = component.branches[0];
    component.toggleBranchReceiving(branch);
    expect(api.updateMerchantBranch).toHaveBeenCalledWith(1, 1, { is_accepting_orders: false });
    expect(branch.is_accepting_orders).toBe(false);
  });

  it('advances order status through the API', () => {
    const order = component.orders[0];
    component.updateOrderStatus(order, 'accepted');
    expect(api.updateMerchantOrderStatus).toHaveBeenCalledWith(1, 101, 'accepted');
    expect(order.status).toBe('accepted');
  });

  it('rejects an order with reason through the API', () => {
    const order = component.orders[0];
    component.openRejectModal(order);
    component.rejectionReason = 'نفاد الكباب';
    component.confirmOrderRejection();
    expect(api.updateMerchantOrderStatus).toHaveBeenCalledWith(1, 101, 'rejected', 'نفاد الكباب');
    expect(order.status).toBe('rejected');
  });

  it('saves zone fees for the selected branch through the API', () => {
    component.saveZoneFees();
    expect(api.saveMerchantBranchZones).toHaveBeenCalledWith(1, 1, [
      { zone_id: 1, delivery_fee: 10, is_served: true },
      { zone_id: 2, delivery_fee: 15, is_served: true },
    ]);
    expect(component.actionSuccess).toContain('تم حفظ');
  });

  it('creates a product through the API', () => {
    component.newProduct = { name: 'صنف جديد', price: 50 as any, description: '' };
    component.saveNewProduct();
    expect(api.createMerchantProduct).toHaveBeenCalledWith(1, { name: 'صنف جديد', price: 50, description: '' });
    expect(component.products[0].id).toBe(99);
  });
});
