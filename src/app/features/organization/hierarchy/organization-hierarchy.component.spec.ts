import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideApi } from '@ums/shared';
import { UmsToastService } from '@ums/design-system';
import { ConfirmationService } from '../../../shared/confirmation/confirmation.service';
import { OrganizationHierarchyComponent } from './organization-hierarchy.component';

describe('OrganizationHierarchyComponent', () => {
  let httpMock: HttpTestingController;
  let confirmation: ConfirmationService;
  let toast: UmsToastService;
  const apiBaseUrl = 'http://localhost:8080';
  const emptyPage = { items: [], totalCount: 0, skip: 0, take: 100 };

  const university = {
    id: 'u1',
    name: 'UMS University',
    code: 'UMS',
    status: 'Active',
    createdAt: '2026-01-01T00:00:00Z',
    version: 1,
  };
  const faculty = {
    id: 'f1',
    campusId: 'c1',
    name: 'Engineering',
    localizedName: 'Engineering',
    status: 'Active',
    createdAt: '2026-01-01T00:00:00Z',
    version: 1,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrganizationHierarchyComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideApi(apiBaseUrl)],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    confirmation = TestBed.inject(ConfirmationService);
    toast = TestBed.inject(UmsToastService);
  });

  afterEach(() => httpMock.verify());

  function createAndLoad() {
    const fixture = TestBed.createComponent(OrganizationHierarchyComponent);
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.url === `${apiBaseUrl}/api/v1/organization/universities`)
      .flush({ items: [university], totalCount: 1, skip: 0, take: 100 });
    fixture.detectChanges();
    return fixture;
  }

  it('loads universities on init', () => {
    const fixture = createAndLoad();
    expect(fixture.componentInstance['store'].universities().length).toBe(1);
  });

  it('selecting a university loads its campuses and narrows the panel', () => {
    const fixture = createAndLoad();
    fixture.componentInstance['selectUniversity'](university);
    httpMock
      .expectOne((r) => r.url === `${apiBaseUrl}/api/v1/organization/campuses`)
      .flush(emptyPage);
    expect(fixture.componentInstance['selectedUniversity']()).toEqual(university);
  });

  it('does not submit a create with a blank name', () => {
    const fixture = createAndLoad();
    fixture.componentInstance['openCreateModal']('university');
    fixture.componentInstance['createName'].set('   ');
    fixture.componentInstance['submitCreate']();
    httpMock.expectNone((r) => r.method === 'POST');
  });

  it('creates a university and reloads the list', () => {
    const fixture = createAndLoad();
    fixture.componentInstance['openCreateModal']('university');
    fixture.componentInstance['createName'].set('New University');
    fixture.componentInstance['submitCreate']();

    httpMock
      .expectOne(
        (r) => r.method === 'POST' && r.url === `${apiBaseUrl}/api/v1/organization/universities`,
      )
      .flush({ ...university, id: 'u2', name: 'New University' });
    httpMock
      .expectOne(
        (r) => r.method === 'GET' && r.url === `${apiBaseUrl}/api/v1/organization/universities`,
      )
      .flush(emptyPage);

    expect(fixture.componentInstance['createLevel']()).toBeNull();
  });

  it('creates a campus scoped to the selected university', () => {
    const fixture = createAndLoad();
    fixture.componentInstance['selectUniversity'](university);
    httpMock
      .expectOne((r) => r.url === `${apiBaseUrl}/api/v1/organization/campuses`)
      .flush(emptyPage);

    fixture.componentInstance['openCreateModal']('campus');
    fixture.componentInstance['createName'].set('Main Campus');
    fixture.componentInstance['submitCreate']();

    const req = httpMock.expectOne(
      (r) => r.method === 'POST' && r.url === `${apiBaseUrl}/api/v1/organization/campuses`,
    );
    expect(req.request.body).toEqual({ universityId: 'u1', name: 'Main Campus' });
    req.flush({
      id: 'c1',
      universityId: 'u1',
      name: 'Main Campus',
      status: 'Active',
      createdAt: '2026-01-01T00:00:00Z',
      version: 1,
    });
    httpMock
      .expectOne((r) => r.url === `${apiBaseUrl}/api/v1/organization/campuses`)
      .flush(emptyPage);
  });

  it('deactivates a faculty end to end and shows the audit-linked success toast', () => {
    const fixture = createAndLoad();
    fixture.componentInstance['deactivateFaculty'](faculty);
    expect(confirmation.current()?.title).toBe('Deactivate faculty');
    confirmation.confirm('Merged into another faculty');

    httpMock
      .expectOne(
        (r) =>
          r.method === 'POST' &&
          r.url === `${apiBaseUrl}/api/v1/organization/faculties/f1/deactivate`,
      )
      .flush({});
    httpMock
      .expectOne((r) => r.url === `${apiBaseUrl}/api/v1/organization/faculties`)
      .flush(emptyPage);
    httpMock
      .expectOne((r) => r.url === `${apiBaseUrl}/api/v1/audit/entries`)
      .flush({ items: [{ id: 'audit-9' }] });

    expect(toast.toasts()[0].message).toContain('audit entry audit-9');
  });
});
