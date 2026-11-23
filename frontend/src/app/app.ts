import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { LoadingService } from './core/services/loading.service';
import { IconComponent } from './shared/components/icon/icon.component';
import { LoadingComponent } from './shared/components/loading/loading.component';
import { ErrorStateComponent } from './shared/components/error-state/error-state.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    IconComponent,
    LoadingComponent,
    ErrorStateComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('أوردرات');
  protected readonly auth = inject(AuthService);
  protected readonly loading = inject(LoadingService);
  private readonly router = inject(Router);

  private readonly role = computed(() => this.auth.role());

  readonly showAdminLink = computed(() => this.role() === 'admin');
  readonly showMerchantLink = computed(() => {
    const r = this.role();
    return r === 'merchant' || r === 'admin';
  });
  readonly showBranchLink = computed(() => {
    const r = this.role();
    return r === 'branch_manager' || r === 'admin';
  });

  displayName(): string {
    return this.auth.profile()?.name ?? this.auth.firebaseUser()?.displayName ?? 'حسابي';
  }

  async logout(): Promise<void> {
    await this.auth.logout();
    this.router.navigate(['/']);
  }

  /** Retry confirming the server-side profile after a transient API failure. */
  async retryProfile(): Promise<void> {
    await this.auth.refreshProfile();
  }

  /** Hard reload after a failed route/chunk load. */
  reloadPage(): void {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }
}
