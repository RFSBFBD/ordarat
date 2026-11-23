import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-error-state',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="error-container">
      <div class="error-icon"><app-icon name="triangle-alert" [size]="44"></app-icon></div>
      <h3 class="error-title">{{ title }}</h3>
      <p *ngIf="message" class="error-message">{{ message }}</p>
      <button *ngIf="showRetry" class="btn btn-retry" (click)="retry.emit()">
        {{ retryLabel }}
      </button>
    </div>
  `,
  styles: [
    `
      .error-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 3rem 1.5rem;
        background: #fff9f9;
        border: 1px solid rgba(217, 56, 58, 0.2);
        border-radius: 14px;
        width: 100%;
      }
      .error-icon {
        color: var(--color-danger);
        margin-bottom: 0.75rem;
      }
      .error-title {
        font-family: var(--font-heading);
        color: var(--color-danger);
        font-size: 1.25rem;
        margin: 0 0 0.5rem 0;
      }
      .error-message {
        color: var(--color-text-muted);
        font-size: 0.95rem;
        margin: 0 0 1.25rem 0;
        max-width: 420px;
      }
      .btn-retry {
        background-color: var(--color-danger);
        color: #ffffff;
        padding: 0.6rem 1.35rem;
        border-radius: 8px;
        border: none;
        cursor: pointer;
        font-weight: 600;
      }
    `,
  ],
})
export class ErrorStateComponent {
  @Input() title = 'النت واقف أو الخدمة مش بترد. جرّب تاني';
  @Input() message = '';
  @Input() showRetry = true;
  @Input() retryLabel = 'جرّب تاني';
  @Output() retry = new EventEmitter<void>();
}
