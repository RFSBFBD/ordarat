import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { FirebaseApp, initializeApp } from 'firebase/app';
import {
  Auth,
  GoogleAuthProvider,
  User as FirebaseUser,
  getAuth,
  onIdTokenChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { environment } from '../../../environments/environment';

export type UserRole = 'customer' | 'merchant' | 'branch_manager' | 'admin';

export interface OrdaratUser {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  status: string;
}

interface MeResponse {
  success: boolean;
  data: OrdaratUser;
}

/**
 * Firebase Google authentication for customers, plus the server-side
 * profile (role) resolved from the Laravel API. Roles are NEVER decided
 * in the browser: the API assigns them from the database.
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

  /** Internal credentials token (for merchants, branch managers, and admins). */
  readonly credentialsToken = signal<string | null>(
    typeof window !== 'undefined' ? localStorage.getItem('ordarat.auth_token') : null,
  );

  /** Server-side profile including the authoritative role. */
  readonly profile = signal<OrdaratUser | null>(null);

  /** True once the initial auth state has been resolved (for route guards). */
  readonly authReady = signal(false);

  /** True while a sign-in popup / profile refresh is in flight. */
  readonly busy = signal(false);

  /** True when signed in but the API could not confirm the profile yet. */
  readonly profileError = signal<string | null>(null);

  readonly isLoggedIn = computed(() => this.firebaseUser() !== null || this.credentialsToken() !== null);
  readonly role = computed<UserRole | null>(() => this.profile()?.role ?? null);

  constructor() {
    this.isConfigured = this.hasRealFirebaseConfig();
    this.readyPromise = new Promise<void>((resolve) => {
      this.readyResolve = resolve;
    });

    // Restore cached profile for credentials login if present
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
    } else if (this.credentialsToken()) {
      // Credentials user already logged in (merchant / branch manager / admin)
      this.refreshProfile().finally(() => {
        this.authReady.set(true);
        this.readyResolve();
      });
      if (this.isConfigured) {
        this.initFirebase();
      }
    } else if (this.isConfigured) {
      this.initFirebase();
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
    this.firebaseUser.set({ uid: 'e2e-stub' } as unknown as FirebaseUser);
    this.profile.set({
      id: 0,
      name: 'حساب تجريبي (بيانات اختبار)',
      email: 'e2e-stub@ordarat-qena.local',
      phone: null,
      role,
      status: 'active',
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

  private initFirebase(): void {
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

  /** Current auth token for API calls (credentials token or Firebase ID token). */
  async getIdToken(): Promise<string | null> {
    const credToken = this.credentialsToken();
    if (credToken) {
      return credToken;
    }
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

  /** Email & Password login for merchants (restaurants and groceries), branch managers, and admins. */
  async loginWithCredentials(
    email: string,
    password: string,
  ): Promise<{ ok: boolean; error?: string; user?: OrdaratUser }> {
    this.busy.set(true);
    try {
      const res = await firstValueFrom(
        this.http.post<{ success: boolean; data?: { token: string; user: OrdaratUser }; error?: { message: string } }>(
          `${environment.apiUrl}/auth/login`,
          { email, password },
        ),
      );

      if (res.success && res.data) {
        this.credentialsToken.set(res.data.token);
        this.profile.set(res.data.user);
        this.profileError.set(null);
        if (typeof window !== 'undefined') {
          localStorage.setItem('ordarat.auth_token', res.data.token);
          localStorage.setItem('ordarat.auth_user', JSON.stringify(res.data.user));
        }
        return { ok: true, user: res.data.user };
      }

      return { ok: false, error: res.error?.message || 'فشل تسجيل الدخول' };
    } catch (err: unknown) {
      const errorObj = err as { error?: { error?: { message?: string }; message?: string } };
      const msg = errorObj.error?.error?.message || errorObj.error?.message || 'البريد أو كلمة المرور غير صحيحة';
      return { ok: false, error: msg };
    } finally {
      this.busy.set(false);
    }
  }

  /** Google popup sign-in, then loads the server-side profile (for general public / customers). */
  async signInWithGoogle(): Promise<{ ok: boolean; error?: string }> {
    if (!this.isConfigured || !this.firebaseAuth) {
      return { ok: false, error: 'firebase-not-configured' };
    }

    this.busy.set(true);
    try {
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
      if (this.credentialsToken()) {
        this.credentialsToken.set(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('ordarat.auth_token');
          localStorage.removeItem('ordarat.auth_user');
        }
      }
      this.profile.set(null);
      this.profileError.set('profile-unavailable');
    }
  }

  async logout(): Promise<void> {
    if (this.firebaseAuth) {
      try {
        await signOut(this.firebaseAuth);
      } catch {}
    }
    this.firebaseUser.set(null);
    this.credentialsToken.set(null);
    this.profile.set(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ordarat.auth_token');
      localStorage.removeItem('ordarat.auth_user');
    }
  }
}
