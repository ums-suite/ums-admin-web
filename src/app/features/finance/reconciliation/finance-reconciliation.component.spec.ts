import { TestBed } from '@angular/core/testing';
import { FinanceReconciliationComponent } from './finance-reconciliation.component';

describe('FinanceReconciliationComponent', () => {
  it('renders an honest "not yet available" state rather than fabricated data', async () => {
    await TestBed.configureTestingModule({
      imports: [FinanceReconciliationComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(FinanceReconciliationComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Not yet available');
    expect(fixture.nativeElement.textContent).toContain('no read endpoint');
  });
});
