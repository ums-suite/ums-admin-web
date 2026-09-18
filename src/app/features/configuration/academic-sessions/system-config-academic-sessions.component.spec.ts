import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../../../core/config/app-config';
import { SystemConfigAcademicSessionsComponent } from './system-config-academic-sessions.component';

describe('SystemConfigAcademicSessionsComponent', () => {
  let httpMock: HttpTestingController;
  const apiBaseUrl = 'http://localhost:8080';

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SystemConfigAcademicSessionsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { ...DEFAULT_APP_CONFIG, apiBaseUrl } },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('does not create a session without a code or semesters', () => {
    const fixture = TestBed.createComponent(SystemConfigAcademicSessionsComponent);
    fixture.detectChanges();
    fixture.componentInstance['submitCreate']();
    httpMock.expectNone(`${apiBaseUrl}/api/v1/academic/academic-sessions`);
  });

  it('adds a semester and creates a session', () => {
    const fixture = TestBed.createComponent(SystemConfigAcademicSessionsComponent);
    fixture.detectChanges();
    fixture.componentInstance['code'].set('2026-FALL');
    fixture.componentInstance['semesterName'].set('Fall');
    fixture.componentInstance['registrationStart'].set('2026-08-01T00:00:00Z');
    fixture.componentInstance['registrationEnd'].set('2026-08-15T00:00:00Z');
    fixture.componentInstance['dropStart'].set('2026-08-16T00:00:00Z');
    fixture.componentInstance['dropEnd'].set('2026-08-20T00:00:00Z');
    fixture.componentInstance['addSemester']();
    expect(fixture.componentInstance['draftSemesters']().length).toBe(1);

    fixture.componentInstance['submitCreate']();
    const req = httpMock.expectOne(`${apiBaseUrl}/api/v1/academic/academic-sessions`);
    expect(req.request.body.code).toBe('2026-FALL');
    req.flush({
      id: 'sess-1',
      code: '2026-FALL',
      semesters: [
        {
          id: 'sem-1',
          name: 'Fall',
          registrationStart: '2026-08-01T00:00:00Z',
          registrationEnd: '2026-08-15T00:00:00Z',
          dropStart: '2026-08-16T00:00:00Z',
          dropEnd: '2026-08-20T00:00:00Z',
        },
      ],
      createdAt: '2026-01-01T00:00:00Z',
    });
    expect(fixture.componentInstance['createdSession']()?.id).toBe('sess-1');
  });

  it('looks up a session by id', () => {
    const fixture = TestBed.createComponent(SystemConfigAcademicSessionsComponent);
    fixture.detectChanges();
    fixture.componentInstance['lookupId'].set('sess-1');
    fixture.componentInstance['lookup']();
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/academic/academic-sessions/sess-1`)
      .flush({ id: 'sess-1', code: '2026-FALL', semesters: [], createdAt: '2026-01-01T00:00:00Z' });
    expect(fixture.componentInstance['lookedUpSession']()?.code).toBe('2026-FALL');
  });
});
