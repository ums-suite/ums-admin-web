import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../../../core/config/app-config';
import { SystemConfigFeeTemplatesComponent } from './system-config-fee-templates.component';

describe('SystemConfigFeeTemplatesComponent', () => {
  let httpMock: HttpTestingController;
  const apiBaseUrl = 'http://localhost:8080';

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SystemConfigFeeTemplatesComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { ...DEFAULT_APP_CONFIG, apiBaseUrl } },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('does not save a template without required fields', () => {
    const fixture = TestBed.createComponent(SystemConfigFeeTemplatesComponent);
    fixture.detectChanges();
    fixture.componentInstance['saveTemplate']();
    expect(fixture.componentInstance['templates']().length).toBe(0);
  });

  it('saves a same-session-only template with no backend call', () => {
    const fixture = TestBed.createComponent(SystemConfigFeeTemplatesComponent);
    fixture.detectChanges();
    fixture.componentInstance['draftLabel'].set('Tuition -- Program');
    fixture.componentInstance['draftFeeType'].set('Tuition');
    fixture.componentInstance['draftAmount'].set('5000');
    fixture.componentInstance['saveTemplate']();

    httpMock.expectNone(`${apiBaseUrl}/api/v1/finance/fee-structures`);
    expect(fixture.componentInstance['templates']().length).toBe(1);
  });

  it('applies a template by looping createFeeStructure once per target id', () => {
    const fixture = TestBed.createComponent(SystemConfigFeeTemplatesComponent);
    fixture.detectChanges();
    fixture.componentInstance['draftLabel'].set('Tuition -- Program');
    fixture.componentInstance['draftFeeType'].set('Tuition');
    fixture.componentInstance['draftAmount'].set('5000');
    fixture.componentInstance['saveTemplate']();

    const template = fixture.componentInstance['templates']()[0];
    fixture.componentInstance['setApplyTargets'](template.label, 'prog-1, prog-2');
    fixture.componentInstance['applyTemplate'](template);

    const requests = httpMock.match(`${apiBaseUrl}/api/v1/finance/fee-structures`);
    expect(requests.length).toBe(2);
    expect(requests.map((r) => r.request.body.applicabilityReferenceId).sort()).toEqual([
      'prog-1',
      'prog-2',
    ]);
    for (const req of requests) {
      req.flush({
        id: `fs-${req.request.body.applicabilityReferenceId}`,
        feeType: 'Tuition',
        applicabilityType: 'Program',
        applicabilityReferenceId: req.request.body.applicabilityReferenceId,
        applicabilityServiceName: null,
        amount: 5000,
        currency: 'BDT',
        versionNumber: 1,
        effectiveFrom: '2026-01-01T00:00:00Z',
        effectiveTo: null,
        status: 'Active',
        createdAt: '2026-01-01T00:00:00Z',
      });
    }

    expect(fixture.componentInstance['applyResultsByLabel']()[template.label]).toContain('2');
  });
});
