import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, TimeoutError, catchError, map, throwError, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ApiError {
  kind: 'network' | 'server' | 'auth' | 'validation' | 'not-found';
  message: string;
  status: number;
}

export interface ApiStore {
  id: number;
  type: 'restaurant' | 'grocery';
  name: string;
  image_url: string | null;
  logo_url?: string | null;
  is_active: boolean;
  is_accepting_orders: boolean;
  working_hours?: { from?: string; to?: string } | null;
  branches?: ApiBranch[];
}

/** A registered business that is not approved yet: only its name, type and logo are public. */
export interface ApiPendingBusiness {
  id: number;
  name: string;
  type: 'restaurant' | 'grocery';
  logo_url: string;
}

export interface ApiBranch {
  id: number;
  name: string;
  address: string | null;
  is_active: boolean;
  is_accepting_orders?: boolean;
}

export interface ApiProduct {
  id: number;
  category_id: number | null;
  name: string;
  description: string | null;
  price: string | number;
  image_url: string | null;
  is_available: boolean;
}

export interface ApiCategory {
  id: number;
  name: string;
  products?: ApiProduct[];
}

export interface ApiStoreDetail extends ApiStore {
  categories?: ApiCategory[];
  products?: ApiProduct[];
}

export interface QuoteRequest {
  store_id: number;
  items: { product_id: number; quantity: number }[];
  delivery_latitude: number;
  delivery_longitude: number;
}

export interface QuoteResponse {
  store_id: number;
  store_name: string;
  branch: { id: number; name: string; address: string | null };
  zone: { id: number | null; name: string };
  items_total: string;
  delivery_fee: string;
  grand_total: string;
  payment_method: string;
}

export interface CheckoutRequest extends QuoteRequest {
  phone: string;
  name?: string | null;
  customer_notes?: string | null;
  idempotency_key: string;
}

export interface ApiOrderItem {
  id: number;
  product_name: string;
  unit_price: string;
  quantity: number;
  subtotal: string;
}

export interface ApiStatusHistoryEntry {
  id: number;
  from_status: string | null;
  to_status: string;
  note: string | null;
  created_at: string;
}

export interface ApiOrder {
  id: number;
  order_number: string;
  status: string;
  branch_id?: number;
  store_id?: number;
  zone_id?: number | null;
  zone?: { id: number; name: string } | null;
  delivery_latitude?: number | null;
  delivery_longitude?: number | null;
  customer_name: string;
  customer_phone: string;
  customer_notes: string | null;
  items_total: string;
  delivery_fee: string;
  grand_total: string;
  payment_method: string;
  created_at: string;
  store?: { id: number; name: string };
  branch?: { id: number; name: string; address: string | null };
  items?: ApiOrderItem[];
  status_history?: ApiStatusHistoryEntry[];
  statusHistory?: ApiStatusHistoryEntry[];
}

export interface OnboardingStatus {
  profile_complete: boolean;
  onboarding_state: string;
  name: string | null;
  phone: string | null;
  address: string | null;
  merchant_application: {
    id: number;
    business_name: string;
    status: 'pending' | 'approved' | 'rejected';
    admin_note: string | null;
  } | null;
}

export interface CustomerOnboardingRequest {
  name: string;
  phone: string;
  address?: string | null;
  latitude: number;
  longitude: number;
}

export interface MerchantApplicationRequest {
  business_name: string;
  type: 'restaurant' | 'grocery';
  phone: string;
  address: string;
  latitude: number;
  longitude: number;
  has_branches: boolean;
  area_name: string;
  /** PNG/JPEG/WebP data URL, already downscaled in the browser. */
  logo: string;
  branches?: { name: string; address: string; phone: string | null; latitude: number; longitude: number }[];
}

export interface AdminMerchantApplication {
  id: number;
  business_name: string;
  type: 'restaurant' | 'grocery';
  phone: string;
  address: string;
  has_branches: boolean;
  area_name: string;
  extra_branches?: { name: string; address: string; phone: string | null }[];
  logo_url?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  admin_note: string | null;
  created_at: string;
  owner: { id: number; name: string; email: string | null; phone: string | null } | null;
}

interface Envelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

/**
 * Thin typed wrapper around the Ordarat Laravel API.
 * Auth headers are attached automatically by authInterceptor.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  /** Hard ceiling for any single API call so pages never hang on a dead backend. */
  private static readonly REQUEST_TIMEOUT_MS = 20000;

  /** Shared response pipeline: timeout, unwrap the envelope, normalize errors. */
  private unwrap<T>(): (source: Observable<Envelope<T>>) => Observable<T> {
    return (source) =>
      source.pipe(
        timeout(ApiService.REQUEST_TIMEOUT_MS),
        map((r) => r.data),
        catchError((e) => throwError(() => toApiError(e))),
      );
  }

  getStores(): Observable<ApiStore[]> {
    return this.http
      .get<Envelope<ApiStore[]>>(`${this.base}/stores`)
      .pipe(this.unwrap<ApiStore[]>());
  }

  getPendingBusinesses(): Observable<ApiPendingBusiness[]> {
    return this.http
      .get<Envelope<ApiPendingBusiness[]>>(`${this.base}/pending-businesses`)
      .pipe(this.unwrap<ApiPendingBusiness[]>());
  }

  getStore(id: number): Observable<ApiStoreDetail> {
    return this.http
      .get<Envelope<ApiStoreDetail>>(`${this.base}/stores/${id}`)
      .pipe(this.unwrap<ApiStoreDetail>());
  }

  quote(req: QuoteRequest): Observable<QuoteResponse> {
    return this.http
      .post<Envelope<QuoteResponse>>(`${this.base}/checkout/quote`, req)
      .pipe(this.unwrap<QuoteResponse>());
  }

  checkout(req: CheckoutRequest): Observable<ApiOrder> {
    return this.http
      .post<Envelope<ApiOrder>>(`${this.base}/checkout`, req, {
        headers: { 'X-Blocking-Loading': '1' },
      })
      .pipe(this.unwrap<ApiOrder>());
  }

  getOrder(id: number, opts?: { silent?: boolean }): Observable<ApiOrder> {
    const headers = opts?.silent ? { 'X-Silent-Loading': '1' } : undefined;
    return this.http
      .get<Envelope<ApiOrder>>(`${this.base}/orders/${id}`, headers ? { headers } : {})
      .pipe(this.unwrap<ApiOrder>());
  }

  // ---- Unified sign-in onboarding ----

  getOnboardingStatus(): Observable<OnboardingStatus> {
    return this.http
      .get<Envelope<OnboardingStatus>>(`${this.base}/onboarding/status`)
      .pipe(this.unwrap<OnboardingStatus>());
  }

  completeCustomerOnboarding(
    req: CustomerOnboardingRequest,
  ): Observable<{ profile_complete: boolean }> {
    return this.http
      .post<Envelope<{ profile_complete: boolean }>>(`${this.base}/onboarding/customer`, req)
      .pipe(this.unwrap<{ profile_complete: boolean }>());
  }

  submitMerchantApplication(
    req: MerchantApplicationRequest,
  ): Observable<{ id: number; status: string }> {
    return this.http
      .post<Envelope<{ id: number; status: string }>>(
        `${this.base}/onboarding/merchant-application`,
        req,
      )
      .pipe(this.unwrap<{ id: number; status: string }>());
  }

  // ---- Admin: business join applications ----

  getAdminMerchantApplications(status?: string): Observable<AdminMerchantApplication[]> {
    const params = status ? `?status=${encodeURIComponent(status)}` : '';
    return this.http
      .get<Envelope<AdminMerchantApplication[]>>(
        `${this.base}/admin/merchant-applications${params}`,
      )
      .pipe(this.unwrap<AdminMerchantApplication[]>());
  }

  approveMerchantApplication(id: number): Observable<{ store_id: number }> {
    return this.http
      .post<Envelope<{ store_id: number }>>(
        `${this.base}/admin/merchant-applications/${id}/approve`,
        {},
      )
      .pipe(this.unwrap<{ store_id: number }>());
  }

  rejectMerchantApplication(id: number, note: string): Observable<unknown> {
    return this.http
      .post<Envelope<unknown>>(`${this.base}/admin/merchant-applications/${id}/reject`, { note })
      .pipe(this.unwrap<unknown>());
  }

  // ---- Branch manager dashboard endpoints (role: branch_manager) ----

  getBranchDashboard(): Observable<BranchDashboardData> {
    return this.http
      .get<Envelope<BranchDashboardData>>(`${this.base}/branch/dashboard`)
      .pipe(this.unwrap<BranchDashboardData>());
  }

  getBranchOrders(status?: string): Observable<BranchOrdersData> {
    const params = status ? `?status=${encodeURIComponent(status)}` : '';
    return this.http
      .get<Envelope<BranchOrdersData>>(`${this.base}/branch/orders${params}`)
      .pipe(this.unwrap<BranchOrdersData>());
  }

  toggleBranchStatus(isAcceptingOrders: boolean): Observable<BranchStatusData> {
    return this.http
      .patch<Envelope<BranchStatusData>>(`${this.base}/branch/status`, {
        is_accepting_orders: isAcceptingOrders,
      })
      .pipe(this.unwrap<BranchStatusData>());
  }

  updateBranchOrderStatus(orderId: number, status: string, reason?: string): Observable<ApiOrder> {
    return this.http
      .patch<Envelope<ApiOrder>>(`${this.base}/branch/orders/${orderId}/status`, {
        status,
        reason: reason ?? null,
      })
      .pipe(this.unwrap<ApiOrder>());
  }

  // ---- Merchant (store owner) dashboard endpoints (role: merchant) ----

  getMerchantStores(): Observable<MerchantStore[]> {
    return this.http
      .get<Envelope<MerchantStore[]>>(`${this.base}/merchant/stores`)
      .pipe(this.unwrap<MerchantStore[]>());
  }

  updateMerchantStore(
    storeId: number,
    payload: Record<string, unknown>,
  ): Observable<MerchantStore> {
    return this.http
      .put<Envelope<MerchantStore>>(`${this.base}/merchant/stores/${storeId}`, payload)
      .pipe(this.unwrap<MerchantStore>());
  }

  getMerchantBranches(storeId: number): Observable<MerchantBranch[]> {
    return this.http
      .get<Envelope<MerchantBranch[]>>(`${this.base}/merchant/stores/${storeId}/branches`)
      .pipe(this.unwrap<MerchantBranch[]>());
  }

  updateMerchantBranch(
    storeId: number,
    branchId: number,
    payload: Record<string, unknown>,
  ): Observable<MerchantBranch> {
    return this.http
      .put<Envelope<MerchantBranch>>(
        `${this.base}/merchant/stores/${storeId}/branches/${branchId}`,
        payload,
      )
      .pipe(this.unwrap<MerchantBranch>());
  }

  getMerchantBranchZones(storeId: number, branchId: number): Observable<MerchantZonesData> {
    return this.http
      .get<Envelope<MerchantZonesData>>(
        `${this.base}/merchant/stores/${storeId}/branches/${branchId}/zones`,
      )
      .pipe(this.unwrap<MerchantZonesData>());
  }

  saveMerchantBranchZones(
    storeId: number,
    branchId: number,
    fees: Array<{ zone_id: number; delivery_fee: number; is_served: boolean }>,
  ): Observable<unknown> {
    return this.http
      .put<Envelope<unknown>>(
        `${this.base}/merchant/stores/${storeId}/branches/${branchId}/zones`,
        { fees },
      )
      .pipe(this.unwrap<unknown>());
  }

  getMerchantProducts(storeId: number): Observable<MerchantProduct[]> {
    return this.http
      .get<Envelope<MerchantProduct[]>>(`${this.base}/merchant/stores/${storeId}/products`)
      .pipe(this.unwrap<MerchantProduct[]>());
  }

  createMerchantProduct(
    storeId: number,
    payload: { name: string; price: number; description?: string; category_id?: number },
  ): Observable<MerchantProduct> {
    return this.http
      .post<Envelope<MerchantProduct>>(`${this.base}/merchant/stores/${storeId}/products`, payload)
      .pipe(this.unwrap<MerchantProduct>());
  }

  updateMerchantProduct(
    storeId: number,
    productId: number,
    payload: Record<string, unknown>,
  ): Observable<MerchantProduct> {
    return this.http
      .put<Envelope<MerchantProduct>>(
        `${this.base}/merchant/stores/${storeId}/products/${productId}`,
        payload,
      )
      .pipe(this.unwrap<MerchantProduct>());
  }

  toggleMerchantProductAvailability(
    storeId: number,
    productId: number,
  ): Observable<MerchantProduct> {
    return this.http
      .patch<Envelope<MerchantProduct>>(
        `${this.base}/merchant/stores/${storeId}/products/${productId}/toggle-availability`,
        {},
      )
      .pipe(this.unwrap<MerchantProduct>());
  }

  getMerchantOrders(
    storeId: number,
    status?: string,
    branchId?: number | string,
  ): Observable<MerchantOrdersData> {
    const params: string[] = [];
    if (status) params.push(`status=${encodeURIComponent(status)}`);
    if (branchId !== undefined && branchId !== 'all') params.push(`branch_id=${branchId}`);
    const qs = params.length ? `?${params.join('&')}` : '';
    return this.http
      .get<Envelope<MerchantOrdersData>>(`${this.base}/merchant/stores/${storeId}/orders${qs}`)
      .pipe(this.unwrap<MerchantOrdersData>());
  }

  updateMerchantOrderStatus(
    storeId: number,
    orderId: number,
    status: string,
    reason?: string,
  ): Observable<ApiOrder> {
    return this.http
      .patch<Envelope<ApiOrder>>(
        `${this.base}/merchant/stores/${storeId}/orders/${orderId}/status`,
        { status, reason: reason ?? null },
      )
      .pipe(this.unwrap<ApiOrder>());
  }

  getMerchantMenuDrafts(storeId: number): Observable<MerchantMenuDraft[]> {
    return this.http
      .get<Envelope<MerchantMenuDraft[]>>(`${this.base}/merchant/stores/${storeId}/ai/menu-drafts`)
      .pipe(this.unwrap<MerchantMenuDraft[]>());
  }

  extractMerchantMenu(storeId: number, image: File): Observable<MerchantMenuDraft> {
    const form = new FormData();
    form.append('image', image);
    return this.http
      .post<Envelope<MerchantMenuDraft>>(
        `${this.base}/merchant/stores/${storeId}/ai/ocr-menu`,
        form,
      )
      .pipe(this.unwrap<MerchantMenuDraft>());
  }

  generateMerchantProductImage(
    storeId: number,
    productName: string,
    categoryName?: string,
  ): Observable<unknown> {
    return this.http
      .post<Envelope<unknown>>(
        `${this.base}/merchant/stores/${storeId}/ai/generate-product-image`,
        { product_name: productName, category_name: categoryName ?? null },
      )
      .pipe(this.unwrap<unknown>());
  }

  // ---- Admin dashboard endpoints (role: admin) ----

  getAdminStores(): Observable<any[]> {
    return this.http.get<Envelope<any[]>>(`${this.base}/admin/stores`).pipe(this.unwrap<any[]>());
  }

  createAdminStore(payload: {
    name: string;
    type: 'restaurant' | 'grocery';
    owner_email: string;
    branch_name: string;
    branch_address: string;
    branch_phone: string;
    area_name: string;
    logo: string;
  }): Observable<any> {
    return this.http
      .post<Envelope<any>>(`${this.base}/admin/stores`, payload)
      .pipe(this.unwrap<any>());
  }

  toggleAdminStoreStatus(storeId: number, isActive: boolean, reason: string): Observable<any> {
    return this.http
      .patch<Envelope<any>>(`${this.base}/admin/stores/${storeId}/status`, {
        is_active: isActive,
        reason,
      })
      .pipe(this.unwrap<any>());
  }

  getAdminOrders(status?: string): Observable<any> {
    const qs = status ? `?status=${encodeURIComponent(status)}` : '';
    return this.http.get<Envelope<any>>(`${this.base}/admin/orders${qs}`).pipe(this.unwrap<any>());
  }

  overrideAdminOrderStatus(orderId: number, status: string, reason: string): Observable<any> {
    return this.http
      .patch<Envelope<any>>(`${this.base}/admin/orders/${orderId}/status`, { status, reason })
      .pipe(this.unwrap<any>());
  }

  getAdminCustomers(status?: string, search?: string): Observable<any[]> {
    const params: string[] = [];
    if (status) params.push(`status=${encodeURIComponent(status)}`);
    if (search) params.push(`search=${encodeURIComponent(search)}`);
    const qs = params.length ? `?${params.join('&')}` : '';
    return this.http
      .get<Envelope<any[]>>(`${this.base}/admin/customers${qs}`)
      .pipe(this.unwrap<any[]>());
  }

  toggleAdminCustomerStatus(userId: number, status: string, reason: string): Observable<any> {
    return this.http
      .patch<Envelope<any>>(`${this.base}/admin/customers/${userId}/status`, { status, reason })
      .pipe(this.unwrap<any>());
  }

  getAdminBranchManagers(): Observable<any[]> {
    return this.http
      .get<Envelope<any[]>>(`${this.base}/admin/branch-managers`)
      .pipe(this.unwrap<any[]>());
  }

  createAdminBranchManager(payload: {
    name: string;
    email: string;
    phone?: string;
    branch_id: number;
  }): Observable<any> {
    return this.http
      .post<Envelope<any>>(`${this.base}/admin/branch-managers`, payload)
      .pipe(this.unwrap<any>());
  }

  toggleAdminBranchManagerStatus(userId: number, status: string, reason: string): Observable<any> {
    return this.http
      .patch<Envelope<any>>(`${this.base}/admin/branch-managers/${userId}/status`, {
        status,
        reason,
      })
      .pipe(this.unwrap<any>());
  }

  getAdminSettings(): Observable<any> {
    return this.http.get<Envelope<any>>(`${this.base}/admin/settings`).pipe(this.unwrap<any>());
  }

  saveAdminSettings(payload: Record<string, unknown>): Observable<any> {
    return this.http
      .put<Envelope<any>>(`${this.base}/admin/settings`, payload)
      .pipe(this.unwrap<any>());
  }

  getAdminAnalytics(period: string): Observable<any> {
    return this.http
      .get<Envelope<any>>(`${this.base}/admin/analytics?period=${encodeURIComponent(period)}`)
      .pipe(this.unwrap<any>());
  }

  getAdminAiSettings(): Observable<any> {
    return this.http.get<Envelope<any>>(`${this.base}/admin/ai/settings`).pipe(this.unwrap<any>());
  }

  saveAdminAiSettings(fnType: string, payload: Record<string, unknown>): Observable<any> {
    return this.http
      .put<Envelope<any>>(`${this.base}/admin/ai/settings/${fnType}`, payload)
      .pipe(this.unwrap<any>());
  }

  testAdminAiConnection(fnType: string): Observable<any> {
    return this.http
      .post<Envelope<any>>(`${this.base}/admin/ai/test-connection`, { function_type: fnType })
      .pipe(this.unwrap<any>());
  }

  toggleAdminAiKillSwitch(enable: boolean): Observable<any> {
    return this.http
      .patch<Envelope<any>>(`${this.base}/admin/ai/kill-switch`, { enabled: enable })
      .pipe(this.unwrap<any>());
  }

  getAdminAiUsageLogs(): Observable<any> {
    return this.http
      .get<Envelope<any>>(`${this.base}/admin/ai/usage-logs`)
      .pipe(this.unwrap<any>());
  }

  getAdminAiStoresQuota(): Observable<any> {
    return this.http.get<Envelope<any>>(`${this.base}/admin/ai/stores`).pipe(this.unwrap<any>());
  }

  toggleAdminStoreFreeze(storeId: number, freeze: boolean, reason: string): Observable<any> {
    return this.http
      .patch<Envelope<any>>(`${this.base}/admin/ai/stores/${storeId}/freeze`, { freeze, reason })
      .pipe(this.unwrap<any>());
  }

  analyzeAdminPlatform(payload: Record<string, unknown>): Observable<any> {
    return this.http
      .post<Envelope<any>>(`${this.base}/admin/ai/analyze-platform`, payload)
      .pipe(this.unwrap<any>());
  }

  approveMerchantProductImage(storeId: number, imageId: number): Observable<unknown> {
    return this.http
      .post<Envelope<unknown>>(
        `${this.base}/merchant/stores/${storeId}/ai/images/${imageId}/approve`,
        {},
      )
      .pipe(this.unwrap<unknown>());
  }

  importMerchantMenuDraft(storeId: number, draftId: number): Observable<unknown> {
    return this.http
      .post<Envelope<unknown>>(
        `${this.base}/merchant/stores/${storeId}/ai/menu-drafts/${draftId}/import`,
        {},
      )
      .pipe(this.unwrap<unknown>());
  }
}

export interface BranchDashboardData {
  branch: {
    id: number;
    name: string;
    address: string | null;
    phone: string | null;
    is_active: boolean;
    is_accepting_orders: boolean;
    working_hours: { from?: string; to?: string; open?: string; close?: string } | null;
    store_name: string;
    store_type: string;
  };
  stats: { new_orders: number; in_progress_orders: number; delivered_orders: number };
  play_audio_alert: boolean;
}

export interface BranchOrdersData {
  branch_id: number;
  branch_name: string;
  orders: ApiOrder[];
  new_orders_count: number;
  play_audio_alert: boolean;
}

export interface BranchStatusData {
  id: number;
  is_accepting_orders: boolean;
  working_hours: unknown;
}

// ---- Merchant (store owner) dashboard types ----

export interface MerchantStore {
  id: number;
  name: string;
  type: string;
  is_active: boolean;
  is_accepting_orders: boolean;
  working_hours: { from?: string; to?: string } | null;
  branches?: MerchantBranch[];
}

export interface MerchantBranch {
  id: number;
  store_id?: number;
  name: string;
  address: string | null;
  phone: string | null;
  is_active: boolean;
  is_accepting_orders: boolean;
  working_hours: { from?: string; to?: string } | null;
  new_orders_count?: number;
}

export interface MerchantZoneFee {
  zone_id: number;
  zone_name: string;
  delivery_fee: string;
  is_served: boolean;
}

export interface MerchantZonesData {
  branch_id: number;
  branch_name: string;
  pricing_policy: string;
  zones: MerchantZoneFee[];
}

export interface MerchantProduct {
  id: number;
  store_id?: number;
  category_id?: number | null;
  name: string;
  price: string;
  description: string | null;
  image_url?: string | null;
  is_available: boolean;
  category?: { id: number; name: string } | null;
}

export interface MerchantOrdersData {
  orders: ApiOrder[];
  new_orders_count: number;
  branches_overview: MerchantBranch[];
  play_audio_alert: boolean;
}

export interface MerchantMenuDraft {
  id: number;
  title?: string;
  status: string;
  created_at?: string;
  items: Array<{
    id: number;
    name: string;
    category_name: string | null;
    price: string | number | null;
    is_ambiguous?: boolean;
    is_accepted?: boolean;
    status?: string;
  }>;
}

/** Maps Laravel's error envelope (and network failures) to a display-safe shape. */
export function toApiError(err: unknown): ApiError {
  if (err instanceof TimeoutError) {
    return {
      kind: 'network',
      status: 0,
      message: 'السيرفر خد وقت طويل ومجاوبش. تأكد من النت وحاول تاني',
    };
  }
  if (err instanceof HttpErrorResponse) {
    const body = err.error as { error?: { code?: string; message?: string } } | string | null;
    // The API answered with a non-JSON body (a static SPA fallback page or a
    // proxy error page): the service is not reachable as an API, whatever the
    // status code says. This is a server-side problem, not the user's network.
    const isNonJsonBody = typeof body === 'string' && /^\s*</.test(body);
    if (
      err.status === 200 ||
      (err.status === 0 && !(err.error instanceof ProgressEvent)) ||
      isNonJsonBody
    ) {
      return {
        kind: 'network',
        status: err.status,
        message: 'خدمة الطلبات مش متاحة دلوقتي من عندنا. جرّب تاني بعد شوية',
      };
    }
    if (err.status === 0) {
      return {
        kind: 'network',
        status: 0,
        message: 'مفيش اتصال بالخدمة. تأكد من النت عندك وحاول تاني',
      };
    }
    const message =
      (body as { error?: { message?: string } } | null)?.error?.message ||
      'حصل خطأ غير متوقع. حاول تاني';
    if (err.status === 401 || err.status === 403) {
      return { kind: 'auth', status: err.status, message };
    }
    if (err.status === 404) {
      return { kind: 'not-found', status: 404, message };
    }
    if (err.status === 422) {
      return { kind: 'validation', status: 422, message };
    }
    return { kind: 'server', status: err.status, message };
  }
  return { kind: 'server', status: 500, message: 'حصل خطأ غير متوقع. حاول تاني' };
}
