import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it, beforeEach } from 'vitest';
import { IconComponent } from './icon.component';

describe('IconComponent', () => {
  let fixture: ComponentFixture<IconComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IconComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(IconComponent);
    fixture.componentRef.setInput('name', 'shopping-cart');
    fixture.detectChanges();
  });

  it('renders an svg element', () => {
    const svg: SVGElement | null = fixture.nativeElement.querySelector('svg');
    expect(svg).toBeTruthy();
  });

  it('renders actual svg inner content for a known icon', () => {
    const svg: SVGElement | null = fixture.nativeElement.querySelector('svg');
    expect(svg?.innerHTML.length).toBeGreaterThan(0);
    expect(svg?.querySelector('path, circle, rect')).toBeTruthy();
  });

  it('falls back to a default icon for an unknown icon name', () => {
    fixture.componentRef.setInput('name', 'does-not-exist');
    fixture.detectChanges();
    const svg: SVGElement | null = fixture.nativeElement.querySelector('svg');
    // Unknown names render the fallback lucide icon instead of breaking the layout.
    expect(svg?.querySelector('path, circle, rect, line, polyline, polygon')).toBeTruthy();
  });

  it('applies the requested size', () => {
    fixture.componentRef.setInput('size', 32);
    fixture.detectChanges();
    const iconEl: HTMLElement | null = fixture.nativeElement.querySelector('ng-icon');
    // ng-icons applies the size through inline styles on its host element.
    expect(iconEl?.getAttribute('style') ?? '').toContain('32');
  });
});
