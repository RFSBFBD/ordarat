import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="empty-container">
      <div class="empty-icon">{{ icon }}</div>
      <h3 class="empty-title">{{ title }}</h3>
      <p *ngIf="subtitle" class="empty-subtitle">{{ subtitle }}</p>
      <button *ngIf="actionLabel" class="btn btn-primary" (click)="action.emit()">
        {{ actionLabel }}
      </button>
    </div>
  `,
  styles: [
    `
      .empty-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 3.5rem 1.5rem;
        background: #ffffff;
        border-radius: 14px;
        border: 1px dashed var(--color-border);
        width: 100%;
      }
      .empty-icon {
        font-size: 3rem;
        margin-bottom: 0.75rem;
      }
      .empty-title {
        font-family: var(--font-heading);
        color: var(--color-text);
        font-size: 1.25rem;
        margin: 0 0 0.5rem 0;
      }
      .empty-subtitle {
        color: var(--color-text-muted);
        font-size: 0.95rem;
        margin: 0 0 1.25rem 0;
        max-width: 380px;
      }
      .btn {
        padding: 0.6rem 1.35rem;
        border-radius: 8px;
        border: none;
        cursor: pointer;
        font-weight: 600;
      }
      .btn-primary {
        background-color: var(--color-primary);
        color: #ffffff;
      }
    `,
  ],
})
export class EmptyStateComponent {
  @Input() icon = '📦';
  @Input() title = 'مفيش بيانات متاحة دلوقتي';
  @Input() subtitle = '';
  @Input() actionLabel = '';
  @Output() action = new EventEmitter<void>();
}
