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
});
