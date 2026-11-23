import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AR_TRANSLATIONS } from '../../../core/constants/translations';
import { IconComponent } from '../../../shared/components/icon/icon.component';

/**
 * First-visit choice for brand-new accounts: what did you come to do?
 * The choice only steers which form opens; privileges come from the API.
 */
@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <section class="welcome-section">
      <div class="welcome-card">
        <div class="welcome-logo-header" style="display: flex; justify-content: center; margin-bottom: 1rem;">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 128 128"
            width="72"
            height="72"
            style="filter: drop-shadow(0 4px 12px rgba(14, 90, 107, 0.2));"
          >
            <rect width="128" height="128" rx="32" fill="#0E5A6B" />
            <path d="M 64 114 L 35.6 70.6 A 34 34 0 1 1 92.4 70.6 Z" fill="#F5B335" />
            <circle cx="64" cy="44" r="3.5" fill="#FFFFFF" />
            <path d="M 50 60 A 14 14 0 0 1 78 60 Z" fill="#FFFFFF" />
            <rect x="47" y="62" width="34" height="4" rx="2" fill="#FFFFFF" />
          </svg>
        </div>
        <h2 class="welcome-heading">{{ t.welcome.title }}</h2>
        <p class="welcome-sub">{{ t.welcome.subtitle }}</p>

        <div class="cards-grid">
          <div class="action-card client-card" (click)="chooseCustomer()">
            <div class="card-icon"><app-icon name="bike" [size]="40"></app-icon></div>
            <h3 class="card-title">{{ t.welcome.hungryTitle }}</h3>
            <p class="card-desc">{{ t.welcome.hungryDesc }}</p>
            <button class="btn btn-primary">{{ t.welcome.hungryBtn }}</button>
          </div>

          <div class="action-card merchant-card" (click)="chooseBusiness()">
            <div class="card-icon"><app-icon name="store" [size]="40"></app-icon></div>
            <h3 class="card-title">{{ t.welcome.ownerTitle }}</h3>
            <p class="card-desc">{{ t.welcome.ownerDesc }}</p>
            <button class="btn btn-accent">{{ t.welcome.ownerBtn }}</button>
          </div>
        </div>

        <p class="choice-note">{{ t.welcome.note }}</p>
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
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 1.5rem;
        margin-bottom: 1.5rem;
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
        font-size: 1.3rem;
        color: var(--color-text);
      }
      .card-desc {
        font-size: 0.92rem;
        color: var(--color-text-muted);
        margin-bottom: 1.25rem;
        line-height: 1.5;
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
      .choice-note {
        font-size: 0.8rem;
        color: var(--color-text-muted);
        margin: 0;
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
export class WelcomeComponent {
  private readonly router = inject(Router);
  protected readonly t = AR_TRANSLATIONS;

  chooseCustomer() {
    this.router.navigate(['/auth/onboarding/customer']);
  }

  chooseBusiness() {
    this.router.navigate(['/auth/onboarding/business']);
  }
}
