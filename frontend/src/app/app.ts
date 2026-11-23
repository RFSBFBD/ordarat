import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { IconComponent } from './shared/components/icon/icon.component';
import { LoadingComponent } from './shared/components/loading/loading.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, IconComponent, LoadingComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('أوردرات');
  protected readonly auth = inject(AuthService);
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
}
