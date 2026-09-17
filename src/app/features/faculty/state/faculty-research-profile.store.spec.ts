import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../../../core/config/app-config';
import { FacultyResearchProfileStore } from './faculty-research-profile.store';

describe('FacultyResearchProfileStore', () => {
  let store: InstanceType<typeof FacultyResearchProfileStore>;
  let httpMock: HttpTestingController;
  const apiBaseUrl = 'http://localhost:8080';

  const profile = {
    id: 'profile-1',
    facultyMemberId: 'fac-1',
    publications: [],
    ongoingResearch: null,
    grants: null,
    version: 1,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { ...DEFAULT_APP_CONFIG, apiBaseUrl } },
      ],
    });
    store = TestBed.inject(FacultyResearchProfileStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('loads a research profile by faculty member id', () => {
    store.loadProfile('fac-1');
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/faculty/members/fac-1/research-profile`)
      .flush(profile);
    expect(store.currentProfile()).toEqual(profile);
  });

  it('surfaces an error on load failure', () => {
    store.loadProfile('missing');
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/faculty/members/missing/research-profile`)
      .flush(null, { status: 404, statusText: 'Not Found' });
    expect(store.error()).toBeTruthy();
  });

  it('updates a research profile', () => {
    const updated = { ...profile, ongoingResearch: 'AI ethics', version: 2 };
    store
      .updateProfile('fac-1', {
        publications: [],
        ongoingResearch: 'AI ethics',
        grants: null,
        version: 1,
      })
      .subscribe();
    const req = httpMock.expectOne(`${apiBaseUrl}/api/v1/faculty/members/fac-1/research-profile`);
    expect(req.request.method).toBe('PUT');
    req.flush(updated);
    expect(store.currentProfile()).toEqual(updated);
  });
});
