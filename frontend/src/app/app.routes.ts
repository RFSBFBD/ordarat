import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/guards/auth.guard';

/**
 * Every feature screen is lazy-loaded: the initial bundle only carries the
 * shell, and dashboards/auth screens download on first visit.
 */
export const routes: Routes = [
  // 1. Home / Landing View
  {
    path: '',
    loadComponent: () =>
      import('./features/home/home.component').then((m) => m.HomeComponent),
    pathMatch: 'full',
  },

  // 2. Customer Zone
  {
    path: 'customer',
    children: [
      { path: '', redirectTo: 'stores', pathMatch: 'full' },
      {
        path: 'stores',
        loadComponent: () =>
          import('./features/customer/stores-list/stores-list.component').then(
            (m) => m.StoresListComponent,
          ),
      },
      {
        path: 'stores/:id',
        loadComponent: () =>
          import('./features/customer/store-detail/store-detail.component').then(
            (m) => m.StoreDetailComponent,
          ),
      },
      {
        path: 'checkout',
        loadComponent: () =>
          import('./features/customer/checkout/checkout.component').then(
            (m) => m.CheckoutComponent,
          ),
      },
      {
        path: 'orders/:id',
        loadComponent: () =>
          import('./features/customer/order-tracking/order-tracking.component').then(
            (m) => m.OrderTrackingComponent,
          ),
        canActivate: [authGuard],
      },
    ],
  },

  // 3. Store / Merchant Zone (isolated: merchant role only)
  {
    path: 'store',
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/merchant/merchant-dashboard/merchant-dashboard.component').then(
            (m) => m.MerchantDashboardComponent,
          ),
        canActivate: [roleGuard('merchant', 'admin')],
      },
    ],
  },

  // 3b. Branch Manager Zone (isolated: branch managers only)
  {
    path: 'branch',
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/branch/branch-dashboard/branch-dashboard.component').then(
            (m) => m.BranchDashboardComponent,
          ),
        canActivate: [roleGuard('branch_manager', 'admin')],
      },
    ],
  },

  // 4. Admin Zone (isolated: admin role only)
  {
    path: 'admin',
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/admin/admin-dashboard/admin-dashboard.component').then(
            (m) => m.AdminDashboardComponent,
          ),
        canActivate: [roleGuard('admin')],
      },
    ],
  },

  // 5. Auth & Onboarding Zone (ONE sign-in flow for everyone)
  {
    path: 'auth',
    children: [
      { path: '', redirectTo: 'login', pathMatch: 'full' },
      {
        path: 'login',
        loadComponent: () =>
          import('./features/auth/login/login.component').then((m) => m.LoginComponent),
      },
      {
        path: 'welcome',
        loadComponent: () =>
          import('./features/auth/welcome/welcome.component').then((m) => m.WelcomeComponent),
      },
      {
        path: 'onboarding/customer',
        loadComponent: () =>
          import('./features/auth/customer-onboarding/customer-onboarding.component').then(
            (m) => m.CustomerOnboardingComponent,
          ),
        canActivate: [authGuard],
      },
      {
        path: 'onboarding/business',
        loadComponent: () =>
          import('./features/auth/business-onboarding/business-onboarding.component').then(
            (m) => m.BusinessOnboardingComponent,
          ),
        canActivate: [authGuard],
      },
      {
        path: 'pending',
        loadComponent: () =>
          import('./features/auth/pending-approval/pending-approval.component').then(
            (m) => m.PendingApprovalComponent,
          ),
      },
      {
        path: 'merchant-info',
        loadComponent: () =>
          import('./features/merchant/merchant-info/merchant-info.component').then(
            (m) => m.MerchantInfoComponent,
          ),
      },
    ],
  },

  // Fallback
  { path: '**', redirectTo: '' },
];
