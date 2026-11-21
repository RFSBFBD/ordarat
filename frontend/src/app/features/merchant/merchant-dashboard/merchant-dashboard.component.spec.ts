import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { MerchantDashboardComponent } from './merchant-dashboard.component';

describe('MerchantDashboardComponent - Branches & Filters', () => {
  let component: MerchantDashboardComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MerchantDashboardComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(MerchantDashboardComponent);
    component = fixture.componentInstance;
  });

  it('should initialize with branches and their order acceptance status', () => {
    expect(component.branches.length).toBeGreaterThanOrEqual(2);
    component.branches.forEach((b) => {
      expect(b.is_accepting_orders).toBeDefined();
      expect(b.working_hours).toBeDefined();
    });
  });

  it('should filter orders by specific branch', () => {
    component.selectedBranchFilter = 'all';
    expect(component.filteredOrders().length).toBe(component.orders.length);

    component.selectedBranchFilter = '1';
    const branch1Orders = component.filteredOrders();
    expect(branch1Orders.length).toBeGreaterThan(0);
    branch1Orders.forEach((o) => {
      expect(o.branchId).toBe(1);
    });

    component.selectedBranchFilter = '2';
    const branch2Orders = component.filteredOrders();
    expect(branch2Orders.length).toBeGreaterThan(0);
    branch2Orders.forEach((o) => {
      expect(o.branchId).toBe(2);
    });
  });

  it('should toggle branch order acceptance from merchant dashboard', () => {
    const branch1 = component.branches[0];
    const initialStatus = branch1.is_accepting_orders;
    component.toggleBranchReceiving(branch1);
    expect(branch1.is_accepting_orders).toBe(!initialStatus);
  });

  describe('Merchant AI Tools', () => {
    it('should switch to ai_tools tab and display features', () => {
      component.activeTab.set('ai_tools');
      expect(component.activeTab()).toBe('ai_tools');
      expect(component.aiAvailable()).toBe(true);
    });

    it('should toggle privacy blur on menu preview image', () => {
      expect(component.isBlurActive()).toBe(false);
      component.toggleBlur();
      expect(component.isBlurActive()).toBe(true);
      component.toggleBlur();
      expect(component.isBlurActive()).toBe(false);
    });

    it('should review draft items and import accepted items into products list', () => {
      const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});
      const initialProductCount = component.products.length;
      const draft = component.menuDrafts()[0];

      expect(draft.items.length).toBeGreaterThan(0);
      const ambiguousItem = draft.items.find((i: any) => i.is_ambiguous);
      expect(ambiguousItem).toBeDefined();

      // Fix ambiguous item price and accept it
      ambiguousItem.price = 175.0;
      ambiguousItem.is_accepted = true;

      // Import accepted items
      component.importAcceptedDraftItems(draft);

      expect(component.products.length).toBeGreaterThan(initialProductCount);
      expect(draft.status).toBe('imported');

      alertMock.mockRestore();
    });

    it('should generate illustrative product image and allow human approval', () => {
      const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});
      vi.useFakeTimers();

      component.imageGenProductName = 'كباب حلة صعيدي بالفريك';
      component.imageGenCategory = 'طواجن';
      component.generateProductImage();

      vi.advanceTimersByTime(600);

      const generated = component.generatedImage();
      expect(generated).toBeDefined();
      expect(generated?.name).toBe('كباب حلة صعيدي بالفريك');
      expect(generated?.is_illustrative).toBe(true);
      expect(generated?.is_approved).toBe(false);

      // Human review and approve
      component.approveGeneratedImage();
      expect(component.generatedImage()?.is_approved).toBe(true);

      vi.useRealTimers();
      alertMock.mockRestore();
    });
  });
});
