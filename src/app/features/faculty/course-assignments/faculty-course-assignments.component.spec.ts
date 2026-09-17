import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../../../core/config/app-config';
import { FacultyCourseAssignmentsComponent } from './faculty-course-assignments.component';

describe('FacultyCourseAssignmentsComponent', () => {
  let httpMock: HttpTestingController;
  const apiBaseUrl = 'http://localhost:8080';

  const assignment = {
    id: 'assign-1',
    facultyMemberId: 'fac-1',
    courseOfferingId: 'off-1',
    status: 'Active',
    assignedAt: '2026-01-01T00:00:00Z',
    endedAt: null,
  };

  async function setup(facultyMemberId: string | null): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [FacultyCourseAssignmentsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: APP_CONFIG, useValue: { ...DEFAULT_APP_CONFIG, apiBaseUrl } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap(facultyMemberId ? { facultyMemberId } : {}),
            },
          },
        },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  }

  afterEach(() => httpMock.verify());

  it('auto-loads assignments when a facultyMemberId query param is present', async () => {
    await setup('fac-1');
    const fixture = TestBed.createComponent(FacultyCourseAssignmentsComponent);
    fixture.detectChanges();

    const req = httpMock.expectOne(
      (r) =>
        r.url === `${apiBaseUrl}/api/v1/faculty/course-assignments` &&
        r.params.get('facultyMemberId') === 'fac-1',
    );
    req.flush([assignment]);
    expect(fixture.componentInstance['store'].assignments()).toEqual([assignment]);
  });

  it('does not auto-load without a query param, and loads on demand', async () => {
    await setup(null);
    const fixture = TestBed.createComponent(FacultyCourseAssignmentsComponent);
    fixture.detectChanges();
    httpMock.expectNone((r) => r.url === `${apiBaseUrl}/api/v1/faculty/course-assignments`);

    fixture.componentInstance['facultyMemberId'].set('fac-2');
    fixture.componentInstance['loadAssignments']();
    const req = httpMock.expectOne((r) => r.params.get('facultyMemberId') === 'fac-2');
    req.flush([]);
    expect(fixture.componentInstance['store'].assignments()).toEqual([]);
  });

  it('navigates to Academic course offerings', async () => {
    await setup(null);
    const fixture = TestBed.createComponent(FacultyCourseAssignmentsComponent);
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate');
    fixture.componentInstance['goToCourseOfferings']();
    expect(navigateSpy).toHaveBeenCalledWith(['/academic/course-offerings']);
  });
});
