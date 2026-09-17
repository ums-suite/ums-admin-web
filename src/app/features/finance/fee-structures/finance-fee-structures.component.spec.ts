import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../../../core/config/app-config';
import { FinanceFeeStructuresComponent } from './finance-fee-structures.component';

describe('FinanceFeeStructuresComponent', () => {
  let httpMock: HttpTestingController;
  const apiBaseUrl = 'http://localhost:8080';

  const feeStructure = {
    id: 'fs-1',
    feeType: 'Tuition',
    applicabilityType: 'Program',
    applicabilityReferenceId: 'prog-1',
    applicabilityServiceName: null,
    amount: 5000,
    currency: 'BDT',
    versionNumber: 1,
    effectiveFrom: '2026-01-01T00:00:00Z',
    effectiveTo: null,
    status: 'Active',
    createdAt: '2026-01-01T00:00:00Z',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FinanceFeeStructuresComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { ...DEFAULT_APP_CONFIG, apiBaseUrl } },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('loads all fee structures into the store', () => {
    const fixture = TestBed.createComponent(FinanceFeeStructuresComponent);
    fixture.detectChanges();
    fixture.componentInstance['loadFeeStructures']();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/finance/fee-structures`).flush([feeStructure]);
    fixture.detectChanges();
    // CDK's virtual-scroll viewport doesn't reliably render its rows under Karma/Jasmine (see
    // @ums/design-system's own data-table.component.spec.ts doc) -- assert the store's data model.
    expect(fixture.componentInstance['store'].feeStructures()).toEqual([feeStructure]);
  });

  it('does not submit a create when required fields are missing', () => {
    const fixture = TestBed.createComponent(FinanceFeeStructuresComponent);
    fixture.detectChanges();
    fixture.componentInstance['submitCreate']();
    httpMock.expectNone(`${apiBaseUrl}/api/v1/finance/fee-structures`);
    expect(fixture.componentInstance['store'].feeStructures()).toEqual([]);
  });

  it('creates a Program-scoped fee structure with the composed request body', () => {
    const fixture = TestBed.createComponent(FinanceFeeStructuresComponent);
    fixture.detectChanges();
    fixture.componentInstance['newFeeType'].set('Tuition');
    fixture.componentInstance['newApplicabilityReferenceId'].set('prog-1');
    fixture.componentInstance['newAmount'].set('5000');

    fixture.componentInstance['submitCreate']();

    const req = httpMock.expectOne(`${apiBaseUrl}/api/v1/finance/fee-structures`);
    expect(req.request.body).toEqual({
      feeType: 'Tuition',
      applicabilityType: 'Program',
      applicabilityReferenceId: 'prog-1',
      applicabilityServiceName: null,
      amount: 5000,
      currency: 'BDT',
      effectiveFrom: null,
    });
    req.flush(feeStructure);
  });

  it('does not create a Service-scoped fee structure without a service name', () => {
    const fixture = TestBed.createComponent(FinanceFeeStructuresComponent);
    fixture.detectChanges();
    fixture.componentInstance['newFeeType'].set('Late Fee');
    fixture.componentInstance['newApplicabilityType'].set('Service');
    fixture.componentInstance['newAmount'].set('100');

    fixture.componentInstance['submitCreate']();
    httpMock.expectNone(`${apiBaseUrl}/api/v1/finance/fee-structures`);
    expect(fixture.componentInstance['store'].feeStructures()).toEqual([]);
  });

  it('does not publish a new version when required fields are missing', () => {
    const fixture = TestBed.createComponent(FinanceFeeStructuresComponent);
    fixture.detectChanges();
    fixture.componentInstance['submitNewVersion']();
    httpMock.expectNone(`${apiBaseUrl}/api/v1/finance/fee-structures/fs-1/new-version`);
    expect(fixture.componentInstance['store'].feeStructures()).toEqual([]);
  });

  it('publishes a new version', () => {
    const fixture = TestBed.createComponent(FinanceFeeStructuresComponent);
    fixture.detectChanges();
    fixture.componentInstance['versionFeeStructureId'].set('fs-1');
    fixture.componentInstance['versionAmount'].set('6000');

    fixture.componentInstance['submitNewVersion']();

    const req = httpMock.expectOne(`${apiBaseUrl}/api/v1/finance/fee-structures/fs-1/new-version`);
    expect(req.request.body).toEqual({ amount: 6000, currency: null, effectiveFrom: null });
    req.flush({ ...feeStructure, versionNumber: 2, amount: 6000 });
  });
});
