import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../../../core/config/app-config';
import { AdmissionCampaignsStore } from './admission-campaigns.store';

describe('AdmissionCampaignsStore', () => {
  let store: InstanceType<typeof AdmissionCampaignsStore>;
  let httpMock: HttpTestingController;
  const apiBaseUrl = 'http://localhost:8080';

  const campaign = {
    id: 'c1',
    name: 'Fall 2026',
    programIds: ['p1'],
    applicationWindowStart: '2026-01-01',
    applicationWindowEnd: '2026-02-01',
    applicationFeeType: 'AdmissionApplicationFee',
    confirmationFeeType: 'AdmissionConfirmationFee',
    isConfigurationLocked: false,
    requiredDocumentTypes: [],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { ...DEFAULT_APP_CONFIG, apiBaseUrl } },
      ],
    });
    store = TestBed.inject(AdmissionCampaignsStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('creates a campaign', () => {
    let result: unknown;
    store
      .createCampaign({
        name: 'Fall 2026',
        programIds: ['p1'],
        applicationWindowStart: '2026-01-01',
        applicationWindowEnd: '2026-02-01',
        applicationFeeType: 'AdmissionApplicationFee',
        confirmationFeeType: 'AdmissionConfirmationFee',
      })
      .subscribe((c) => (result = c));

    httpMock.expectOne(`${apiBaseUrl}/api/v1/admission/campaigns`).flush(campaign);
    expect(result).toEqual(campaign);
    expect(store.currentCampaign()).toEqual(campaign);
  });

  it('loads a campaign by id', () => {
    store.loadCampaign('c1');
    httpMock.expectOne(`${apiBaseUrl}/api/v1/admission/campaigns/c1`).flush(campaign);
    expect(store.currentCampaign()).toEqual(campaign);
    expect(store.isLoading()).toBeFalse();
  });

  it('surfaces an error when loading fails', () => {
    store.loadCampaign('missing');
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/admission/campaigns/missing`)
      .flush(null, { status: 404, statusText: 'Not Found' });
    expect(store.error()).toBeTruthy();
  });

  it('adds an eligibility rule and updates the current campaign', () => {
    const updated = { ...campaign, requiredDocumentTypes: [] };
    store
      .addEligibilityRule('c1', {
        programId: 'p1',
        minimumScore: 3.5,
        isGpaScale: true,
        requiredBoard: null,
      })
      .subscribe();
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/admission/campaigns/c1/eligibility-rules`)
      .flush(updated);
    expect(store.currentCampaign()).toEqual(updated);
  });

  it('adds a seat quota', () => {
    store.addSeatQuota('c1', { programId: 'p1', quota: 100 }).subscribe();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/admission/campaigns/c1/seat-quotas`).flush(campaign);
    expect(store.currentCampaign()).toEqual(campaign);
  });

  it('adds a required document type', () => {
    store.addRequiredDocumentType('c1', { documentType: 'Photo' }).subscribe();
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/admission/campaigns/c1/required-documents`)
      .flush({ ...campaign, requiredDocumentTypes: ['Photo'] });
    expect(store.currentCampaign()?.requiredDocumentTypes).toEqual(['Photo']);
  });
});
