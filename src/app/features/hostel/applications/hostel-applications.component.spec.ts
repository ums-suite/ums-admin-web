import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideApi } from '@ums/shared';
import { UmsToastService } from '@ums/design-system';
import { ConfirmationService } from '../../../shared/confirmation/confirmation.service';
import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../../../core/config/app-config';
import { HostelApplicationsComponent } from './hostel-applications.component';

describe('HostelApplicationsComponent', () => {
  let httpMock: HttpTestingController;
  let confirmation: ConfirmationService;
  let toast: UmsToastService;
  const apiBaseUrl = 'http://localhost:8080';

  const application = {
    id: 'app-1',
    applicationWindowId: 'win-1',
    studentId: 's-1',
    status: 'Submitted',
    submittedAt: '2026-01-05T00:00:00Z',
    rank: null,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostelApplicationsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApi(apiBaseUrl),
        provideRouter([]),
        { provide: APP_CONFIG, useValue: { ...DEFAULT_APP_CONFIG, apiBaseUrl } },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    confirmation = TestBed.inject(ConfirmationService);
    toast = TestBed.inject(UmsToastService);
  });

  afterEach(() => httpMock.verify());

  it('does not submit an application without a window id', () => {
    const fixture = TestBed.createComponent(HostelApplicationsComponent);
    fixture.detectChanges();
    fixture.componentInstance['submitApplication']();
    httpMock.expectNone(`${apiBaseUrl}/api/v1/hostel/applications`);
  });

  it('adds and removes a draft eligibility rule', () => {
    const fixture = TestBed.createComponent(HostelApplicationsComponent);
    fixture.detectChanges();
    fixture.componentInstance['ruleValueInput'].set('2');
    fixture.componentInstance['addDraftRule']();
    expect(fixture.componentInstance['draftRules']().length).toBe(1);
    fixture.componentInstance['removeDraftRule'](0);
    expect(fixture.componentInstance['draftRules']().length).toBe(0);
  });

  it('loads the review queue requiring both window id and status', () => {
    const fixture = TestBed.createComponent(HostelApplicationsComponent);
    fixture.detectChanges();
    fixture.componentInstance['reviewWindowId'].set('win-1');
    fixture.componentInstance['reviewStatus'].set('Submitted');
    fixture.componentInstance['loadReviewQueue']();
    const req = httpMock.expectOne((r) => r.url === `${apiBaseUrl}/api/v1/hostel/applications/`);
    expect(req.request.params.get('applicationWindowId')).toBe('win-1');
    req.flush([application]);
    expect(fixture.componentInstance['store'].reviewQueue()).toEqual([application]);
  });

  it('approves an application end to end with a confirmation and audit-linked success', () => {
    const fixture = TestBed.createComponent(HostelApplicationsComponent);
    fixture.detectChanges();
    fixture.componentInstance['review']('app-1', 'Approve');
    expect(confirmation.current()?.title).toBe('Approve hostel application');
    confirmation.confirm('looks eligible');

    const req = httpMock.expectOne(`${apiBaseUrl}/api/v1/hostel/applications/app-1/review`);
    expect(req.request.body).toEqual({ Decision: 'Approve', Reason: undefined });
    req.flush({ ...application, status: 'Approved' });
    httpMock
      .expectOne((r) => r.url === `${apiBaseUrl}/api/v1/audit/entries`)
      .flush({ items: [{ id: 'audit-1' }] });

    expect(toast.toasts()[0].message).toContain('audit entry audit-1');
  });

  it('surfaces the shared conflict message on a 409 review race', () => {
    const fixture = TestBed.createComponent(HostelApplicationsComponent);
    fixture.detectChanges();
    fixture.componentInstance['review']('app-1', 'Approve');
    confirmation.confirm('reviewing');

    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/hostel/applications/app-1/review`)
      .flush(
        {
          type: 'about:blank',
          title: 'Conflict',
          status: 409,
          code: 'allocation.no_bed_available',
          correlationId: 'corr-1',
        },
        { status: 409, statusText: 'Conflict' },
      );

    expect(toast.toasts()[0].message).toContain('someone else acted first');
  });
});
