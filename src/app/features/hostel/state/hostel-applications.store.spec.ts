import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../../../core/config/app-config';
import { HostelApplicationsStore } from './hostel-applications.store';

describe('HostelApplicationsStore', () => {
  let store: InstanceType<typeof HostelApplicationsStore>;
  let httpMock: HttpTestingController;
  const apiBaseUrl = 'http://localhost:8080';

  const win = {
    id: 'win-1',
    name: 'Fall 2026',
    opensAt: '2026-01-01T00:00:00Z',
    closesAt: '2026-02-01T00:00:00Z',
    eligibleProgramIds: [],
    eligibleYears: [],
    eligibilityRules: [],
  };
  const application = {
    id: 'app-1',
    applicationWindowId: 'win-1',
    studentId: 's-1',
    status: 'Submitted',
    submittedAt: '2026-01-05T00:00:00Z',
    rank: null,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { ...DEFAULT_APP_CONFIG, apiBaseUrl } },
      ],
    });
    store = TestBed.inject(HostelApplicationsStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('creates an application window and prepends it', () => {
    store
      .createApplicationWindow({ name: 'Fall 2026', opensAt: win.opensAt, closesAt: win.closesAt })
      .subscribe();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/hostel/application-windows`).flush(win);
    expect(store.applicationWindows()).toEqual([win]);
  });

  it('sets eligible programs with the PascalCase ProgramIds body and updates the window in place', () => {
    store
      .createApplicationWindow({ name: win.name, opensAt: win.opensAt, closesAt: win.closesAt })
      .subscribe();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/hostel/application-windows`).flush(win);

    store.setEligiblePrograms('win-1', ['prog-1']).subscribe();
    const req = httpMock.expectOne(
      `${apiBaseUrl}/api/v1/hostel/application-windows/win-1/eligible-programs`,
    );
    expect(req.request.body).toEqual({ ProgramIds: ['prog-1'] });
    req.flush({ ...win, eligibleProgramIds: ['prog-1'] });
    expect(store.applicationWindows()[0].eligibleProgramIds).toEqual(['prog-1']);
  });

  it('ranks applications for a window', () => {
    store.rankApplications('win-1').subscribe();
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/hostel/application-windows/win-1/rank`)
      .flush({ rankedCount: 12 });
  });

  it('submits a self-service application', () => {
    store.submitApplication({ applicationWindowId: 'win-1' }).subscribe();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/hostel/applications`).flush(application);
    expect(store.myApplications()).toEqual([application]);
  });

  it('loads the review queue requiring both applicationWindowId and status', () => {
    store.loadReviewQueue('win-1', 'Submitted');
    const req = httpMock.expectOne((r) => r.url === `${apiBaseUrl}/api/v1/hostel/applications/`);
    expect(req.request.params.get('applicationWindowId')).toBe('win-1');
    expect(req.request.params.get('status')).toBe('Submitted');
    req.flush([application]);
    expect(store.reviewQueue()).toEqual([application]);
  });

  it('reviews an application with the PascalCase Decision body', () => {
    store.loadReviewQueue('win-1', 'Submitted');
    httpMock
      .expectOne((r) => r.url === `${apiBaseUrl}/api/v1/hostel/applications/`)
      .flush([application]);

    store.reviewApplication('app-1', { Decision: 'Approve' }).subscribe();
    const req = httpMock.expectOne(`${apiBaseUrl}/api/v1/hostel/applications/app-1/review`);
    expect(req.request.body).toEqual({ Decision: 'Approve' });
    req.flush({ ...application, status: 'Approved' });
    expect(store.reviewQueue()[0].status).toBe('Approved');
  });

  it('surfaces an error message when loading my applications fails', () => {
    store.loadMyApplications();
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/hostel/applications/me`)
      .flush(null, { status: 500, statusText: 'Server Error' });
    expect(store.error()).toBeTruthy();
  });
});
