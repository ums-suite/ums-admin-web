import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../../../core/config/app-config';
import { AdmissionExamMeritStore } from './admission-exam-merit.store';

describe('AdmissionExamMeritStore', () => {
  let store: InstanceType<typeof AdmissionExamMeritStore>;
  let httpMock: HttpTestingController;
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
    integrityFlags: [],
  };

  const meritList = {
    id: 'merit-1',
    campaignId: 'campaign-1',
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
    store = TestBed.inject(AdmissionExamMeritStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('loads an exam attempt by id', () => {
    store.loadExamAttempt('attempt-1');
    httpMock.expectOne(`${apiBaseUrl}/api/v1/admission/exams/attempts/attempt-1`).flush(attempt);
    expect(store.currentAttempt()).toEqual(attempt);
  });

  it('surfaces an error when loading an exam attempt fails', () => {
    store.loadExamAttempt('missing');
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/admission/exams/attempts/missing`)
      .flush(null, { status: 404, statusText: 'Not Found' });
    expect(store.error()).toBeTruthy();
  });

  it('records a subjective score and updates the current attempt', () => {
    const updated = { ...attempt, subjectiveScore: 30 };
    store.recordSubjectiveScore('attempt-1', { subjectiveScore: 30 }).subscribe();
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/admission/exams/attempts/attempt-1/subjective-score`)
      .flush(updated);
    expect(store.currentAttempt()).toEqual(updated);
  });

  it('reviews an integrity flag and updates the current attempt', () => {
    const updated = { ...attempt, integrityFlags: [] };
    store
      .reviewIntegrityFlag('attempt-1', 'flag-1', { outcome: 'Cleared', reviewNotes: 'ok' })
      .subscribe();
    httpMock
      .expectOne(
        `${apiBaseUrl}/api/v1/admission/exams/attempts/attempt-1/integrity-flags/flag-1/review`,
      )
      .flush(updated);
    expect(store.currentAttempt()).toEqual(updated);
  });

  it('loads a merit list by campaign', () => {
    store.loadMeritListByCampaign('campaign-1');
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/admission/merit-lists/by-campaign/campaign-1`)
      .flush(meritList);
    expect(store.currentMeritList()).toEqual(meritList);
  });

  it('generates a merit list', () => {
    store.generateMeritList('campaign-1').subscribe();
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/admission/merit-lists/campaign-1/generate`)
      .flush(meritList);
    expect(store.currentMeritList()).toEqual(meritList);
  });

  it('approves a merit list', () => {
    const approved = { ...meritList, status: 'Approved' };
    store.approveMeritList('merit-1').subscribe();
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/admission/merit-lists/merit-1/approve`)
      .flush(approved);
    expect(store.currentMeritList()).toEqual(approved);
  });

  it('promotes a waitlisted applicant', () => {
    let result: unknown;
    store
      .promoteWaitlisted('campaign-1', { applicantId: 'ap-1', programId: 'p-1' })
      .subscribe((r) => (result = r));
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/admission/results/campaign-1/promote-waitlisted`)
      .flush({ ok: true });
    expect(result).toEqual({ ok: true });
  });
});
