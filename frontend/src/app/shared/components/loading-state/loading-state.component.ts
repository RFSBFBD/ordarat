import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading-state',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="loading-container" [class.compact]="compact">
      <div class="spinner"></div>
      <p class="loading-text">{{ message }}</p>
    </div>
  `,
  styles: [
    `
      .loading-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 3rem 1.5rem;
        width: 100%;
      }
      .loading-container.compact {
        padding: 1rem;
      }
      .spinner {
        width: 44px;
        height: 44px;
        border: 4px solid rgba(14, 90, 107, 0.15);
        border-radius: 50%;
        border-top-color: var(--color-primary);
        animation: spin 0.8s linear infinite;
        margin-bottom: 0.85rem;
      }
      .loading-text {
        color: var(--color-text-muted);
        font-size: 1rem;
        font-weight: 500;
        margin: 0;
      }
      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
    `,
  ],
})
export class LoadingStateComponent {
  @Input() message = 'ثواني...';
  @Input() compact = false;
}
