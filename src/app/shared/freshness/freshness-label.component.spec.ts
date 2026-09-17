import { TestBed } from '@angular/core/testing';
import { FreshnessLabelComponent } from './freshness-label.component';

describe('FreshnessLabelComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FreshnessLabelComponent],
    }).compileComponents();
  });

  it('shows the "never computed" message for a null asOf', () => {
    const fixture = TestBed.createComponent(FreshnessLabelComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Not yet computed');
  });

  it('shows the "never computed" message for an unparseable date string', () => {
    const fixture = TestBed.createComponent(FreshnessLabelComponent);
    fixture.componentRef.setInput('asOf', 'not-a-date');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Not yet computed');
  });

  it('renders a formatted "As of ..." string for a valid Date', () => {
    const fixture = TestBed.createComponent(FreshnessLabelComponent);
    const date = new Date('2026-01-01T00:00:00Z');
    fixture.componentRef.setInput('asOf', date);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('As of');
    expect(fixture.nativeElement.textContent).toContain(date.toLocaleString());
  });

  it('accepts an ISO date string too', () => {
    const fixture = TestBed.createComponent(FreshnessLabelComponent);
    fixture.componentRef.setInput('asOf', '2026-01-01T00:00:00Z');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('As of');
  });

  it('supports a custom prefix and never-computed message', () => {
    const fixture = TestBed.createComponent(FreshnessLabelComponent);
    fixture.componentRef.setInput('neverComputedMessage', 'No data yet');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No data yet');
  });
});
