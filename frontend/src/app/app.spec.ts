import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach } from 'vitest';
import { App } from './app';
import { AuthService } from './core/services/auth.service';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render brand name', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.brand-title')?.textContent).toContain('أوردرات');
  });

  it('should render slogan', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.brand-slogan')?.textContent).toContain('طلبات قنا لحد بابك');
  });

  it('shows the server-unavailable banner only when the profile call failed', async () => {
    const fixture = TestBed.createComponent(App);
    const auth = TestBed.inject(AuthService);
    auth.firebaseUser.set({ uid: 'u1', emailVerified: false } as never);
    auth.profileError.set('EMAIL_NOT_VERIFIED');
    fixture.detectChanges();
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.profile-warning')).toBeNull();

    auth.profileError.set('profile-unavailable');
    fixture.detectChanges();
    await fixture.whenStable();
    const banner = el.querySelector('.profile-warning');
    expect(banner?.textContent).toContain('السيرفر مش بيرد');
    expect(banner?.textContent).not.toContain('بجوجل');
  });
});
