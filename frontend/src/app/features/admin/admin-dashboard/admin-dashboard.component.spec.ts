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
});
