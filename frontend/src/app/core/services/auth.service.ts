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

/** Result of any sign-in / register / reset action. `error` is a Firebase or API code. */
export interface AuthResult {
  ok: boolean;
  error?: string;
}

/** Arabic, user-facing text for a Firebase / API auth error code. */
export function authErrorMessage(code: string | undefined): string {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-login-credentials':
      return 'الإيميل أو الباسورد مش مظبوط. راجعهم وجرّب تاني';
    case 'auth/invalid-email':
      return 'اكتب الإيميل بشكل صحيح، مثال: name@gmail.com';
    case 'auth/email-already-in-use':
      return 'الإيميل ده مسجل عندنا قبل كده. سجّل دخولك أو استرجع الباسورد';
    case 'auth/weak-password':
      return 'الباسورد ضعيف. استخدم ٨ حروف أو أرقام على الأقل';
    case 'auth/too-many-requests':
      return 'محاولات كتير. استنى شوية وجرّب تاني';
    case 'auth/network-request-failed':
      return 'مفيش اتصال بالإنترنت أو الخدمة مش بترد. جرّب تاني';
    case 'auth/user-disabled':
      return 'الحساب ده متوقف. اتواصل معنا';
    case 'auth/popup-blocked':
      return 'المتصفح قفل نافذة جوجل. اسمح بالنوافذ المنبثقة وجرّب تاني';
    case 'auth/unauthorized-domain':
      return 'الدومين ده مش مضاف في إعدادات الدخول (Firebase). لازم الإدارة تضيفه';
    case 'auth/operation-not-allowed':
    case 'auth/configuration-not-found':
    case 'auth/admin-restricted-operation':
      return 'طريقة الدخول دي لسه مش متفعلة من إدارة المنصة (إعدادات Firebase)';
    case 'auth/account-exists-with-different-credential':
    case 'ACCOUNT_LINK_REQUIRED':
      return 'الإيميل ده مسجل بطريقة دخول تانية. ادخل بنفس الطريقة اللي سجلت بيها أول مرة';
    case 'EMAIL_NOT_VERIFIED':
      return 'وثّق إيميلك من الرسالة اللي وصلتلك وبعدها سجّل دخولك';
    case 'firebase-not-configured':
      return 'تسجيل الدخول لسه محتاج تجهيز من إدارة المنصة (إعدادات Firebase)';
    default:
      return 'العملية ما كملتش… جرّب تاني';
  }
}

interface MeResponse {
  success: boolean;
  data: OrdaratUser;
}

/**
 * ONE sign-in system for everyone (Google or email + password). The browser never picks a role: the API
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
  async signInWithGoogle(): Promise<AuthResult> {
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
      return await this.afterSignIn();
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
    } catch (err: unknown) {
      this.profile.set(null);
      const apiCode = (err as { error?: { error?: { code?: string } } })?.error?.error?.code;
      this.profileError.set(
        apiCode === 'EMAIL_NOT_VERIFIED' || apiCode === 'ACCOUNT_LINK_REQUIRED'
          ? apiCode
          : 'profile-unavailable',
      );
    }
  }

  /** True when the signed-in email/password account has not verified its email yet. */
  readonly needsEmailVerification = computed(() => {
    const user = this.firebaseUser();
    return !!user && user.emailVerified === false && environment.authStub !== true;
  });

  private async withBusy(action: () => Promise<AuthResult>): Promise<AuthResult> {
    if (!this.isConfigured || !this.firebaseAuth) {
      return { ok: false, error: 'firebase-not-configured' };
    }
    this.busy.set(true);
    try {
      return await action();
    } catch (err: unknown) {
      return { ok: false, error: (err as { code?: string })?.code || 'unknown' };
    } finally {
      this.busy.set(false);
    }
  }

  /** Email + password sign-in. Unverified emails sign in but are sent to verification. */
  signInWithEmail(email: string, password: string): Promise<AuthResult> {
    return this.withBusy(async () => {
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      await signInWithEmailAndPassword(this.firebaseAuth!, email.trim(), password);
      await this.refreshProfile();
      return this.afterSignIn();
    });
  }

  /**
   * Creates the account, stores the name, and asks Firebase to send the
   * verification email. The account gets no API access until it is verified.
   */
  registerWithEmail(
    firstName: string,
    lastName: string,
    email: string,
    password: string,
  ): Promise<AuthResult> {
    return this.withBusy(async () => {
      const { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } =
        await import('firebase/auth');
      const cred = await createUserWithEmailAndPassword(this.firebaseAuth!, email.trim(), password);
      await updateProfile(cred.user, { displayName: `${firstName.trim()} ${lastName.trim()}`.trim() });
      await sendEmailVerification(cred.user);
      return { ok: true };
    });
  }

  /** Always resolves ok for unknown emails, so the form cannot be used to probe accounts. */
  sendPasswordReset(email: string): Promise<AuthResult> {
    return this.withBusy(async () => {
      const { sendPasswordResetEmail } = await import('firebase/auth');
      try {
        await sendPasswordResetEmail(this.firebaseAuth!, email.trim());
      } catch (err: unknown) {
        const code = (err as { code?: string })?.code;
        if (code !== 'auth/user-not-found') {
          throw err;
        }
      }
      return { ok: true };
    });
  }

  resendVerification(): Promise<AuthResult> {
    return this.withBusy(async () => {
      const { sendEmailVerification } = await import('firebase/auth');
      const user = this.firebaseAuth!.currentUser;
      if (!user) {
        return { ok: false, error: 'auth/user-not-found' };
      }
      await sendEmailVerification(user);
      return { ok: true };
    });
  }

  /** After the user clicked the email link: refresh the token and load the profile. */
  checkEmailVerified(): Promise<AuthResult> {
    return this.withBusy(async () => {
      const user = this.firebaseAuth!.currentUser;
      if (!user) {
        return { ok: false, error: 'auth/user-not-found' };
      }
      await user.reload();
      if (!user.emailVerified) {
        return { ok: false, error: 'EMAIL_NOT_VERIFIED' };
      }
      await user.getIdToken(true);
      this.firebaseUser.set(null);
      this.firebaseUser.set(user);
      await this.refreshProfile();
      return this.afterSignIn();
    });
  }

  /** Common end of every sign-in: refuse half-signed-in states with a clear code. */
  private async afterSignIn(): Promise<AuthResult> {
    const problem = this.profileError();
    if (problem === 'ACCOUNT_LINK_REQUIRED') {
      await this.logout();
      return { ok: false, error: problem };
    }
    if (this.needsEmailVerification() || problem === 'EMAIL_NOT_VERIFIED') {
      return { ok: false, error: 'EMAIL_NOT_VERIFIED' };
    }
    return { ok: true };
  }

  /**
   * Where a signed-in user belongs. All decisions come from the
   * server-confirmed profile, never from anything the browser claims.
   */
  /** What the person said they came to do on the sign-up page (kept across the email-verification step). */
  signupIntent(): 'customer' | 'business' | null {
    if (typeof window === 'undefined') {
      return null;
    }
    const v = localStorage.getItem('ordarat.signup_intent');
    return v === 'customer' || v === 'business' ? v : null;
  }

  setSignupIntent(intent: 'customer' | 'business'): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ordarat.signup_intent', intent);
    }
  }

  postLoginTarget(returnUrl?: string | null): string {
    const profile = this.profile();
    const safeReturn =
      returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//') ? returnUrl : null;

    if (this.needsEmailVerification()) {
      return '/auth/verify-email';
    }

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

    // The first-time form is mandatory for every sign-in method.
    if (
      profile.profile_complete !== true ||
      profile.onboarding_state === 'new' ||
      profile.onboarding_state === 'merchant_rejected'
    ) {
      const intent = this.signupIntent();
      return intent ? `/auth/onboarding/${intent}` : '/auth/welcome';
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
