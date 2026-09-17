import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../../../core/config/app-config';
import { AcademicCurriculumComponent } from './academic-curriculum.component';

describe('AcademicCurriculumComponent', () => {
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

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AcademicCurriculumComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { ...DEFAULT_APP_CONFIG, apiBaseUrl } },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('does not submit a program create when required fields are missing', () => {
    const fixture = TestBed.createComponent(AcademicCurriculumComponent);
    fixture.detectChanges();
    fixture.componentInstance['submitProgram']();
    httpMock.expectNone(`${apiBaseUrl}/api/v1/academic/programs`);
    expect(fixture.componentInstance['store'].currentProgram()).toBeNull();
  });

  it('creates a program with the composed request body', () => {
    const fixture = TestBed.createComponent(AcademicCurriculumComponent);
    fixture.detectChanges();
    fixture.componentInstance['programDepartmentId'].set('dept-1');
    fixture.componentInstance['programCode'].set('CSE');
    fixture.componentInstance['programName'].set('Computer Science');
    fixture.componentInstance['programMaxCredits'].set('18');
    fixture.componentInstance['programRequiresAdvisorApproval'].set(true);

    fixture.componentInstance['submitProgram']();

    const req = httpMock.expectOne(`${apiBaseUrl}/api/v1/academic/programs`);
    expect(req.request.body).toEqual({
      departmentId: 'dept-1',
      code: 'CSE',
      name: 'Computer Science',
      maxCreditsPerSemester: 18,
      requiresAdvisorApproval: true,
    });
    req.flush(program);
    expect(fixture.componentInstance['store'].currentProgram()).toEqual(program);
  });

  it('loads a program by id', () => {
    const fixture = TestBed.createComponent(AcademicCurriculumComponent);
    fixture.detectChanges();
    fixture.componentInstance['lookupProgramId'].set('prog-1');
    fixture.componentInstance['loadProgram']();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/academic/programs/prog-1`).flush(program);
    expect(fixture.componentInstance['store'].currentProgram()).toEqual(program);
  });

  it('creates an academic session with one semester', () => {
    const fixture = TestBed.createComponent(AcademicCurriculumComponent);
    fixture.detectChanges();
    fixture.componentInstance['sessionCode'].set('FALL2026');
    fixture.componentInstance['semesterName'].set('Fall');
    fixture.componentInstance['semesterRegistrationStart'].set('2026-08-01');
    fixture.componentInstance['semesterRegistrationEnd'].set('2026-08-15');
    fixture.componentInstance['semesterDropStart'].set('2026-08-16');
    fixture.componentInstance['semesterDropEnd'].set('2026-09-01');

    fixture.componentInstance['submitAcademicSession']();

    const req = httpMock.expectOne(`${apiBaseUrl}/api/v1/academic/academic-sessions`);
    expect(req.request.body.semesters.length).toBe(1);
    req.flush({ id: 'sess-1', code: 'FALL2026', semesters: [], createdAt: '2026-01-01T00:00:00Z' });
  });

  it('creates a course, parsing comma-separated prerequisite ids', () => {
    const fixture = TestBed.createComponent(AcademicCurriculumComponent);
    fixture.detectChanges();
    fixture.componentInstance['courseCode'].set('CSE201');
    fixture.componentInstance['courseTitle'].set('Data Structures');
    fixture.componentInstance['courseCreditHours'].set('3');
    fixture.componentInstance['coursePrerequisiteIds'].set('course-1, course-2');

    fixture.componentInstance['submitCourse']();

    const req = httpMock.expectOne(`${apiBaseUrl}/api/v1/academic/courses`);
    expect(req.request.body.prerequisiteCourseIds).toEqual(['course-1', 'course-2']);
    req.flush({
      id: 'course-3',
      code: 'CSE201',
      title: 'Data Structures',
      creditHours: 3,
      prerequisites: ['course-1', 'course-2'],
      createdAt: '2026-01-01T00:00:00Z',
    });
  });

  it('sends null prerequisiteCourseIds when none are given', () => {
    const fixture = TestBed.createComponent(AcademicCurriculumComponent);
    fixture.detectChanges();
    fixture.componentInstance['courseCode'].set('CSE101');
    fixture.componentInstance['courseTitle'].set('Intro');
    fixture.componentInstance['courseCreditHours'].set('3');

    fixture.componentInstance['submitCourse']();

    const req = httpMock.expectOne(`${apiBaseUrl}/api/v1/academic/courses`);
    expect(req.request.body.prerequisiteCourseIds).toBeNull();
    req.flush({
      id: 'course-1',
      code: 'CSE101',
      title: 'Intro',
      creditHours: 3,
      prerequisites: [],
      createdAt: '2026-01-01T00:00:00Z',
    });
  });

  it('does not submit a curriculum without at least one course id', () => {
    const fixture = TestBed.createComponent(AcademicCurriculumComponent);
    fixture.detectChanges();
    fixture.componentInstance['curriculumProgramId'].set('prog-1');
    fixture.componentInstance['submitCurriculum']();
    httpMock.expectNone(`${apiBaseUrl}/api/v1/academic/curriculums`);
    expect(fixture.componentInstance['store'].currentCurriculum()).toBeNull();
  });

  it('creates a curriculum with required course entries', () => {
    const fixture = TestBed.createComponent(AcademicCurriculumComponent);
    fixture.detectChanges();
    fixture.componentInstance['curriculumProgramId'].set('prog-1');
    fixture.componentInstance['curriculumVersion'].set('1');
    fixture.componentInstance['curriculumCourseIds'].set('course-1, course-2');

    fixture.componentInstance['submitCurriculum']();

    const req = httpMock.expectOne(`${apiBaseUrl}/api/v1/academic/curriculums`);
    expect(req.request.body).toEqual({
      programId: 'prog-1',
      version: 1,
      courses: [
        { courseId: 'course-1', isRequired: true },
        { courseId: 'course-2', isRequired: true },
      ],
    });
    req.flush({
      id: 'curr-1',
      programId: 'prog-1',
      version: 1,
      courses: [],
      createdAt: '2026-01-01T00:00:00Z',
    });
  });
});
