import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type { FirebaseApp } from 'firebase/app';
import type { Auth, User as FirebaseUser } from 'firebase/auth';
import { environment } from '../../../environments/environment';

export type UserRole = 'customer' | 'merchant' | 'branch_manager' | 'admin';
export type OnboardingState = 'new' | 'customer' | 'merchant_applied' | 'merchant_approved' | 'merchant_rejected';

export interface OrdaratUser {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  status: string;
  profile_complete?: boolean;
  onboarding_state?: OnboardingState;
  merchant_application_status?: 'pending' | 'approved' | 'rejected' | null;
}

interface MeResponse {
  success: boolean;
  data: OrdaratUser;
}

/**
 * ONE Google sign-in for everyone. The browser never picks a role: the API
 * assigns it from the database (admin list, approved merchant application,
 * or branch-manager record linked by the verified Google email).
 * Firebase is imported lazily so the main bundle stays light.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  private firebaseApp: FirebaseApp | null = null;
  private firebaseAuth: Auth | null = null;
  private readyResolve!: () => void;
  private readonly readyPromise: Promise<void>;

  /** True when real Firebase web config values were provided. */
  readonly isConfigured: boolean;

  /** Firebase user once the popup sign-in succeeds (or a session is restored). */
  readonly firebaseUser = signal<FirebaseUser | null>(null);

  /** Server-side profile including the authoritative role. */
  readonly profile = signal<OrdaratUser | null>(null);

  /** True once the initial auth state has been resolved (for route guards). */
  readonly authReady = signal(false);

  /** True while a sign-in popup / profile refresh is in flight. */
  readonly busy = signal(false);

  /** True when signed in but the API could not confirm the profile yet. */
  readonly profileError = signal<string | null>(null);

  readonly isLoggedIn = computed(() => this.firebaseUser() !== null);
  readonly role = computed<UserRole | null>(() => this.profile()?.role ?? null);

  constructor() {
    this.isConfigured = this.hasRealFirebaseConfig();
    this.readyPromise = new Promise<void>((resolve) => {
      this.readyResolve = resolve;
    });

    // Restore cached profile while the fresh one loads
    const savedUser = typeof window !== 'undefined' ? localStorage.getItem('ordarat.auth_user') : null;
    if (savedUser) {
      try {
        this.profile.set(JSON.parse(savedUser));
      } catch {}
    }

    if (environment.authStub === true) {
      // E2E build only: fake a signed-in session from localStorage so
      // dashboard screens can be verified visually without real Firebase.
      this.isConfigured = false;
      this.initE2EStub();
    } else if (this.isConfigured) {
      void this.initFirebase();
    } else {
      this.authReady.set(true);
      this.readyResolve();
    }
  }

  private initE2EStub(): void {
    const stored = localStorage.getItem('e2e.stubRole');
    const role: UserRole = ['customer', 'merchant', 'branch_manager', 'admin'].includes(
      stored ?? '',
    )
      ? (stored as UserRole)
      : 'customer';
    const storedState = localStorage.getItem('e2e.stubOnboarding');
    const onboardingState: OnboardingState = [
      'new',
      'customer',
      'merchant_applied',
      'merchant_approved',
      'merchant_rejected',
    ].includes(storedState ?? '')
      ? (storedState as OnboardingState)
      : 'customer';
    const storedMerchantStatus = localStorage.getItem('e2e.stubMerchantStatus');
    const merchantStatus = ['pending', 'approved', 'rejected'].includes(storedMerchantStatus ?? '')
      ? (storedMerchantStatus as 'pending' | 'approved' | 'rejected')
      : null;
    this.firebaseUser.set({ uid: 'e2e-stub' } as unknown as FirebaseUser);
    this.profile.set({
      id: 0,
      name: 'حساب تجريبي (بيانات اختبار)',
      email: 'e2e-stub@ordarat-qena.local',
      phone: null,
      role,
      status: 'active',
      profile_complete: onboardingState !== 'new',
      onboarding_state: onboardingState,
      merchant_application_status: merchantStatus,
    });
    this.authReady.set(true);
    this.readyResolve();
  }

  /** Resolves when the initial Firebase auth state is known. */
  whenReady(): Promise<void> {
    return this.readyPromise;
  }

  private hasRealFirebaseConfig(): boolean {
    const { apiKey, appId, projectId } = environment.firebase;
    const isPlaceholder = (v: string) => !v || v.includes('PLACEHOLDER');
    return !isPlaceholder(apiKey) && !isPlaceholder(appId) && !!projectId;
  }

  private async initFirebase(): Promise<void> {
    const [{ initializeApp }, { getAuth, onIdTokenChanged }] = await Promise.all([
      import('firebase/app'),
      import('firebase/auth'),
    ]);
    this.firebaseApp = initializeApp(environment.firebase);
    this.firebaseAuth = getAuth(this.firebaseApp);

    onIdTokenChanged(this.firebaseAuth, async (user) => {
      this.firebaseUser.set(user);
      if (user) {
        await this.refreshProfile();
      } else {
        this.profile.set(null);
      }
      if (!this.authReady()) {
        this.authReady.set(true);
        this.readyResolve();
      }
    });
  }

  /** Current Firebase ID token for API calls (refreshed by Firebase when needed). */
  async getIdToken(): Promise<string | null> {
    const user = this.firebaseUser();
    if (!user) {
      return null;
    }
    try {
      return await user.getIdToken();
    } catch {
      return null;
    }
  }

  /** Google popup sign-in, then loads the server-side profile. */
  async signInWithGoogle(): Promise<{ ok: boolean; error?: string }> {
    if (!this.isConfigured || !this.firebaseAuth) {
      return { ok: false, error: 'firebase-not-configured' };
    }

    this.busy.set(true);
    try {
      const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(this.firebaseAuth, provider);
      await this.refreshProfile();
      return { ok: true };
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        return { ok: false, error: 'cancelled' };
      }
      return { ok: false, error: code || 'unknown' };
    } finally {
      this.busy.set(false);
    }
  }

  /** Fetches the authoritative profile (role) from the API. */
  async refreshProfile(): Promise<void> {
    const token = await this.getIdToken();
    if (!token) {
      return;
    }
    try {
      const res = await firstValueFrom(
        this.http.get<MeResponse>(`${environment.apiUrl}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      );
      this.profile.set(res.data);
      if (typeof window !== 'undefined') {
        localStorage.setItem('ordarat.auth_user', JSON.stringify(res.data));
      }
      this.profileError.set(null);
    } catch {
      this.profile.set(null);
      this.profileError.set('profile-unavailable');
    }
  }

  /**
   * Where a signed-in user belongs. All decisions come from the
   * server-confirmed profile, never from anything the browser claims.
   */
  postLoginTarget(returnUrl?: string | null): string {
    const profile = this.profile();
    const safeReturn =
      returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//') ? returnUrl : null;

    if (!profile) {
      return safeReturn ?? '/';
    }

    switch (profile.role) {
      case 'admin':
        return '/admin/dashboard';
      case 'merchant':
        return '/store/dashboard';
      case 'branch_manager':
        return '/branch/dashboard';
    }

    if (profile.merchant_application_status === 'pending') {
      return '/auth/pending';
    }

    if (profile.onboarding_state === 'new' || profile.onboarding_state === 'merchant_rejected') {
      return '/auth/welcome';
    }

    return safeReturn ?? '/';
  }

  async logout(): Promise<void> {
    if (this.firebaseAuth) {
      try {
        const { signOut } = await import('firebase/auth');
        await signOut(this.firebaseAuth);
      } catch {}
    }
    this.firebaseUser.set(null);
    this.profile.set(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ordarat.auth_user');
    }
  }
}
