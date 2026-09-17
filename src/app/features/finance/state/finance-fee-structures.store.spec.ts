import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../../../core/config/app-config';
import { FinanceFeeStructuresStore } from './finance-fee-structures.store';

describe('FinanceFeeStructuresStore', () => {
  let store: InstanceType<typeof FinanceFeeStructuresStore>;
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

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { ...DEFAULT_APP_CONFIG, apiBaseUrl } },
      ],
    });
    store = TestBed.inject(FinanceFeeStructuresStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('loads all fee structures', () => {
    store.loadFeeStructures();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/finance/fee-structures`).flush([feeStructure]);
    expect(store.feeStructures()).toEqual([feeStructure]);
    expect(store.isLoading()).toBeFalse();
  });

  it('surfaces an error when loading fails', () => {
    store.loadFeeStructures();
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/finance/fee-structures`)
      .flush(null, { status: 500, statusText: 'Server Error' });
    expect(store.error()).toBeTruthy();
  });

  it('creates a fee structure and prepends it to the list', () => {
    store
      .createFeeStructure({
        feeType: 'Tuition',
        applicabilityType: 'Program',
        applicabilityReferenceId: 'prog-1',
        applicabilityServiceName: null,
        amount: 5000,
        currency: 'BDT',
        effectiveFrom: null,
      })
      .subscribe();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/finance/fee-structures`).flush(feeStructure);
    expect(store.feeStructures()).toEqual([feeStructure]);
  });

  it('publishes a new version and prepends it to the list', () => {
    const nextVersion = { ...feeStructure, versionNumber: 2, amount: 6000 };
    store
      .publishNewVersion('fs-1', { amount: 6000, currency: null, effectiveFrom: null })
      .subscribe();
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/finance/fee-structures/fs-1/new-version`)
      .flush(nextVersion);
    expect(store.feeStructures()[0]).toEqual(nextVersion);
  });
});
