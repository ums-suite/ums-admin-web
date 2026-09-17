import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { PermissionsService } from '../../../core/auth/permissions/permissions.service';
import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../../../core/config/app-config';
import { AcademicCourseOfferingsComponent } from './academic-course-offerings.component';

describe('AcademicCourseOfferingsComponent', () => {
  let httpMock: HttpTestingController;
  const apiBaseUrl = 'http://localhost:8080';

  const offering = {
    id: 'off-1',
    courseId: 'course-1',
    semesterId: 'sem-1',
    departmentId: 'dept-1',
    capacity: 60,
    enrolledCount: 10,
    hasAvailableSeats: true,
    instructorFacultyMemberId: null,
    sections: [],
    exams: [],
    createdAt: '2026-01-01T00:00:00Z',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AcademicCourseOfferingsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { ...DEFAULT_APP_CONFIG, apiBaseUrl } },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('adds and removes a draft section before creating an offering', () => {
    const fixture = TestBed.createComponent(AcademicCourseOfferingsComponent);
    fixture.detectChanges();
    fixture.componentInstance['sectionCode'].set('A');
    fixture.componentInstance['addDraftSection']();
    expect(fixture.componentInstance['draftSections']().length).toBe(1);

    fixture.componentInstance['removeDraftSection'](0);
    expect(fixture.componentInstance['draftSections']().length).toBe(0);
  });

  it('does not add a draft section with a blank code', () => {
    const fixture = TestBed.createComponent(AcademicCourseOfferingsComponent);
    fixture.detectChanges();
    fixture.componentInstance['addDraftSection']();
    expect(fixture.componentInstance['draftSections']().length).toBe(0);
  });

  it('does not submit a course offering when required fields are missing', () => {
    const fixture = TestBed.createComponent(AcademicCourseOfferingsComponent);
    fixture.detectChanges();
    fixture.componentInstance['submitOffering']();
    httpMock.expectNone(`${apiBaseUrl}/api/v1/academic/course-offerings`);
    expect(fixture.componentInstance['store'].currentOffering()).toBeNull();
  });

  it('creates a course offering with drafted sections', () => {
    const fixture = TestBed.createComponent(AcademicCourseOfferingsComponent);
    fixture.detectChanges();
    fixture.componentInstance['newCourseId'].set('course-1');
    fixture.componentInstance['newSemesterId'].set('sem-1');
    fixture.componentInstance['newDepartmentId'].set('dept-1');
    fixture.componentInstance['newCapacity'].set('60');
    fixture.componentInstance['sectionCode'].set('A');
    fixture.componentInstance['addDraftSection']();

    fixture.componentInstance['submitOffering']();

    const req = httpMock.expectOne(`${apiBaseUrl}/api/v1/academic/course-offerings`);
    expect(req.request.body.sections.length).toBe(1);
    req.flush(offering);
    expect(fixture.componentInstance['store'].currentOffering()).toEqual(offering);
  });

  it('loads a course offering by id', () => {
    const fixture = TestBed.createComponent(AcademicCourseOfferingsComponent);
    fixture.detectChanges();
    fixture.componentInstance['lookupOfferingId'].set('off-1');
    fixture.componentInstance['loadOffering']();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/academic/course-offerings/off-1`).flush(offering);
    expect(fixture.componentInstance['store'].currentOffering()).toEqual(offering);
  });

  it('assigns an instructor to the currently loaded offering', () => {
    const fixture = TestBed.createComponent(AcademicCourseOfferingsComponent);
    fixture.detectChanges();
    fixture.componentInstance['lookupOfferingId'].set('off-1');
    fixture.componentInstance['loadOffering']();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/academic/course-offerings/off-1`).flush(offering);

    fixture.componentInstance['instructorFacultyMemberId'].set('fac-1');
    fixture.componentInstance['submitInstructorAssignment']();

    const req = httpMock.expectOne(
      `${apiBaseUrl}/api/v1/academic/course-offerings/off-1/instructor`,
    );
    expect(req.request.body).toEqual({ facultyMemberId: 'fac-1' });
    req.flush({ ...offering, instructorFacultyMemberId: 'fac-1' });
  });

  it('does not assign an instructor when no offering is loaded', () => {
    const fixture = TestBed.createComponent(AcademicCourseOfferingsComponent);
    fixture.detectChanges();
    fixture.componentInstance['instructorFacultyMemberId'].set('fac-1');
    fixture.componentInstance['submitInstructorAssignment']();
    httpMock.expectNone(`${apiBaseUrl}/api/v1/academic/course-offerings/off-1/instructor`);
    expect(fixture.componentInstance['store'].currentOffering()).toBeNull();
  });

  it('adds an exam with one weighted assessment to the currently loaded offering', () => {
    const fixture = TestBed.createComponent(AcademicCourseOfferingsComponent);
    fixture.detectChanges();
    fixture.componentInstance['lookupOfferingId'].set('off-1');
    fixture.componentInstance['loadOffering']();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/academic/course-offerings/off-1`).flush(offering);

    fixture.componentInstance['examName'].set('Final');
    fixture.componentInstance['assessmentName'].set('Written');
    fixture.componentInstance['assessmentWeight'].set('0.7');
    fixture.componentInstance['submitExam']();

    const req = httpMock.expectOne(`${apiBaseUrl}/api/v1/academic/course-offerings/off-1/exams`);
    expect(req.request.body).toEqual({
      name: 'Final',
      assessments: [{ name: 'Written', weight: 0.7 }],
    });
    req.flush(offering);
  });

  it('renders the fully-populated offering detail and gated management sections once permitted', () => {
    const permissions = TestBed.inject(PermissionsService);
    permissions.load().subscribe();
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/identity/me/permissions`)
      .flush({ permissions: ['academic.courseoffering.manage'], scopeGrants: [] });

    const fixture = TestBed.createComponent(AcademicCourseOfferingsComponent);
    fixture.detectChanges();
    fixture.componentInstance['lookupOfferingId'].set('off-1');
    fixture.componentInstance['loadOffering']();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/academic/course-offerings/off-1`).flush({
      ...offering,
      instructorFacultyMemberId: 'fac-1',
      sections: [
        { id: 'sec-1', code: 'A', dayOfWeek: 'Monday', start: '09:00:00', end: '10:00:00' },
      ],
      exams: [
        {
          id: 'exam-1',
          name: 'Final',
          assessments: [{ id: 'a-1', name: 'Written', weight: 1 }],
        },
      ],
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('fac-1');
    expect(fixture.nativeElement.textContent).toContain('Final');
    expect(
      fixture.nativeElement.querySelectorAll('.academic-offerings__card').length,
    ).toBeGreaterThan(0);
  });

  it('lists course offerings by semester', () => {
    const fixture = TestBed.createComponent(AcademicCourseOfferingsComponent);
    fixture.detectChanges();
    fixture.componentInstance['lookupSemesterId'].set('sem-1');
    fixture.componentInstance['loadOfferingsBySemester']();

    const req = httpMock.expectOne(
      (r) =>
        r.url === `${apiBaseUrl}/api/v1/academic/course-offerings` &&
        r.params.get('semester') === 'sem-1',
    );
    req.flush([offering]);
    expect(fixture.componentInstance['store'].offeringsBySemester()).toEqual([offering]);
  });
});
