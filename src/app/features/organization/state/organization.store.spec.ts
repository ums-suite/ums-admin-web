import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideApi } from '@ums/shared';
import { OrganizationStore } from './organization.store';

describe('OrganizationStore', () => {
  let store: InstanceType<typeof OrganizationStore>;
  let httpMock: HttpTestingController;
  const apiBaseUrl = 'http://localhost:8080';
  const page = { items: [], totalCount: 0, skip: 0, take: 100 };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideApi(apiBaseUrl)],
    });
    store = TestBed.inject(OrganizationStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('loads universities', () => {
    store.loadUniversities();
    httpMock
      .expectOne((r) => r.url === `${apiBaseUrl}/api/v1/organization/universities`)
      .flush({
        items: [
          {
            id: 'u1',
            name: 'UMS U',
            code: null,
            status: 'Active',
            createdAt: '2026-01-01T00:00:00Z',
            version: 1,
          },
        ],
        totalCount: 1,
        skip: 0,
        take: 100,
      });
    expect(store.universities().length).toBe(1);
    expect(store.isLoading()).toBeFalse();
  });

  it('surfaces an error on a failed universities load', () => {
    store.loadUniversities();
    httpMock
      .expectOne((r) => r.url === `${apiBaseUrl}/api/v1/organization/universities`)
      .flush(null, { status: 500, statusText: 'Server Error' });
    expect(store.error()).toBeTruthy();
  });

  it('creates a university and reloads the list', () => {
    store.createUniversity({ name: 'New U', code: 'NU' }).subscribe();
    httpMock
      .expectOne(
        (r) => r.method === 'POST' && r.url === `${apiBaseUrl}/api/v1/organization/universities`,
      )
      .flush({
        id: 'u2',
        name: 'New U',
        code: 'NU',
        status: 'Active',
        createdAt: '2026-01-01T00:00:00Z',
        version: 1,
      });
    httpMock
      .expectOne(
        (r) => r.method === 'GET' && r.url === `${apiBaseUrl}/api/v1/organization/universities`,
      )
      .flush(page);
    expect(store.universities()).toEqual([]);
  });

  it('loads campuses scoped to a university', () => {
    store.loadCampuses('u1');
    httpMock.expectOne((r) => r.url === `${apiBaseUrl}/api/v1/organization/campuses`).flush(page);
    expect(store.campuses()).toEqual([]);
  });

  it('creates a campus and reloads', () => {
    store.createCampus({ universityId: 'u1', name: 'Main Campus' }).subscribe();
    httpMock
      .expectOne(
        (r) => r.method === 'POST' && r.url === `${apiBaseUrl}/api/v1/organization/campuses`,
      )
      .flush({
        id: 'c1',
        universityId: 'u1',
        name: 'Main Campus',
        status: 'Active',
        createdAt: '2026-01-01T00:00:00Z',
        version: 1,
      });
    httpMock
      .expectOne(
        (r) => r.method === 'GET' && r.url === `${apiBaseUrl}/api/v1/organization/campuses`,
      )
      .flush(page);
    expect(store.campuses()).toEqual([]);
  });

  it('loads and creates faculties', () => {
    store.loadFaculties('c1');
    httpMock.expectOne((r) => r.url === `${apiBaseUrl}/api/v1/organization/faculties`).flush(page);

    store.createFaculty({ campusId: 'c1', name: 'Engineering', translations: null }).subscribe();
    httpMock
      .expectOne(
        (r) => r.method === 'POST' && r.url === `${apiBaseUrl}/api/v1/organization/faculties`,
      )
      .flush({
        id: 'f1',
        campusId: 'c1',
        name: 'Engineering',
        localizedName: 'Engineering',
        status: 'Active',
        createdAt: '2026-01-01T00:00:00Z',
        version: 1,
      });
    httpMock
      .expectOne(
        (r) => r.method === 'GET' && r.url === `${apiBaseUrl}/api/v1/organization/faculties`,
      )
      .flush(page);
    expect(store.faculties()).toEqual([]);
  });

  it('loads and creates departments', () => {
    store.loadDepartments('f1');
    httpMock
      .expectOne((r) => r.url === `${apiBaseUrl}/api/v1/organization/departments`)
      .flush(page);

    store.createDepartment({ facultyId: 'f1', name: 'CSE', translations: null }).subscribe();
    httpMock
      .expectOne(
        (r) => r.method === 'POST' && r.url === `${apiBaseUrl}/api/v1/organization/departments`,
      )
      .flush({
        id: 'd1',
        facultyId: 'f1',
        name: 'CSE',
        localizedName: 'CSE',
        status: 'Active',
        createdAt: '2026-01-01T00:00:00Z',
        version: 1,
      });
    httpMock
      .expectOne(
        (r) => r.method === 'GET' && r.url === `${apiBaseUrl}/api/v1/organization/departments`,
      )
      .flush(page);
    expect(store.departments()).toEqual([]);
  });

  it('loads and creates programs', () => {
    store.loadPrograms('d1');
    httpMock.expectOne((r) => r.url === `${apiBaseUrl}/api/v1/organization/programs`).flush(page);

    store.createProgram({ departmentId: 'd1', name: 'BSc CSE', translations: null }).subscribe();
    httpMock
      .expectOne(
        (r) => r.method === 'POST' && r.url === `${apiBaseUrl}/api/v1/organization/programs`,
      )
      .flush({
        id: 'p1',
        departmentId: 'd1',
        name: 'BSc CSE',
        localizedName: 'BSc CSE',
        status: 'Active',
        createdAt: '2026-01-01T00:00:00Z',
        version: 1,
      });
    httpMock
      .expectOne(
        (r) => r.method === 'GET' && r.url === `${apiBaseUrl}/api/v1/organization/programs`,
      )
      .flush(page);
    expect(store.programs()).toEqual([]);
  });

  it('loads and creates designations', () => {
    store.loadDesignations();
    httpMock
      .expectOne((r) => r.url === `${apiBaseUrl}/api/v1/organization/designations`)
      .flush(page);

    store.createDesignation({ title: 'Lecturer', translations: null }).subscribe();
    httpMock
      .expectOne(
        (r) => r.method === 'POST' && r.url === `${apiBaseUrl}/api/v1/organization/designations`,
      )
      .flush({
        id: 'des1',
        title: 'Lecturer',
        localizedTitle: 'Lecturer',
        createdAt: '2026-01-01T00:00:00Z',
      });
    httpMock
      .expectOne(
        (r) => r.method === 'GET' && r.url === `${apiBaseUrl}/api/v1/organization/designations`,
      )
      .flush(page);
    expect(store.designations()).toEqual([]);
  });

  it('loads and creates buildings, then loads rooms for one', () => {
    store.loadBuildings('c1');
    httpMock.expectOne((r) => r.url === `${apiBaseUrl}/api/v1/organization/buildings`).flush(page);

    store.createBuilding({ campusId: 'c1', name: 'Block A', code: 'A' }).subscribe();
    httpMock
      .expectOne(
        (r) => r.method === 'POST' && r.url === `${apiBaseUrl}/api/v1/organization/buildings`,
      )
      .flush({
        id: 'b1',
        campusId: 'c1',
        name: 'Block A',
        code: 'A',
        createdAt: '2026-01-01T00:00:00Z',
      });
    httpMock
      .expectOne(
        (r) => r.method === 'GET' && r.url === `${apiBaseUrl}/api/v1/organization/buildings`,
      )
      .flush(page);

    store.loadRoomsForBuilding('b1');
    httpMock
      .expectOne((r) => r.url === `${apiBaseUrl}/api/v1/organization/buildings/b1/rooms`)
      .flush(page);
    expect(store.rooms()).toEqual([]);
  });

  it('creates a room', () => {
    let created: unknown;
    store
      .createRoom({ buildingId: 'b1', name: '101', capacity: 40, roomType: 'Classroom' })
      .subscribe((r) => (created = r));
    httpMock
      .expectOne((r) => r.method === 'POST' && r.url === `${apiBaseUrl}/api/v1/organization/rooms`)
      .flush({
        id: 'room1',
        buildingId: 'b1',
        name: '101',
        capacity: 40,
        roomType: 'Classroom',
        createdAt: '2026-01-01T00:00:00Z',
      });
    expect(created).toEqual({
      id: 'room1',
      buildingId: 'b1',
      name: '101',
      capacity: 40,
      roomType: 'Classroom',
      createdAt: '2026-01-01T00:00:00Z',
    });
  });
});
