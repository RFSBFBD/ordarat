import { Injectable } from '@angular/core';
import { AR_TRANSLATIONS } from '../constants/translations';

@Injectable({
  providedIn: 'root',
})
export class TranslationService {
  private readonly translations = AR_TRANSLATIONS;

  get t() {
    return this.translations;
  }

  interpolate(template: string, params: Record<string, string | number>): string {
    return template.replace(/\{(\w+)\}/g, (_, key) => {
      return params[key] !== undefined ? String(params[key]) : `{${key}}`;
    });
  }
}
