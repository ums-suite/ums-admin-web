import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../../../core/config/app-config';
import { AcademicCourseOfferingsStore } from './academic-course-offerings.store';

describe('AcademicCourseOfferingsStore', () => {
  let store: InstanceType<typeof AcademicCourseOfferingsStore>;
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

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { ...DEFAULT_APP_CONFIG, apiBaseUrl } },
      ],
    });
    store = TestBed.inject(AcademicCourseOfferingsStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('loads a course offering by id', () => {
    store.loadOffering('off-1');
    httpMock.expectOne(`${apiBaseUrl}/api/v1/academic/course-offerings/off-1`).flush(offering);
    expect(store.currentOffering()).toEqual(offering);
    expect(store.isLoading()).toBeFalse();
  });

  it('surfaces an error when loading a course offering fails', () => {
    store.loadOffering('missing');
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/academic/course-offerings/missing`)
      .flush(null, { status: 404, statusText: 'Not Found' });
    expect(store.error()).toBeTruthy();
  });

  it('lists course offerings by semester', () => {
    store.loadOfferingsBySemester('sem-1');
    const req = httpMock.expectOne(
      (r) =>
        r.url === `${apiBaseUrl}/api/v1/academic/course-offerings` &&
        r.params.get('semester') === 'sem-1',
    );
    req.flush([offering]);
    expect(store.offeringsBySemester()).toEqual([offering]);
  });

  it('creates a course offering', () => {
    store
      .createOffering({
        courseId: 'course-1',
        semesterId: 'sem-1',
        departmentId: 'dept-1',
        capacity: 60,
        sections: [],
      })
      .subscribe();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/academic/course-offerings`).flush(offering);
    expect(store.currentOffering()).toEqual(offering);
  });

  it('assigns an instructor and updates the current offering', () => {
    const updated = { ...offering, instructorFacultyMemberId: 'fac-1' };
    store.assignInstructor('off-1', { facultyMemberId: 'fac-1' }).subscribe();
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/academic/course-offerings/off-1/instructor`)
      .flush(updated);
    expect(store.currentOffering()).toEqual(updated);
  });

  it('adds an exam and updates the current offering', () => {
    const updated = {
      ...offering,
      exams: [
        { id: 'exam-1', name: 'Final', assessments: [{ id: 'a-1', name: 'Written', weight: 1 }] },
      ],
    };
    store
      .addExam('off-1', { name: 'Final', assessments: [{ name: 'Written', weight: 1 }] })
      .subscribe();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/academic/course-offerings/off-1/exams`).flush(updated);
    expect(store.currentOffering()).toEqual(updated);
  });
});
