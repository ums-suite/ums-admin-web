import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Router } from '@angular/router';
import { provideApi } from '@ums/shared';
import { UmsToastService } from '@ums/design-system';
import { ConfirmationService } from '../../../shared/confirmation/confirmation.service';
import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../../../core/config/app-config';
import { AcademicGradingComponent } from './academic-grading.component';

describe('AcademicGradingComponent', () => {
  let httpMock: HttpTestingController;
  let confirmation: ConfirmationService;
  let toast: UmsToastService;
  const apiBaseUrl = 'http://localhost:8080';

  const grade = {
    id: 'grade-1',
    enrollmentId: 'enrollment-1',
    calculatedScore: 72,
    letterGrade: 'B+',
    scores: [{ assessmentId: 'assessment-1', score: 72 }],
    submittedAt: '2026-01-01T00:00:00Z',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AcademicGradingComponent],
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

  it('adds and removes a draft score', () => {
    const fixture = TestBed.createComponent(AcademicGradingComponent);
    fixture.detectChanges();
    fixture.componentInstance['assessmentIdInput'].set('assessment-1');
    fixture.componentInstance['scoreInput'].set('72');
    fixture.componentInstance['addDraftScore']();
    expect(fixture.componentInstance['draftScores']().length).toBe(1);

    fixture.componentInstance['removeDraftScore'](0);
    expect(fixture.componentInstance['draftScores']().length).toBe(0);
  });

  it('does not submit a correction without a grade id or scores', () => {
    const fixture = TestBed.createComponent(AcademicGradingComponent);
    fixture.detectChanges();
    fixture.componentInstance['submitCorrection']();
    expect(confirmation.current()).toBeNull();
  });

  it('corrects a grade end to end with a mandatory reason and audit-linked success', () => {
    const fixture = TestBed.createComponent(AcademicGradingComponent);
    fixture.detectChanges();
    fixture.componentInstance['gradeId'].set('grade-1');
    fixture.componentInstance['assessmentIdInput'].set('assessment-1');
    fixture.componentInstance['scoreInput'].set('72');
    fixture.componentInstance['addDraftScore']();

    fixture.componentInstance['submitCorrection']();
    expect(confirmation.current()?.title).toBe('Correct grade');
    confirmation.confirm('recount requested');

    const req = httpMock.expectOne(`${apiBaseUrl}/api/v1/academic/grades/grade-1/correct`);
    expect(req.request.body).toEqual({
      scores: [{ assessmentId: 'assessment-1', score: 72 }],
      reason: 'recount requested',
    });
    req.flush(grade);
    httpMock
      .expectOne((r) => r.url === `${apiBaseUrl}/api/v1/audit/entries`)
      .flush({ items: [{ id: 'audit-1' }] });

    expect(toast.toasts()[0].message).toContain('audit entry audit-1');
    expect(fixture.componentInstance['draftScores']().length).toBe(0);
  });

  it('navigates to the result-publication screen', () => {
    const fixture = TestBed.createComponent(AcademicGradingComponent);
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate');
    fixture.componentInstance['goToResultPublication']();
    expect(navigateSpy).toHaveBeenCalledWith(['/academic/result-publication']);
  });

  it('navigates to role management', () => {
    const fixture = TestBed.createComponent(AcademicGradingComponent);
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate');
    fixture.componentInstance['goToRoleManagement']();
    expect(navigateSpy).toHaveBeenCalledWith(['/identity/roles']);
  });
});
