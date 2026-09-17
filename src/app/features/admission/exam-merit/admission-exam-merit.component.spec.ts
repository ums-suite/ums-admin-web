import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideApi } from '@ums/shared';
import { UmsToastService } from '@ums/design-system';
import { ConfirmationService } from '../../../shared/confirmation/confirmation.service';
import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../../../core/config/app-config';
import { AdmissionExamMeritComponent } from './admission-exam-merit.component';

describe('AdmissionExamMeritComponent', () => {
  let httpMock: HttpTestingController;
  let confirmation: ConfirmationService;
  let toast: UmsToastService;
  const apiBaseUrl = 'http://localhost:8080';

  const attempt = {
    id: 'attempt-1',
    applicantId: 'ap-1',
    admissionTestId: 'test-1',
    rollNumber: 'R-1',
    status: 'Submitted',
    startedAt: '2026-01-01T00:00:00Z',
    expiresAt: '2026-01-01T02:00:00Z',
    selectedQuestionIds: [],
    answers: [],
    evaluationStatus: 'Evaluated',
    objectiveScore: 40,
    subjectiveScore: null,
    integrityFlags: [
      {
        id: 'flag-1',
        anomalyType: 'TabSwitch',
        details: 'x',
        confidenceScore: 0.5,
        outcome: 'Pending',
      },
    ],
  };

  const meritList = { id: 'merit-1', campaignId: 'campaign-1', status: 'Draft', entries: [] };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdmissionExamMeritComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApi(apiBaseUrl),
        { provide: APP_CONFIG, useValue: { ...DEFAULT_APP_CONFIG, apiBaseUrl } },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    confirmation = TestBed.inject(ConfirmationService);
    toast = TestBed.inject(UmsToastService);
  });

  afterEach(() => httpMock.verify());

  it('loads an exam attempt and renders its integrity flags', () => {
    const fixture = TestBed.createComponent(AdmissionExamMeritComponent);
    fixture.detectChanges();
    fixture.componentInstance['lookupAttemptId'].set('attempt-1');
    fixture.componentInstance['loadExamAttempt']();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/admission/exams/attempts/attempt-1`).flush(attempt);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('TabSwitch');
  });

  it('records a subjective score end to end with an audit-linked success toast', () => {
    const fixture = TestBed.createComponent(AdmissionExamMeritComponent);
    fixture.detectChanges();
    fixture.componentInstance['lookupAttemptId'].set('attempt-1');
    fixture.componentInstance['loadExamAttempt']();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/admission/exams/attempts/attempt-1`).flush(attempt);

    fixture.componentInstance['subjectiveScoreValue'].set('30');
    fixture.componentInstance['recordSubjectiveScore']();
    confirmation.confirm('recorded');

    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/admission/exams/attempts/attempt-1/subjective-score`)
      .flush({ ...attempt, subjectiveScore: 30 });
    httpMock
      .expectOne((r) => r.url === `${apiBaseUrl}/api/v1/audit/entries`)
      .flush({ items: [{ id: 'audit-1' }] });

    expect(toast.toasts()[0].message).toContain('audit entry audit-1');
  });

  it('does not record a subjective score without a loaded attempt', () => {
    const fixture = TestBed.createComponent(AdmissionExamMeritComponent);
    fixture.detectChanges();
    fixture.componentInstance['subjectiveScoreValue'].set('30');
    fixture.componentInstance['recordSubjectiveScore']();
    expect(confirmation.current()).toBeNull();
  });

  it('reviews an integrity flag as Cleared end to end', () => {
    const fixture = TestBed.createComponent(AdmissionExamMeritComponent);
    fixture.detectChanges();
    fixture.componentInstance['lookupAttemptId'].set('attempt-1');
    fixture.componentInstance['loadExamAttempt']();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/admission/exams/attempts/attempt-1`).flush(attempt);

    fixture.componentInstance['reviewFlagId'].set('flag-1');
    fixture.componentInstance['reviewIntegrityFlag']('Cleared');
    confirmation.confirm('looks fine');

    httpMock
      .expectOne(
        `${apiBaseUrl}/api/v1/admission/exams/attempts/attempt-1/integrity-flags/flag-1/review`,
      )
      .flush({ ...attempt, integrityFlags: [] });
    httpMock
      .expectOne((r) => r.url === `${apiBaseUrl}/api/v1/audit/entries`)
      .flush({ items: [{ id: 'audit-2' }] });

    expect(toast.toasts()[0].message).toContain('audit entry audit-2');
  });

  it('generates a merit list end to end', () => {
    const fixture = TestBed.createComponent(AdmissionExamMeritComponent);
    fixture.detectChanges();
    fixture.componentInstance['lookupCampaignId'].set('campaign-1');
    fixture.componentInstance['generateMeritList']();
    confirmation.confirm('generate');

    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/admission/merit-lists/campaign-1/generate`)
      .flush(meritList);
    httpMock
      .expectOne((r) => r.url === `${apiBaseUrl}/api/v1/audit/entries`)
      .flush({ items: [{ id: 'audit-3' }] });

    expect(toast.toasts()[0].message).toContain('audit entry audit-3');
  });

  it('approves the currently loaded merit list end to end', () => {
    const fixture = TestBed.createComponent(AdmissionExamMeritComponent);
    fixture.detectChanges();
    fixture.componentInstance['lookupCampaignId'].set('campaign-1');
    fixture.componentInstance['loadMeritList']();
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/admission/merit-lists/by-campaign/campaign-1`)
      .flush(meritList);

    fixture.componentInstance['approveMeritList']();
    confirmation.confirm('approve');

    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/admission/merit-lists/merit-1/approve`)
      .flush({ ...meritList, status: 'Approved' });
    httpMock
      .expectOne((r) => r.url === `${apiBaseUrl}/api/v1/audit/entries`)
      .flush({ items: [{ id: 'audit-4' }] });

    expect(toast.toasts()[0].message).toContain('audit entry audit-4');
  });

  it('does not promote a waitlisted applicant without all required fields', () => {
    const fixture = TestBed.createComponent(AdmissionExamMeritComponent);
    fixture.detectChanges();
    fixture.componentInstance['lookupCampaignId'].set('campaign-1');
    fixture.componentInstance['promoteWaitlisted']();
    expect(confirmation.current()).toBeNull();
  });

  it('promotes a waitlisted applicant end to end', () => {
    const fixture = TestBed.createComponent(AdmissionExamMeritComponent);
    fixture.detectChanges();
    fixture.componentInstance['lookupCampaignId'].set('campaign-1');
    fixture.componentInstance['promoteApplicantId'].set('ap-1');
    fixture.componentInstance['promoteProgramId'].set('p-1');
    fixture.componentInstance['promoteWaitlisted']();
    confirmation.confirm('promote');

    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/admission/results/campaign-1/promote-waitlisted`)
      .flush({});
    httpMock
      .expectOne((r) => r.url === `${apiBaseUrl}/api/v1/audit/entries`)
      .flush({ items: [{ id: 'audit-5' }] });

    expect(toast.toasts()[0].message).toContain('audit entry audit-5');
  });
});
