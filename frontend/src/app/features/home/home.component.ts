import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AR_TRANSLATIONS } from '../../core/constants/translations';
import { IconComponent } from '../../shared/components/icon/icon.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <section class="welcome-section">
      <div class="welcome-card">
        <h2 class="welcome-heading">{{ t.brand.name }} - قنا</h2>
        <p class="welcome-sub">{{ t.brand.tagline }}</p>

        <div class="cards-grid">
          <div class="action-card client-card" (click)="goToCustomer()">
            <div class="card-icon"><app-icon name="bike" [size]="40"></app-icon></div>
            <h3 class="card-title">{{ t.customer.startScreen.clientCardTitle }}</h3>
            <p class="card-desc">{{ t.customer.startScreen.clientCardDesc }}</p>
            <button class="btn btn-primary">{{ t.customer.startScreen.clientBtn }}</button>
          </div>

          <div class="action-card merchant-card" (click)="goToMerchantInfo()">
            <div class="card-icon"><app-icon name="store" [size]="40"></app-icon></div>
            <h3 class="card-title">{{ t.customer.startScreen.merchantCardTitle }}</h3>
            <p class="card-desc">{{ t.customer.startScreen.merchantCardDesc }}</p>
            <button class="btn btn-accent">{{ t.customer.startScreen.merchantBtn }}</button>
          </div>
        </div>

        <div class="guest-link-wrapper">
          <button class="link-btn" (click)="goToCustomer()">
            {{ t.customer.startScreen.guestLink }}
          </button>
        </div>
      </div>
    </section>
  `,
  styles: [
    `
      .welcome-section {
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 1.5rem 0;
      }
      .welcome-card {
        background: #ffffff;
        border-radius: 16px;
        padding: 2.5rem 2rem;
        max-width: 720px;
        width: 100%;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
        border: 1px solid var(--color-border);
        text-align: center;
      }
      .welcome-heading {
        font-family: var(--font-heading);
        color: var(--color-primary);
        font-size: 2rem;
        margin: 0 0 0.5rem 0;
      }
      .welcome-sub {
        color: var(--color-text-muted);
        font-size: 1.05rem;
        margin-bottom: 2rem;
      }
      .cards-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        gap: 1.5rem;
        margin-bottom: 2rem;
      }
      .action-card {
        padding: 1.75rem 1.25rem;
        border-radius: 12px;
        border: 2px solid var(--color-border);
        cursor: pointer;
        transition:
          transform 0.2s,
          box-shadow 0.2s;
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      .action-card:hover {
        transform: translateY(-3px);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
      }
      .client-card {
        border-color: rgba(14, 90, 107, 0.3);
      }
      .merchant-card {
        border-color: rgba(245, 179, 53, 0.4);
      }
      .card-icon {
        color: var(--color-primary);
        margin-bottom: 0.75rem;
      }
      .card-title {
        font-family: var(--font-heading);
        margin: 0 0 0.5rem 0;
        font-size: 1.35rem;
        color: var(--color-text);
      }
      .card-desc {
        font-size: 0.9rem;
        color: var(--color-text-muted);
        margin-bottom: 1.25rem;
        line-height: 1.4;
      }
      .btn {
        padding: 0.65rem 1.25rem;
        border-radius: 8px;
        font-weight: 600;
        border: none;
        cursor: pointer;
      }
      .btn-primary {
        background-color: var(--color-primary);
        color: #ffffff;
      }
      .btn-accent {
        background-color: var(--color-accent);
        color: #1e2a2f;
      }
      .link-btn {
        background: none;
        border: none;
        color: var(--color-primary);
        text-decoration: underline;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
      }
      @media (max-width: 480px) {
        .welcome-card {
          padding: 1.5rem 1rem;
        }
        .welcome-heading {
          font-size: 1.5rem;
        }
        .cards-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class HomeComponent {
  private readonly router = inject(Router);
  protected readonly t = AR_TRANSLATIONS;

  goToCustomer() {
    this.router.navigate(['/customer/stores']);
  }

  goToMerchantInfo() {
    this.router.navigate(['/auth/merchant-info']);
  }
}
