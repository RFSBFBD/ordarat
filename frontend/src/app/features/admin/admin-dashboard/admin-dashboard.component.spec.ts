import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AdminDashboardComponent } from './admin-dashboard.component';

describe('AdminDashboardComponent - Branch Managers', () => {
  let component: AdminDashboardComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminDashboardComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(AdminDashboardComponent);
    component = fixture.componentInstance;
  });

  it('should initialize with available branches and branch managers', () => {
    expect(component.availableBranches.length).toBeGreaterThanOrEqual(2);
    expect(component.branchManagers.length).toBeGreaterThanOrEqual(1);
  });

  it('should switch to branch_managers tab', () => {
    component.activeTab.set('branch_managers');
    expect(component.activeTab()).toBe('branch_managers');
  });

  it('should require branch selection when creating branch manager', () => {
    component.openBranchManagerModal();
    component.newManager = {
      name: 'سامي عبد الله',
      email: 'sami@example.com',
      phone: '01012345678',
      branchId: '', // missing branch
    };

    component.createBranchManager();
    expect(component.managerCreationError).toBe('اختار فرعًا');
  });

  it('should reject duplicate email or phone for branch managers', () => {
    const existing = component.branchManagers[0];
    component.openBranchManagerModal();
    component.newManager = {
      name: 'مستخدم مكرر',
      email: existing.email,
      phone: '01099887766',
      branchId: '1',
    };

    component.createBranchManager();
    expect(component.managerCreationError).toBe('الحساب ده موجود قبل كده');
  });

  it('should successfully create and link new branch manager', () => {
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const initialCount = component.branchManagers.length;

    component.openBranchManagerModal();
    component.newManager = {
      name: 'أحمد القنائي',
      email: 'ahmed.qena@example.com',
      phone: '01055566677',
      branchId: '2', // فرع المعنا
    };

    component.createBranchManager();
    expect(component.branchManagers.length).toBe(initialCount + 1);
    const added = component.branchManagers[component.branchManagers.length - 1];
    expect(added.name).toBe('أحمد القنائي');
    expect(added.branchId).toBe(2);
    expect(added.branchName).toBe('فرع المعنا');
    expect(component.showNewBranchManagerModal()).toBe(false);

    alertMock.mockRestore();
  });

  describe('Admin Analytics & AI Controls', () => {
    it('should switch to analytics tab and display SQL-backed metrics', () => {
      component.activeTab.set('analytics');
      expect(component.activeTab()).toBe('analytics');
      expect(component.analyticsPeriod).toBe('all');
      expect(component.analyticsData.orders.total_orders).toBeGreaterThan(0);
      expect(component.analyticsData.users.total_customers).toBeGreaterThan(0);
      expect(component.analyticsData.cash_summary.delivered_cash_total_egp).toBeDefined();
    });

    it('should switch to ai settings tab and display provider configurations', () => {
      component.activeTab.set('ai');
      expect(component.activeTab()).toBe('ai');
      expect(component.aiSettings.text_analysis.provider_name).toBe('mock');
      expect(component.aiSettings.image_ocr_menu.provider_name).toBe('mock');
      expect(component.aiSettings.image_generation.provider_name).toBe('mock');
      expect(component.aiKillSwitchActive).toBe(false);
    });

    it('should toggle emergency kill switch to stop all AI services', () => {
      const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});
      expect(component.aiKillSwitchActive).toBe(false);

      component.toggleKillSwitch();
      expect(component.aiKillSwitchActive).toBe(true);

      component.toggleKillSwitch();
      expect(component.aiKillSwitchActive).toBe(false);
      alertMock.mockRestore();
    });

    it('should toggle store AI freeze', () => {
      const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});
      const store = component.stores[0];
      const initialFreeze = store.is_frozen;

      component.toggleStoreFreeze(store);
      expect(store.is_frozen).toBe(!initialFreeze);

      alertMock.mockRestore();
    });

    it('should preview AI analysis payload ensuring zero customer PII before execution', () => {
      component.openAiAnalyzePreviewModal();
      expect(component.showAiAnalyzePreviewModal()).toBe(true);

      const payloadStr = component.aiPayloadPreviewJson();
      // Ensure zero PII: no customer phone numbers or customer personal names
      expect(payloadStr).not.toContain('010');
      expect(payloadStr).not.toContain('محمود');
      expect(payloadStr).not.toContain('إبراهيم');
      expect(payloadStr).toContain('total_orders');
    });
  });
});
