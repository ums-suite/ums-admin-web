import { ActivatedRoute } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { FeaturePlaceholderComponent } from './feature-placeholder.component';

describe('FeaturePlaceholderComponent', () => {
  function createWithRouteData(data: Record<string, unknown>) {
    TestBed.configureTestingModule({
      imports: [FeaturePlaceholderComponent],
      providers: [{ provide: ActivatedRoute, useValue: { data: of(data) } }],
    });
    const fixture = TestBed.createComponent(FeaturePlaceholderComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('falls back to a generic label when the route carries none', () => {
    const fixture = createWithRouteData({});
    expect(fixture.nativeElement.textContent).toContain('This section');
  });

  it("renders the route's own data.label", () => {
    const fixture = createWithRouteData({ label: 'Fee Reconciliation' });
    expect(fixture.nativeElement.textContent).toContain('Fee Reconciliation');
  });
});
