import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../../../core/config/app-config';
import { AdmissionResultPublicationStore } from './admission-result-publication.store';

describe('AdmissionResultPublicationStore', () => {
  let store: InstanceType<typeof AdmissionResultPublicationStore>;
  let httpMock: HttpTestingController;
  const apiBaseUrl = 'http://localhost:8080';

  const result = {
    id: 'result-1',
    campaignId: 'campaign-1',
    meritListId: 'merit-1',
    status: 'Draft',
    entries: [],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { ...DEFAULT_APP_CONFIG, apiBaseUrl } },
      ],
    });
    store = TestBed.inject(AdmissionResultPublicationStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('loads the current admission result for a campaign', () => {
    store.loadResultByCampaign('campaign-1');
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/admission/results/by-campaign/campaign-1`)
      .flush(result);
    expect(store.currentResult()).toEqual(result);
    expect(store.isLoading()).toBeFalse();
  });

  it('surfaces an error when loading fails (e.g. no result exists yet)', () => {
    store.loadResultByCampaign('missing');
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/admission/results/by-campaign/missing`)
      .flush(null, { status: 404, statusText: 'Not Found' });
    expect(store.error()).toBeTruthy();
  });

  it('setCurrentResult replaces the held result directly', () => {
    store.setCurrentResult(result);
    expect(store.currentResult()).toEqual(result);
    const updated = { ...result, status: 'Calculated' };
    store.setCurrentResult(updated);
    expect(store.currentResult()).toEqual(updated);
  });
});
