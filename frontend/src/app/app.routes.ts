import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import { StoresListComponent } from './features/customer/stores-list/stores-list.component';
import { StoreDetailComponent } from './features/customer/store-detail/store-detail.component';
import { CheckoutComponent } from './features/customer/checkout/checkout.component';
import { OrderTrackingComponent } from './features/customer/order-tracking/order-tracking.component';
import { MerchantDashboardComponent } from './features/merchant/merchant-dashboard/merchant-dashboard.component';
import { MerchantInfoComponent } from './features/merchant/merchant-info/merchant-info.component';
import { AdminDashboardComponent } from './features/admin/admin-dashboard/admin-dashboard.component';
import { BranchDashboardComponent } from './features/branch/branch-dashboard/branch-dashboard.component';
import { LoginComponent } from './features/auth/login/login.component';

export const routes: Routes = [
  // 1. Home / Landing View
  { path: '', component: HomeComponent, pathMatch: 'full' },

  // 2. Customer Zone
  {
    path: 'customer',
    children: [
      { path: '', redirectTo: 'stores', pathMatch: 'full' },
      { path: 'stores', component: StoresListComponent },
      { path: 'stores/:id', component: StoreDetailComponent },
      { path: 'checkout', component: CheckoutComponent },
      { path: 'orders/:id', component: OrderTrackingComponent },
    ],
  },

  // 3. Store / Merchant Zone
  {
    path: 'store',
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: MerchantDashboardComponent },
    ],
  },

  // 3b. Branch Manager Zone
  {
    path: 'branch',
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: BranchDashboardComponent },
    ],
  },

  // 4. Admin Zone
  {
    path: 'admin',
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: AdminDashboardComponent },
    ],
  },

  // 5. Auth & Onboarding Zone
  {
    path: 'auth',
    children: [
      { path: '', redirectTo: 'login', pathMatch: 'full' },
      { path: 'login', component: LoginComponent },
      { path: 'merchant-info', component: MerchantInfoComponent },
    ],
  },

  // Fallback
  { path: '**', redirectTo: '' },
];
