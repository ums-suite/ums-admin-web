import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../../../core/config/app-config';
import { AcademicGradingStore } from './academic-grading.store';

describe('AcademicGradingStore', () => {
  let store: InstanceType<typeof AcademicGradingStore>;
  let httpMock: HttpTestingController;
  const apiBaseUrl = 'http://localhost:8080';

  const grade = {
    id: 'grade-1',
    enrollmentId: 'enrollment-1',
    calculatedScore: 72,
    letterGrade: 'B+',
    scores: [{ assessmentId: 'assessment-1', score: 72 }],
    submittedAt: '2026-01-01T00:00:00Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { ...DEFAULT_APP_CONFIG, apiBaseUrl } },
      ],
    });
    store = TestBed.inject(AcademicGradingStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('corrects a grade and records it as the last corrected grade', () => {
    store
      .correctGrade('grade-1', {
        scores: [{ assessmentId: 'assessment-1', score: 72 }],
        reason: 'recount',
      })
      .subscribe();
    const req = httpMock.expectOne(`${apiBaseUrl}/api/v1/academic/grades/grade-1/correct`);
    expect(req.request.body).toEqual({
      scores: [{ assessmentId: 'assessment-1', score: 72 }],
      reason: 'recount',
    });
    req.flush(grade);
    expect(store.lastCorrectedGrade()).toEqual(grade);
  });
});
