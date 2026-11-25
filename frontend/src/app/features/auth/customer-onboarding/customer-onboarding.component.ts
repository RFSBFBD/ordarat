import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AR_TRANSLATIONS } from '../../../core/constants/translations';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ONBOARDING_STYLES } from '../onboarding.styles';

/**
 * Quick customer profile: name, Egyptian phone, shared location.
 * Can be postponed entirely; the data is then collected at order time.
 */
@Component({
  selector: 'app-customer-onboarding',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="onboarding-wrapper">
      <div class="onboarding-card">
        <h2 class="title">{{ t.customerOnboarding.title }}</h2>
        <p class="desc">{{ t.customerOnboarding.desc }}</p>

        <div class="form-group">
          <label class="label">{{ t.customerOnboarding.nameLabel }} *</label>
          <input
            type="text"
            [(ngModel)]="name"
            class="input-field"
            [placeholder]="t.customerOnboarding.namePlaceholder"
          />
          <span *ngIf="showErrors && !name" class="error-text">
            {{ t.customerOnboarding.nameRequired }}
          </span>
        </div>

        <div class="form-group">
          <label class="label phone-label">
            <app-icon name="phone" [size]="16" />
            {{ t.customerOnboarding.phoneLabel }} *
          </label>
          <span class="phone-hint">{{ t.customerOnboarding.phoneHint }}</span>
          <input
            type="tel"
            inputmode="numeric"
            [(ngModel)]="phone"
            class="input-field"
            placeholder="01012345678"
            maxlength="11"
          />
          <span *ngIf="showErrors && !isPhoneValid()" class="error-text">
            {{ t.customerOnboarding.phoneInvalid }}
          </span>
        </div>

        <div class="form-group">
          <label class="label">{{ t.customerOnboarding.addressLabel }}</label>
          <input
            type="text"
            [(ngModel)]="address"
            class="input-field"
            [placeholder]="t.customerOnboarding.addressPlaceholder"
          />
        </div>

        <div class="location-box">
          <div class="loc-status" [class.success]="hasLocation">
            <span class="loc-line">
              <app-icon name="map-pin" [size]="16" />
              {{ hasLocation ? t.customerOnboarding.locationShared : t.customerOnboarding.locationRequired }}
            </span>
          </div>
          <button type="button" class="btn btn-location" [disabled]="isLocating" (click)="requestLocation()">
            {{ isLocating ? t.customer.geolocation.locating : t.customerOnboarding.locationBtn }}
          </button>
          <div *ngIf="locationError" class="location-error-box">
            <p>{{ locationError }}</p>
            <small>{{ t.customer.geolocation.deniedHelp }}</small>
          </div>
        </div>

        <div *ngIf="submitError" class="error-box">{{ submitError }}</div>

        <button class="btn btn-submit" [disabled]="isSaving" (click)="save()">
          {{ isSaving ? t.states.loading : t.customerOnboarding.saveBtn }}
        </button>
      </div>
    </div>
  `,
  styles: [
    ONBOARDING_STYLES +
      `
      .phone-label { display: flex; align-items: center; gap: 6px; }
      .phone-hint { display: block; margin: 2px 0 6px; font-size: 0.82rem; color: var(--color-text-muted); }
    `,
  ],
})
export class CustomerOnboardingComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);
  protected readonly t = AR_TRANSLATIONS;

  name = '';
  phone = '';
  address = '';
  showErrors = false;
  isLocating = false;
  isSaving = false;
  hasLocation = false;
  locationError = '';
  submitError = '';
  private latitude = 0;
  private longitude = 0;

  ngOnInit(): void {
    this.auth.whenReady().then(() => {
      if (!this.auth.isLoggedIn()) {
        this.router.navigate(['/auth/login'], { queryParams: { returnUrl: '/auth/onboarding/customer' } });
        return;
      }
      const profile = this.auth.profile();
      if (profile) {
        this.name = profile.name || '';
        this.phone = profile.phone || '';
      }
    });
  }

  isPhoneValid(): boolean {
    return /^01[0125][0-9]{8}$/.test(this.phone);
  }

  requestLocation(): void {
    if (!navigator.geolocation) {
      this.locationError = this.t.customer.geolocation.unsupported;
      return;
    }
    this.isLocating = true;
    this.locationError = '';
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.isLocating = false;
        this.hasLocation = true;
        this.latitude = pos.coords.latitude;
        this.longitude = pos.coords.longitude;
        this.cdr.markForCheck();
      },
      () => {
        this.isLocating = false;
        this.locationError = this.t.customer.geolocation.denied;
        this.cdr.markForCheck();
      },
      { timeout: 10000, enableHighAccuracy: true },
    );
  }

  save(): void {
    this.showErrors = true;
    this.submitError = '';
    if (!this.name || !this.isPhoneValid() || !this.hasLocation) {
      return;
    }
    this.isSaving = true;
    this.api
      .completeCustomerOnboarding({
        name: this.name,
        phone: this.phone,
        address: this.address || null,
        latitude: this.latitude,
        longitude: this.longitude,
      })
      .subscribe({
        next: () => {
          this.isSaving = false;
          void this.auth.refreshProfile().finally(() => {
            this.router.navigate(['/customer/stores']);
          });
        },
        error: (err: { message?: string }) => {
          this.isSaving = false;
          this.submitError = err?.message || this.t.customerOnboarding.failed;
          this.cdr.markForCheck();
        },
      });
  }
}
