import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoadingService } from '../../../core/services/loading.service';

@Component({
  selector: 'app-loading',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (loading.isLoading()) {
      <div class="ordarat-loading-overlay" aria-live="polite" aria-busy="true">
        <div class="loading-content">
          <!-- Animated Brand Logo -->
          <div class="logo-wrapper">
            <svg
              class="logo-svg"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 128 128"
              width="96"
              height="96"
            >
              <rect width="128" height="128" rx="32" fill="#0E5A6B" />
              <!-- Golden Pin -->
              <path d="M 64 114 L 35.6 70.6 A 34 34 0 1 1 92.4 70.6 Z" fill="#F5B335" />
              <!-- White Cloche -->
              <circle cx="64" cy="44" r="3.5" fill="#FFFFFF" />
              <path d="M 50 60 A 14 14 0 0 1 78 60 Z" fill="#FFFFFF" />
              <rect x="47" y="62" width="34" height="4" rx="2" fill="#FFFFFF" />
            </svg>
          </div>

          <!-- Brand Typography -->
          <div class="brand-text">
            <h2 class="brand-title">
              <span class="accent-text">أور</span><span class="primary-text">درات</span>
            </h2>
            <p class="brand-slogan">طلبات قنا لحد بابك</p>
          </div>

          <!-- Dynamic Action Message -->
          <p class="loading-message">{{ loading.message() }}</p>

          <!-- Smooth Progress Bar -->
          <div class="progress-track">
            <div class="progress-bar"></div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .ordarat-loading-overlay {
        position: fixed;
        inset: 0;
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: rgba(246, 238, 220, 0.9);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        animation: fadeIn 0.2s ease-out;
      }

      .loading-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        padding: 2rem 2.5rem;
        background: rgba(255, 255, 255, 0.95);
        border: 1px solid rgba(226, 217, 197, 0.8);
        border-radius: 24px;
        box-shadow: 0 12px 36px rgba(14, 90, 107, 0.12);
        max-width: 90vw;
        width: 340px;
        animation: scaleUp 0.25s ease-out;
      }

      .logo-wrapper {
        margin-bottom: 1rem;
        animation: pulseLogo 1.6s ease-in-out infinite;
      }

      .logo-svg {
        filter: drop-shadow(0 6px 16px rgba(14, 90, 107, 0.25));
      }

      .brand-title {
        font-family: var(--font-heading, 'Tajawal', sans-serif);
        font-size: 2.1rem;
        font-weight: 800;
        margin: 0;
        line-height: 1.1;
        letter-spacing: -0.5px;
      }

      .accent-text {
        color: #f5b335;
      }

      .primary-text {
        color: #0e5a6b;
      }

      .brand-slogan {
        font-family: var(--font-body, 'IBM Plex Sans Arabic', sans-serif);
        font-size: 0.95rem;
        color: #5c6e76;
        margin: 0.35rem 0 0.85rem 0;
        font-weight: 500;
      }

      .loading-message {
        font-size: 0.9rem;
        font-weight: 600;
        color: #0e5a6b;
        margin: 0 0 1.25rem 0;
      }

      .progress-track {
        width: 100%;
        height: 6px;
        background-color: #f6eedc;
        border-radius: 999px;
        overflow: hidden;
        position: relative;
      }

      .progress-bar {
        position: absolute;
        top: 0;
        bottom: 0;
        left: 0;
        width: 45%;
        background: linear-gradient(90deg, #0e5a6b, #f5b335);
        border-radius: 999px;
        animation: progressSlide 1.2s ease-in-out infinite alternate;
      }

      @keyframes pulseLogo {
        0%,
        100% {
          transform: scale(1);
          filter: drop-shadow(0 6px 16px rgba(14, 90, 107, 0.25));
        }
        50% {
          transform: scale(1.08);
          filter: drop-shadow(0 10px 24px rgba(245, 179, 53, 0.45));
        }
      }

      @keyframes progressSlide {
        0% {
          left: -10%;
          width: 30%;
        }
        50% {
          width: 55%;
        }
        100% {
          left: 80%;
          width: 30%;
        }
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      @keyframes scaleUp {
        from {
          transform: scale(0.92);
          opacity: 0.8;
        }
        to {
          transform: scale(1);
          opacity: 1;
        }
      }
    `,
  ],
})
export class LoadingComponent {
  readonly loading = inject(LoadingService);
}
