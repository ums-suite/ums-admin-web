import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../../../core/config/app-config';
import { AcademicCurriculumStore } from './academic-curriculum.store';

describe('AcademicCurriculumStore', () => {
  let store: InstanceType<typeof AcademicCurriculumStore>;
  let httpMock: HttpTestingController;
  const apiBaseUrl = 'http://localhost:8080';

  const program = {
    id: 'prog-1',
    departmentId: 'dept-1',
    code: 'CSE',
    name: 'Computer Science',
    maxCreditsPerSemester: 18,
    requiresAdvisorApproval: true,
    createdAt: '2026-01-01T00:00:00Z',
  };

  const session = {
    id: 'sess-1',
    code: 'FALL2026',
    semesters: [
      {
        id: 'sem-1',
        name: 'Fall',
        registrationStart: '2026-08-01',
        registrationEnd: '2026-08-15',
        dropStart: '2026-08-16',
        dropEnd: '2026-09-01',
      },
    ],
    createdAt: '2026-01-01T00:00:00Z',
  };

  const course = {
    id: 'course-1',
    code: 'CSE101',
    title: 'Intro to CS',
    creditHours: 3,
    prerequisites: [],
    createdAt: '2026-01-01T00:00:00Z',
  };

  const curriculum = {
    id: 'curr-1',
    programId: 'prog-1',
    version: 1,
    courses: [{ courseId: 'course-1', isRequired: true }],
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
    store = TestBed.inject(AcademicCurriculumStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('creates a program', () => {
    store
      .createProgram({
        departmentId: 'dept-1',
        code: 'CSE',
        name: 'Computer Science',
        maxCreditsPerSemester: 18,
        requiresAdvisorApproval: true,
      })
      .subscribe();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/academic/programs`).flush(program);
    expect(store.currentProgram()).toEqual(program);
  });

  it('loads a program by id', () => {
    store.loadProgram('prog-1');
    httpMock.expectOne(`${apiBaseUrl}/api/v1/academic/programs/prog-1`).flush(program);
    expect(store.currentProgram()).toEqual(program);
    expect(store.isLoading()).toBeFalse();
  });

  it('surfaces an error when loading a program fails', () => {
    store.loadProgram('missing');
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/academic/programs/missing`)
      .flush(null, { status: 404, statusText: 'Not Found' });
    expect(store.error()).toBeTruthy();
    expect(store.isLoading()).toBeFalse();
  });

  it('creates an academic session', () => {
    store
      .createAcademicSession({
        code: 'FALL2026',
        semesters: [
          {
            name: 'Fall',
            registrationStart: '2026-08-01',
            registrationEnd: '2026-08-15',
            dropStart: '2026-08-16',
            dropEnd: '2026-09-01',
          },
        ],
      })
      .subscribe();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/academic/academic-sessions`).flush(session);
    expect(store.currentSession()).toEqual(session);
  });

  it('loads an academic session by id', () => {
    store.loadAcademicSession('sess-1');
    httpMock.expectOne(`${apiBaseUrl}/api/v1/academic/academic-sessions/sess-1`).flush(session);
    expect(store.currentSession()).toEqual(session);
  });

  it('creates a course', () => {
    store
      .createCourse({
        code: 'CSE101',
        title: 'Intro to CS',
        creditHours: 3,
        prerequisiteCourseIds: null,
      })
      .subscribe();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/academic/courses`).flush(course);
    expect(store.currentCourse()).toEqual(course);
  });

  it('loads a course by id', () => {
    store.loadCourse('course-1');
    httpMock.expectOne(`${apiBaseUrl}/api/v1/academic/courses/course-1`).flush(course);
    expect(store.currentCourse()).toEqual(course);
  });

  it('creates a curriculum', () => {
    store
      .createCurriculum({
        programId: 'prog-1',
        version: 1,
        courses: [{ courseId: 'course-1', isRequired: true }],
      })
      .subscribe();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/academic/curriculums`).flush(curriculum);
    expect(store.currentCurriculum()).toEqual(curriculum);
  });

  it('loads a curriculum by id', () => {
    store.loadCurriculum('curr-1');
    httpMock.expectOne(`${apiBaseUrl}/api/v1/academic/curriculums/curr-1`).flush(curriculum);
    expect(store.currentCurriculum()).toEqual(curriculum);
  });
});
