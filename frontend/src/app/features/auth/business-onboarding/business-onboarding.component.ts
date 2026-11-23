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
 * Business join form (restaurant OR grocery). Submitting stores a PENDING
 * application only; the admin's approval is what creates the store and
 * grants the merchant role. Nothing here grants any privilege.
 */
@Component({
  selector: 'app-business-onboarding',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="onboarding-wrapper">
      <div class="onboarding-card">
        <h2 class="title">{{ t.businessOnboarding.title }}</h2>
        <p class="desc">{{ t.businessOnboarding.desc }}</p>

        <div class="form-group">
          <label class="label">{{ t.businessOnboarding.nameLabel }} *</label>
          <input
            type="text"
            [(ngModel)]="businessName"
            class="input-field"
            [placeholder]="t.businessOnboarding.namePlaceholder"
          />
          <span *ngIf="showErrors && !businessName" class="error-text">
            {{ t.businessOnboarding.nameRequired }}
          </span>
        </div>

        <div class="form-group">
          <label class="label">{{ t.businessOnboarding.typeLabel }} *</label>
          <div class="choices-row">
            <button
              type="button"
              class="choice-chip"
              [class.active]="type === 'restaurant'"
              (click)="type = 'restaurant'"
            >
              {{ t.businessOnboarding.typeRestaurant }}
            </button>
            <button
              type="button"
              class="choice-chip"
              [class.active]="type === 'grocery'"
              (click)="type = 'grocery'"
            >
              {{ t.businessOnboarding.typeGrocery }}
            </button>
          </div>
        </div>

        <div class="form-group">
          <label class="label">{{ t.businessOnboarding.phoneLabel }} *</label>
          <input
            type="tel"
            [(ngModel)]="phone"
            class="input-field"
            placeholder="01012345678"
            maxlength="11"
          />
          <span *ngIf="showErrors && !isPhoneValid()" class="error-text">
            {{ t.businessOnboarding.phoneInvalid }}
          </span>
        </div>

        <div class="form-group">
          <label class="label">{{ t.businessOnboarding.areaLabel }} *</label>
          <input
            type="text"
            [(ngModel)]="areaName"
            class="input-field"
            [placeholder]="t.businessOnboarding.areaPlaceholder"
          />
          <span *ngIf="showErrors && !areaName" class="error-text">
            {{ t.businessOnboarding.areaRequired }}
          </span>
        </div>

        <div class="form-group">
          <label class="label">{{ t.businessOnboarding.addressLabel }} *</label>
          <input
            type="text"
            [(ngModel)]="address"
            class="input-field"
            [placeholder]="t.businessOnboarding.addressPlaceholder"
          />
          <span *ngIf="showErrors && !address" class="error-text">
            {{ t.businessOnboarding.addressRequired }}
          </span>
        </div>

        <div class="form-group">
          <label class="label">{{ t.businessOnboarding.branchesLabel }}</label>
          <div class="choices-row">
            <button
              type="button"
              class="choice-chip"
              [class.active]="hasBranches === true"
              (click)="hasBranches = true"
            >
              {{ t.businessOnboarding.branchesYes }}
            </button>
            <button
              type="button"
              class="choice-chip"
              [class.active]="hasBranches === false"
              (click)="hasBranches = false"
            >
              {{ t.businessOnboarding.branchesNo }}
            </button>
          </div>
        </div>

        <div class="location-box">
          <div class="loc-status" [class.success]="hasLocation">
            <span class="loc-line">
              <app-icon name="map-pin" [size]="16" />
              {{ hasLocation ? t.businessOnboarding.locationShared : t.businessOnboarding.locationRequired }}
            </span>
          </div>
          <button type="button" class="btn btn-location" [disabled]="isLocating" (click)="requestLocation()">
            {{ isLocating ? t.customer.geolocation.locating : t.businessOnboarding.locationBtn }}
          </button>
          <div *ngIf="locationError" class="location-error-box">
            <p>{{ locationError }}</p>
            <small>{{ t.customer.geolocation.deniedHelp }}</small>
          </div>
        </div>

        <div *ngIf="submitError" class="error-box">{{ submitError }}</div>

        <button class="btn btn-submit" [disabled]="isSaving" (click)="submit()">
          {{ isSaving ? t.businessOnboarding.sending : t.businessOnboarding.submitBtn }}
        </button>
      </div>
    </div>
  `,
  styles: [ONBOARDING_STYLES],
})
export class BusinessOnboardingComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);
  protected readonly t = AR_TRANSLATIONS;

  businessName = '';
  type: 'restaurant' | 'grocery' = 'restaurant';
  phone = '';
  areaName = '';
  address = '';
  hasBranches: boolean | null = null;
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
        this.router.navigate(['/auth/login'], { queryParams: { returnUrl: '/auth/onboarding/business' } });
        return;
      }
      if (this.auth.profile()?.merchant_application_status === 'pending') {
        this.router.navigate(['/auth/pending']);
        return;
      }
      const profile = this.auth.profile();
      if (profile?.phone) {
        this.phone = profile.phone;
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

  submit(): void {
    this.showErrors = true;
    this.submitError = '';
    if (!this.businessName || !this.isPhoneValid() || !this.areaName || !this.address || !this.hasLocation) {
      return;
    }
    this.isSaving = true;
    this.api
      .submitMerchantApplication({
        business_name: this.businessName,
        type: this.type,
        phone: this.phone,
        address: this.address,
        latitude: this.latitude,
        longitude: this.longitude,
        has_branches: this.hasBranches === true,
        area_name: this.areaName,
      })
      .subscribe({
        next: () => {
          this.isSaving = false;
          void this.auth.refreshProfile().finally(() => {
            this.router.navigate(['/auth/pending']);
          });
        },
        error: (err: { message?: string }) => {
          this.isSaving = false;
          this.submitError = err?.message || this.t.businessOnboarding.failed;
          this.cdr.markForCheck();
        },
      });
  }
}
