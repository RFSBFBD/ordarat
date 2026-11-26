/**
 * Shared styling for the onboarding and sign-in screens (single source so
 * the forms stay visually consistent and fit small screens).
 */
export const ONBOARDING_STYLES = `
  .onboarding-wrapper {
    display: flex;
    justify-content: center;
    padding: 2rem 1rem;
  }
  .onboarding-card {
    background: #ffffff;
    border-radius: 16px;
    padding: 2rem 1.75rem;
    max-width: 520px;
    width: 100%;
    border: 1px solid var(--color-border);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  }
  .title {
    font-family: var(--font-heading);
    color: var(--color-primary);
    margin: 0 0 0.5rem 0;
    font-size: 1.45rem;
    text-align: center;
  }
  .desc {
    color: var(--color-text-muted);
    font-size: 0.92rem;
    margin-bottom: 1.5rem;
    line-height: 1.6;
    text-align: center;
  }
  .form-group {
    margin-bottom: 1.25rem;
  }
  .label {
    display: block;
    margin-bottom: 0.35rem;
    font-weight: 600;
    color: var(--color-text);
    font-size: 0.95rem;
  }
  .field-hint {
    display: block;
    margin-top: 0.5rem;
    font-size: 0.85rem;
    color: var(--color-text-muted, #6b6b6b);
  }
  .input-field {
    width: 100%;
    padding: 0.75rem 0.95rem;
    border: 1.5px solid var(--color-border);
    border-radius: 8px;
    font-family: var(--font-body);
    font-size: 0.95rem;
    color: var(--color-text);
    outline: none;
    box-sizing: border-box;
    transition: border-color 0.2s;
    background: #fff;
  }
  .input-field:focus {
    border-color: var(--color-primary);
  }
  .error-text {
    color: var(--color-danger);
    font-size: 0.8rem;
    margin-top: 4px;
    display: block;
  }
  .error-box {
    background: #fff5f5;
    color: var(--color-danger);
    padding: 0.75rem;
    border-radius: 6px;
    margin-bottom: 1rem;
    font-size: 0.85rem;
    line-height: 1.5;
  }
  .location-box {
    background: #fdfbf7;
    border: 1px dashed var(--color-border);
    border-radius: 10px;
    padding: 1rem;
    margin-bottom: 1.25rem;
    text-align: center;
  }
  .loc-status {
    font-size: 0.9rem;
    color: var(--color-text-muted);
    margin-bottom: 0.75rem;
  }
  .loc-status.success {
    color: var(--color-success);
    font-weight: 600;
  }
  .loc-line {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
  }
  .location-error-box {
    margin-top: 0.75rem;
    padding: 0.75rem;
    background: #fff0f0;
    border: 1px solid rgba(217, 56, 58, 0.2);
    border-radius: 6px;
    color: var(--color-danger);
    font-size: 0.85rem;
    text-align: center;
  }
  .btn {
    width: 100%;
    padding: 0.75rem 1rem;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    font-size: 0.95rem;
    border: none;
    box-sizing: border-box;
  }
  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .btn-location {
    background: var(--color-primary);
    color: #ffffff;
    width: auto;
    padding: 0.6rem 1.25rem;
  }
  .btn-submit {
    background: var(--color-accent);
    color: #1e2a2f;
    font-size: 1.05rem;
    font-weight: 700;
    margin-bottom: 0.6rem;
  }
  .btn-skip {
    background: transparent;
    color: var(--color-text-muted);
    border: 1px solid var(--color-border);
  }
  .hours-row { display: flex; gap: 0.75rem; }
  .hours-field { flex: 1; display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.9rem; }
  .choices-row {
    display: flex;
    gap: 0.75rem;
  }
  .choice-chip {
    flex: 1;
    padding: 0.7rem 0.5rem;
    border-radius: 8px;
    border: 2px solid var(--color-border);
    background: #fff;
    font-weight: 600;
    cursor: pointer;
    color: var(--color-text-muted);
    font-size: 0.95rem;
    text-align: center;
  }
  .choice-chip.active {
    border-color: var(--color-primary);
    color: var(--color-primary);
    background: rgba(14, 90, 107, 0.06);
  }
  @media (max-width: 480px) {
    .onboarding-wrapper {
      padding: 1rem 0.5rem;
    }
    .onboarding-card {
      padding: 1.5rem 1rem;
      border-radius: 12px;
    }
    .title {
      font-size: 1.25rem;
    }
    .choices-row {
      flex-direction: column;
      gap: 0.5rem;
    }
    .btn {
      padding: 0.75rem 0.85rem;
      font-size: 0.9rem;
    }
  }
`;
