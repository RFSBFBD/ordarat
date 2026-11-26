import { signal, computed } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService, authErrorMessage } from '../../core/services/auth.service';
import { profileGateGuard } from '../../core/guards/auth.guard';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { BusinessOnboardingComponent } from './business-onboarding/business-onboarding.component';
import { ForgotPasswordComponent } from './forgot-password/forgot-password.component';

function fakeAuth(over: Record<string, unknown> = {}) {
  const profile = signal<any>(null);
  const firebaseUser = signal<any>(null);
  return {
    isConfigured: true,
    busy: signal(false),
    profile,
    firebaseUser,
    isLoggedIn: computed(() => firebaseUser() !== null),
    needsEmailVerification: computed(() => !!firebaseUser() && firebaseUser().emailVerified === false),
    whenReady: () => Promise.resolve(),
    postLoginTarget: vi.fn(() => '/'),
    signupIntent: vi.fn(() => null),
    setSignupIntent: vi.fn(),
    signInWithEmail: vi.fn(async () => ({ ok: true })),
    signInWithGoogle: vi.fn(async () => ({ ok: true })),
    registerWithEmail: vi.fn(async () => ({ ok: true })),
    sendPasswordReset: vi.fn(async () => ({ ok: true })),
    ...over,
  };
}

function setup(component: any, auth: any) {
  TestBed.configureTestingModule({
    imports: [component],
    providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
  });
  const fixture = TestBed.createComponent(component);
  fixture.detectChanges();
  return fixture;
}

describe('authErrorMessage', () => {
  it('maps known codes to Arabic and never leaks raw codes', () => {
    expect(authErrorMessage('auth/invalid-credential')).toContain('الباسورد');
    expect(authErrorMessage('auth/operation-not-allowed')).toContain('Firebase');
    expect(authErrorMessage('auth/something-new')).not.toContain('auth/');
    expect(authErrorMessage('EMAIL_NOT_VERIFIED')).toContain('وثّق');
  });
});

describe('LoginComponent', () => {
  it('offers email, password, Google, forgot-password and register', () => {
    const el = setup(LoginComponent, fakeAuth()).nativeElement as HTMLElement;
    expect(el.querySelector('input[type=email]')).toBeTruthy();
    expect(el.querySelector('input[type=password]')).toBeTruthy();
    expect(el.textContent).toContain('جوجل');
    expect(el.querySelector('a[href="/auth/forgot-password"]')).toBeTruthy();
    expect(el.querySelector('a[href^="/auth/register"]')).toBeTruthy();
  });

  it('does not call Firebase with an invalid email or empty password', async () => {
    const auth = fakeAuth();
    const c = setup(LoginComponent, auth).componentInstance as LoginComponent;
    c.email = 'not-an-email';
    c.password = '';
    await c.signIn();
    expect(auth.signInWithEmail).not.toHaveBeenCalled();
  });

  it('shows a clear Arabic message for a wrong password', async () => {
    const auth = fakeAuth({ signInWithEmail: vi.fn(async () => ({ ok: false, error: 'auth/invalid-credential' })) });
    const c = setup(LoginComponent, auth).componentInstance as LoginComponent;
    c.email = 'a@b.com';
    c.password = 'x';
    await c.signIn();
    expect(c.errorMessage).toContain('الإيميل أو الباسورد');
  });

  it('sends unverified emails to the verification screen', async () => {
    const auth = fakeAuth({ signInWithEmail: vi.fn(async () => ({ ok: false, error: 'EMAIL_NOT_VERIFIED' })) });
    const fixture = setup(LoginComponent, auth);
    const nav = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const c = fixture.componentInstance as LoginComponent;
    c.email = 'a@b.com';
    c.password = 'x';
    await c.signIn();
    expect(nav).toHaveBeenCalledWith(['/auth/verify-email']);
  });
});

describe('RegisterComponent', () => {
  it('has the five fields, Google register and a link back to login', () => {
    const el = setup(RegisterComponent, fakeAuth()).nativeElement as HTMLElement;
    expect(el.querySelectorAll('input').length).toBe(5);
    expect(el.textContent).toContain('سجّل بحساب جوجل');
    expect(el.querySelector('a[href="/auth/login"]')).toBeTruthy();
  });

  it('blocks submit for short or mismatched passwords', async () => {
    const auth = fakeAuth();
    const c = setup(RegisterComponent, auth).componentInstance as RegisterComponent;
    Object.assign(c, { firstName: 'أحمد', lastName: 'علي', email: 'a@b.com', password: 'short', confirm: 'short' });
    await c.register();
    Object.assign(c, { password: 'longenough1', confirm: 'different11' });
    await c.register();
    expect(auth.registerWithEmail).not.toHaveBeenCalled();
  });

  it('registers with valid data and moves to email verification', async () => {
    const auth = fakeAuth();
    const fixture = setup(RegisterComponent, auth);
    const nav = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const c = fixture.componentInstance as RegisterComponent;
    Object.assign(c, { firstName: 'أحمد', lastName: 'علي', email: 'a@b.com', password: 'longenough1', confirm: 'longenough1' });
    await c.register();
    expect(auth.registerWithEmail).toHaveBeenCalledWith('أحمد', 'علي', 'a@b.com', 'longenough1');
    expect(nav).toHaveBeenCalledWith(['/auth/verify-email']);
  });
});

describe('ForgotPasswordComponent', () => {
  it('shows the same confirmation without revealing whether the email exists', async () => {
    const auth = fakeAuth();
    const fixture = setup(ForgotPasswordComponent, auth);
    const c = fixture.componentInstance as ForgotPasswordComponent;
    c.email = 'someone@example.com';
    await c.send();
    fixture.detectChanges();
    expect(auth.sendPasswordReset).toHaveBeenCalledWith('someone@example.com');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('لو الإيميل ده مسجل');
  });

  it('rejects an invalid email locally', async () => {
    const auth = fakeAuth();
    const c = setup(ForgotPasswordComponent, auth).componentInstance as ForgotPasswordComponent;
    c.email = 'nope';
    await c.send();
    expect(auth.sendPasswordReset).not.toHaveBeenCalled();
    expect(c.sent).toBe(false);
  });
});

describe('profileGateGuard', () => {
  beforeEach(() => TestBed.resetTestingModule());

  function run(auth: any) {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    });
    return TestBed.runInInjectionContext(() => profileGateGuard({} as any, {} as any)) as Promise<any>;
  }

  it('lets guests through', async () => {
    expect(await run(fakeAuth())).toBe(true);
  });

  it('sends a customer with an incomplete profile to the mandatory form', async () => {
    const auth = fakeAuth();
    auth.firebaseUser.set({ emailVerified: true });
    auth.profile.set({ role: 'customer', profile_complete: false });
    const r = await run(auth);
    expect(r.toString()).toBe('/auth/welcome');
  });

  it('sends unverified password accounts to verification', async () => {
    const auth = fakeAuth();
    auth.firebaseUser.set({ emailVerified: false });
    const r = await run(auth);
    expect(r.toString()).toBe('/auth/verify-email');
  });

  it('lets completed customers, staff and pending applicants through', async () => {
    for (const p of [
      { role: 'customer', profile_complete: true },
      { role: 'admin', profile_complete: false },
      { role: 'customer', profile_complete: false, merchant_application_status: 'pending' },
    ]) {
      const auth = fakeAuth();
      auth.firebaseUser.set({ emailVerified: true });
      auth.profile.set(p);
      TestBed.resetTestingModule();
      expect(await run(auth)).toBe(true);
    }
  });
});

describe('BusinessOnboardingComponent', () => {
  function build() {
    const auth = fakeAuth();
    auth.firebaseUser.set({ emailVerified: true });
    auth.profile.set({ role: 'customer', profile_completed: false });
    const f = setup(BusinessOnboardingComponent, auth);
    return { f, c: f.componentInstance as BusinessOnboardingComponent, el: f.nativeElement as HTMLElement };
  }

  it('has no preselected type, a clear phone prompt, logo upload, area and branches question', () => {
    const { c, el } = build();
    expect(c.type).toBe('');
    expect(c.hasBranches).toBeNull();
    expect(el.querySelector('input[type="file"]')).toBeTruthy();
    expect(el.querySelector('input[type="tel"]')).toBeTruthy();
    expect(el.textContent).toContain('رقم تليفون النشاط');
    expect(el.textContent).toContain('مطلوب. رقم مصري');
    expect(el.textContent).toContain('المنطقة جوه مدينة قنا');
    expect(el.textContent).toContain('أيوه عندي فروع');
  });

  it('asks for opening hours, an optional commercial register, and says the phone is admin-only', () => {
    const { c, el } = build();
    expect(el.querySelectorAll('input[type="time"]').length).toBe(2);
    expect(el.textContent).toContain('مواعيد العمل');
    expect(el.textContent).toContain('السجل التجاري (اختياري)');
    expect(el.textContent).toContain('بيظهر للإدارة بس');
    expect(c.opensAt).toBe('');
  });

  it('shows empty required errors on submit and never calls the API', () => {
    const { f, c, el } = build();
    c.submit();
    (c as any).cdr.markForCheck();
    f.detectChanges();
    expect(el.textContent).toContain('اختار إذا كان نشاطك مطعم أو متجر');
    expect(el.textContent).toContain('اختار لو عندك فروع تانية');
    expect(el.textContent).toContain('ارفع لوجو النشاط');
    expect(c.isSaving).toBe(false);
  });

  it('choosing "yes" opens a branch form and each branch needs name, address and location', () => {
    const { f, c, el } = build();
    c.hasBranches = true;
    c.addBranch();
    (c as any).cdr.markForCheck();
    f.detectChanges();
    expect(el.querySelector('input[placeholder="اسم الفرع"]')).toBeTruthy();
    expect(c.isBranchValid(c.branches[0])).toBe(false);
    Object.assign(c.branches[0], { name: 'فرع 2', address: 'الحميدات', hasLocation: true, latitude: 26.1, longitude: 32.7 });
    expect(c.isBranchValid(c.branches[0])).toBe(true);
    c.branches[0].phone = '123';
    expect(c.isBranchValid(c.branches[0])).toBe(false);
    c.removeBranch(0);
    expect(c.branches.length).toBe(0);
  });
});


describe('sign-up type switch', () => {
  beforeEach(() => localStorage.clear());

  it('register shows the switch; picking business stores the intent', () => {
    const auth = fakeAuth();
    const fixture = setup(RegisterComponent, auth);
    const el = fixture.nativeElement as HTMLElement;
    const opts = el.querySelectorAll('.type-opt');
    expect(opts.length).toBe(2);
    expect(opts[0].textContent).toContain('اطلب');
    (opts[1] as HTMLElement).click();
    expect(auth.setSignupIntent).toHaveBeenCalledWith('business');
  });

  it('login also shows the switch', () => {
    const el = setup(LoginComponent, fakeAuth()).nativeElement as HTMLElement;
    expect(el.querySelectorAll('.type-opt').length).toBe(2);
  });

  function target(intent: string | null, profile: any) {
    const fake: any = {
      profile: () => profile,
      needsEmailVerification: () => false,
      signupIntent: () => intent,
    };
    return AuthService.prototype.postLoginTarget.call(fake);
  }
  const fresh = { role: 'customer', profile_complete: false, onboarding_state: 'new' };

  it('a new account goes straight to the form it chose, else to the welcome cards', () => {
    expect(target('business', fresh)).toBe('/auth/onboarding/business');
    expect(target('customer', fresh)).toBe('/auth/onboarding/customer');
    expect(target(null, fresh)).toBe('/auth/welcome');
  });

  it('an intent never overrides role, pending application or a finished profile', () => {
    expect(target('business', { role: 'admin' })).toBe('/admin/dashboard');
    expect(target('business', { role: 'merchant' })).toBe('/store/dashboard');
    expect(target('business', { role: 'customer', merchant_application_status: 'pending' })).toBe('/auth/pending');
    expect(target('business', { role: 'customer', profile_complete: true, onboarding_state: 'customer' })).toBe('/');
  });
});
