import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of } from 'rxjs';
import { AdminDashboardComponent } from './admin-dashboard.component';
import { ApiService } from '../../../core/services/api.service';

const storesResponse = [
  {
    id: 1, name: 'مطعم الكرنك (تجريبي)', type: 'restaurant', is_active: true,
    users: [{ name: 'أحمد محمود', phone: '01012345678' }],
    branches: [{ id: 1, name: 'فرع وسط البلد' }, { id: 2, name: 'فرع المعنا' }],
  },
  {
    id: 2, name: 'بقالة الأمانة (تجريبي)', type: 'grocery', is_active: false,
    users: [{ name: 'إبراهيم علي', phone: '01123456789' }],
    branches: [{ id: 3, name: 'فرع سيدي عبد الرحيم' }],
  },
];

const ordersResponse = {
  orders: [
    {
      id: 101, order_number: 'ORD-QNA-001', status: 'new',
      customer_name: 'محمود حسن', customer_phone: '01098765432', grand_total: '175.00',
      created_at: new Date(Date.now() - 14 * 60000).toISOString(),
      store: { id: 1, name: 'مطعم الكرنك (تجريبي)' },
    },
    {
      id: 102, order_number: 'ORD-QNA-002', status: 'preparing',
      customer_name: 'سارة مصطفى', customer_phone: '01144556677', grand_total: '95.50',
      created_at: new Date(Date.now() - 5 * 60000).toISOString(),
      store: { id: 2, name: 'بقالة الأمانة (تجريبي)' },
    },
  ],
};

const customersResponse = [
  { id: 1, name: 'محمود حسن', phone: '01098765432', email: 'mahmoud@example.com', status: 'active' },
  { id: 2, name: 'مستخدم محظور (تجريبي)', phone: '01511223344', email: 'suspended@example.com', status: 'suspended' },
];

const managersResponse = [
  {
    id: 1, name: 'يوسف محمود', phone: '01011223344', email: 'youssef@karank.com', status: 'active',
    managed_branches: [{ id: 1, name: 'فرع وسط البلد', store: { name: 'مطعم الكرنك' } }],
  },
];

const settingsResponse = {
  subscription_contact_number: '+201055370118',
  unaccepted_order_alert_minutes: 10,
  order_rate_limit_per_minute: 5,
};

const analyticsResponse = {
  period: 'all',
  users: { total_customers: 142, active_customers_in_period: 68, total_merchants: 12, total_branch_managers: 18 },
  orders: { total_orders: 310, by_status: { delivered: 235 }, unaccepted_delayed_count: 2 },
  cash_summary: { delivered_cash_total_egp: 41250.0, currency: 'EGP' },
  locations_aggregated: [{ zone: 'وسط البلد', count: 120 }],
  stores_activity: [{ store_name: 'مطعم الكرنك الأصيل', orders_count: 145 }],
};

describe('AdminDashboardComponent', () => {
  let component: AdminDashboardComponent;
  let api: any;

  beforeEach(async () => {
    api = {
      getAdminStores: vi.fn().mockReturnValue(of(storesResponse)),
      getAdminOrders: vi.fn().mockReturnValue(of(ordersResponse)),
      getAdminCustomers: vi.fn().mockReturnValue(of(customersResponse)),
      getAdminBranchManagers: vi.fn().mockReturnValue(of(managersResponse)),
      getAdminMerchantApplications: vi.fn().mockReturnValue(of([])),
      approveMerchantApplication: vi.fn().mockReturnValue(of({})),
      rejectMerchantApplication: vi.fn().mockReturnValue(of({})),
      getAdminSettings: vi.fn().mockReturnValue(of(settingsResponse)),
      getAdminAnalytics: vi.fn().mockReturnValue(of(analyticsResponse)),
      getAdminAiSettings: vi.fn().mockReturnValue(of({ kill_switch_active: false })),
      getAdminAiStoresQuota: vi.fn().mockReturnValue(of([{ id: 1, name: 'مطعم الكرنك', is_frozen: false }])),
      getAdminAiUsageLogs: vi.fn().mockReturnValue(of([])),
      createAdminStore: vi.fn().mockReturnValue(of({ id: 55, name: 'مطعم جديد', users: [{ name: 'مالك' }] })),
      toggleAdminStoreStatus: vi.fn().mockReturnValue(of({})),
      setStoreSubscription: vi.fn().mockReturnValue(of({ subscription_active: true, subscription_ends_at: '2026-12-31' })),
      toggleAdminCustomerStatus: vi.fn().mockReturnValue(of({})),
      overrideAdminOrderStatus: vi.fn().mockReturnValue(of({})),
      createAdminBranchManager: vi.fn().mockReturnValue(of({ id: 77 })),
      toggleAdminBranchManagerStatus: vi.fn().mockReturnValue(of({})),
      saveAdminSettings: vi.fn().mockReturnValue(of({})),
      toggleAdminAiKillSwitch: vi.fn().mockReturnValue(of({})),
      toggleAdminStoreFreeze: vi.fn().mockReturnValue(of({})),
      saveAdminAiSettings: vi.fn().mockReturnValue(of({})),
      testAdminAiConnection: vi.fn().mockReturnValue(of({})),
      analyzeAdminPlatform: vi.fn().mockReturnValue(of({ analysis: 'تحليل', hypotheses: [] })),
    };

    await TestBed.configureTestingModule({
      imports: [AdminDashboardComponent],
      providers: [{ provide: ApiService, useValue: api }],
    }).compileComponents();

    const fixture = TestBed.createComponent(AdminDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads stores, orders, customers, managers, settings and analytics from the API', () => {
    expect(component).toBeTruthy();
    expect(component.stores.length).toBe(2);
    expect(component.orders.length).toBe(2);
    expect(component.customers.length).toBe(2);
    expect(component.branchManagers.length).toBe(1);
    expect(component.settings.subscription_contact_number).toBe('+201055370118');
    expect(component.analyticsData.users.total_customers).toBe(142);
    expect(component.loading).toBe(false);
  });

  it('builds available branches from the real stores data', () => {
    expect(component.availableBranches.length).toBe(3);
    expect(component.availableBranches[0].storeName).toContain('الكرنك');
  });

  it('flags delayed unaccepted orders based on the configured threshold', () => {
    expect(component.unacceptedAlertCount()).toBe(1);
  });

  it('toggles store status through the API with a mandatory reason', () => {
    const promptMock = vi.spyOn(window, 'prompt').mockReturnValue('مخالفة شروط المنصة');
    const store = component.stores[0];
    component.toggleStoreStatus(store);
    expect(api.toggleAdminStoreStatus).toHaveBeenCalledWith(1, false, 'مخالفة شروط المنصة');
    expect(store.active).toBe(false);
    promptMock.mockRestore();
  });

  it('does not call the API when the reason prompt is cancelled', () => {
    const promptMock = vi.spyOn(window, 'prompt').mockReturnValue(null);
    component.toggleStoreStatus(component.stores[0]);
    expect(api.toggleAdminStoreStatus).not.toHaveBeenCalled();
    component.toggleCustomerStatus(component.customers[0]);
    expect(api.toggleAdminCustomerStatus).not.toHaveBeenCalled();
    promptMock.mockRestore();
  });

  it('overrides order status through the API with reason', () => {
    const order = component.orders[0];
    component.openStatusOverrideModal(order);
    component.overrideNewStatus = 'cancelled';
    component.overrideReason = 'طلب مكرر من العميل';
    component.confirmStatusOverride();
    expect(api.overrideAdminOrderStatus).toHaveBeenCalledWith(101, 'cancelled', 'طلب مكرر من العميل');
    expect(order.status).toBe('cancelled');
  });

  it('rejects duplicate email or phone for branch managers locally', () => {
    component.newManager = { name: 'مسؤول جديد', email: 'youssef@karank.com', phone: '01011223344', branchId: '1' };
    component.createBranchManager();
    expect(component.managerCreationError).toBeTruthy();
    expect(api.createAdminBranchManager).not.toHaveBeenCalled();
  });

  it('creates and links a new branch manager through the API', () => {
    component.newManager = { name: 'مسؤول فرع المعنا', email: 'maana@karank.com', phone: '01055566677', branchId: '2' };
    component.createBranchManager();
    expect(api.createAdminBranchManager).toHaveBeenCalledWith({
      name: 'مسؤول فرع المعنا', email: 'maana@karank.com', phone: '01055566677', branch_id: 2,
    });
    const created = component.branchManagers.find((b) => b.email === 'maana@karank.com');
    expect(created).toBeTruthy();
    expect(created.branchName).toBe('فرع المعنا');
  });

  it('opens the store account form and requires every field before calling the API', () => {
    component.showNewStoreModal.set(true);
    component.createStore();
    expect(component.storeCreationError).toBeTruthy();
    component.newStore = { name: 'مطعم جديد', type: 'restaurant', logo: 'data:image/webp;base64,AAAA', phone: '123', area: 'وسط البلد', address: 'شارع', ownerEmail: 'o@x.com' };
    component.createStore();
    expect(component.storeCreationError).toContain('مصري');
    expect(api.createAdminStore).not.toHaveBeenCalled();
  });

  it('creates a store account through the API and lists it', () => {
    component.newStore = { name: 'مطعم جديد', type: 'restaurant', logo: 'data:image/webp;base64,AAAA', phone: '01012345678', area: 'وسط البلد', address: 'شارع', ownerEmail: 'o@x.com' };
    component.createStore();
    expect(api.createAdminStore).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'مطعم جديد', type: 'restaurant', owner_email: 'o@x.com', branch_phone: '01012345678', area_name: 'وسط البلد' }),
    );
    expect(component.stores[0].name).toBe('مطعم جديد');
  });

  it('reloads analytics when the period changes', () => {
    api.getAdminAnalytics.mockClear();
    component.setAnalyticsPeriod('week');
    expect(api.getAdminAnalytics).toHaveBeenCalledWith('week');
    expect(component.analyticsPeriod).toBe('week');
  });

  it('toggles the AI kill switch through the API', () => {
    component.toggleKillSwitch();
    expect(api.toggleAdminAiKillSwitch).toHaveBeenCalledWith(true);
    expect(component.aiKillSwitchActive).toBe(true);
  });

  it('activates a manual subscription with an end date (no payment) and can end it', () => {
    const promptMock = vi.spyOn(window, 'prompt').mockReturnValue('2026-12-31');
    const store = component.stores[0];
    component.activateSubscription(store);
    expect(api.setStoreSubscription).toHaveBeenCalledWith(store.id, { active: true, ends_at: '2026-12-31' });
    expect(store.subscriptionActive).toBe(true);
    expect(store.subscriptionEnds).toBe('2026-12-31');
    promptMock.mockRestore();

    const confirmMock = vi.spyOn(window, 'confirm').mockReturnValue(true);
    component.endSubscription(store);
    expect(api.setStoreSubscription).toHaveBeenCalledWith(store.id, { active: false });
    expect(store.subscriptionActive).toBe(false);
    confirmMock.mockRestore();
  });

  it('rejects a malformed end date without calling the API', () => {
    const promptMock = vi.spyOn(window, 'prompt').mockReturnValue('31/12/2026');
    component.activateSubscription(component.stores[0]);
    expect(api.setStoreSubscription).not.toHaveBeenCalled();
    promptMock.mockRestore();
  });
});
