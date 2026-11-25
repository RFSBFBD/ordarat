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
          <label class="label">{{ t.businessOnboarding.logoLabel }} *</label>
          <div class="logo-row">
            <div class="logo-preview" [class.empty]="!logoData">
              <img *ngIf="logoData" [src]="logoData" [alt]="businessName || t.businessOnboarding.logoLabel" />
              <span *ngIf="!logoData">{{ t.businessOnboarding.logoEmpty }}</span>
            </div>
            <label class="btn btn-location logo-pick">
              {{ logoData ? t.businessOnboarding.logoChange : t.businessOnboarding.logoPick }}
              <input type="file" accept="image/png,image/jpeg,image/webp" hidden (change)="onLogoSelected($event)" />
            </label>
          </div>
          <span class="field-hint">{{ t.businessOnboarding.logoHint }}</span>
          <span *ngIf="logoError" class="error-text">{{ logoError }}</span>
          <span *ngIf="showErrors && !logoData && !logoError" class="error-text">{{ t.businessOnboarding.logoRequired }}</span>
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
  styles: [
    ONBOARDING_STYLES +
      `
      .logo-row { display: flex; align-items: center; gap: 1rem; }
      .logo-preview {
        width: 88px; height: 88px; border-radius: 20px; overflow: hidden; flex-shrink: 0;
        background: #f4efe6; border: 1px solid var(--color-border);
        display: flex; align-items: center; justify-content: center;
        color: var(--color-text-muted); font-size: 0.8rem; text-align: center;
      }
      .logo-preview.empty { border-style: dashed; }
      .logo-preview img { width: 100%; height: 100%; object-fit: cover; }
      .logo-pick { display: inline-block; text-align: center; cursor: pointer; }
      .field-hint { color: var(--color-text-muted); font-size: 0.8rem; margin-top: 4px; display: block; }
    `,
  ],
})
export class BusinessOnboardingComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);
  protected readonly t = AR_TRANSLATIONS;

  businessName = '';
  logoData = '';
  logoError = '';
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

  /** Shrinks the picked image to a 256x256 square so the upload stays small. */
  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    this.logoError = '';
    if (!file) {
      return;
    }
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type) || file.size > 8 * 1024 * 1024) {
      this.logoError = this.t.businessOnboarding.logoInvalid;
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const size = 256;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx || !img.width || !img.height) {
        this.logoError = this.t.businessOnboarding.logoInvalid;
        this.cdr.markForCheck();
        return;
      }
      const side = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
      let data = canvas.toDataURL('image/webp', 0.85);
      if (!data.startsWith('data:image/webp') || data.length > 140_000) {
        data = canvas.toDataURL('image/jpeg', 0.8);
      }
      if (data.length > 140_000) {
        this.logoError = this.t.businessOnboarding.logoInvalid;
      } else {
        this.logoData = data;
      }
      this.cdr.markForCheck();
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      this.logoError = this.t.businessOnboarding.logoInvalid;
      this.cdr.markForCheck();
    };
    img.src = url;
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
    if (!this.logoData || !this.businessName || !this.isPhoneValid() || !this.areaName || !this.address || !this.hasLocation) {
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
        logo: this.logoData,
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
