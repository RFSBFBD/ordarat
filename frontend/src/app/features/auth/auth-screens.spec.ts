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
  it('has no preselected type, a Qena markaz list, phone, logo and branches question', () => {
    const auth = fakeAuth();
    auth.firebaseUser.set({ emailVerified: true });
    auth.profile.set({ role: 'customer', profile_completed: false });
    const f = setup(BusinessOnboardingComponent, auth);
    const c = f.componentInstance as BusinessOnboardingComponent;
    const el = f.nativeElement as HTMLElement;
    expect(c.type).toBe('');
    expect(c.markazList.length).toBe(9);
    expect(el.querySelector('select')).toBeTruthy();
    expect(el.querySelector('input[type="file"]')).toBeTruthy();
    expect(el.querySelector('input[type="tel"]')).toBeTruthy();
    expect(el.textContent).toContain('أيوه عندي فروع');
  });
});
