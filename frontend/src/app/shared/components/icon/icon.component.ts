import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideArrowRight,
  lucideBanknote,
  lucideBike,
  lucideCheck,
  lucideChefHat,
  lucideCircleX,
  lucideClock,
  lucideLayoutGrid,
  lucideList,
  lucideLogIn,
  lucideLogOut,
  lucideMapPin,
  lucideMinus,
  lucidePackage,
  lucidePhone,
  lucidePlus,
  lucideRefreshCcw,
  lucideShieldCheck,
  lucideShoppingBasket,
  lucideShoppingCart,
  lucideStore,
  lucideTriangleAlert,
  lucideTruck,
  lucideUser,
  lucideUtensils,
} from '@ng-icons/lucide';

const ICON_MAP: Record<string, string> = {
  'shopping-cart': 'lucideShoppingCart',
  'shopping-basket': 'lucideShoppingBasket',
  'map-pin': 'lucideMapPin',
  store: 'lucideStore',
  bike: 'lucideBike',
  banknote: 'lucideBanknote',
  'layout-grid': 'lucideLayoutGrid',
  list: 'lucideList',
  'arrow-right': 'lucideArrowRight',
  check: 'lucideCheck',
  clock: 'lucideClock',
  package: 'lucidePackage',
  'chef-hat': 'lucideChefHat',
  truck: 'lucideTruck',
  'circle-x': 'lucideCircleX',
  'triangle-alert': 'lucideTriangleAlert',
  user: 'lucideUser',
  'log-in': 'lucideLogIn',
  'log-out': 'lucideLogOut',
  'refresh-cw': 'lucideRefreshCcw',
  utensils: 'lucideUtensils',
  phone: 'lucidePhone',
  plus: 'lucidePlus',
  minus: 'lucideMinus',
  'shield-check': 'lucideShieldCheck',
};

/**
 * Icon wrapper over the real Lucide library (@ng-icons/lucide).
 *
 * Usage: <app-icon name="shopping-cart" [size]="20" />
 */
@Component({
  selector: 'app-icon',
  standalone: true,
  imports: [NgIconComponent],
  providers: [
    provideIcons({
      lucideArrowRight,
      lucideBanknote,
      lucideBike,
      lucideCheck,
      lucideChefHat,
      lucideCircleX,
      lucideClock,
      lucideLayoutGrid,
      lucideList,
      lucideLogIn,
      lucideLogOut,
      lucideMapPin,
      lucideMinus,
      lucidePackage,
      lucidePhone,
      lucidePlus,
      lucideRefreshCcw,
      lucideShieldCheck,
      lucideShoppingBasket,
      lucideShoppingCart,
      lucideStore,
      lucideTriangleAlert,
      lucideTruck,
      lucideUser,
      lucideUtensils,
    }),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-icon
      [name]="resolvedName()"
      [size]="size().toString()"
      [strokeWidth]="strokeWidth()"
      aria-hidden="true"
    ></ng-icon>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        vertical-align: middle;
        line-height: 0;
      }
    `,
  ],
})
export class IconComponent {
  readonly name = input.required<string>();
  readonly size = input<number>(20);
  readonly strokeWidth = input<number>(2);

  readonly resolvedName = computed(() => {
    const raw = this.name();
    if (ICON_MAP[raw]) return ICON_MAP[raw];
    // Allow passing a raw lucide name when it is a registered icon; otherwise fall back.
    return raw.startsWith('lucide') ? raw : 'lucidePackage';
  });
}
