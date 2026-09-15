import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideApi } from '@ums/shared';
import { IdentityUsersStore } from './identity-users.store';

describe('IdentityUsersStore', () => {
  let store: InstanceType<typeof IdentityUsersStore>;
  let httpMock: HttpTestingController;
  const apiBaseUrl = 'http://localhost:8080';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideApi(apiBaseUrl)],
    });
    store = TestBed.inject(IdentityUsersStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('loads a page of users', () => {
    store.loadUsers();
    expect(store.isLoading()).toBeTrue();

    httpMock.expectOne(`${apiBaseUrl}/api/v1/identity/users?skip=0&take=20`).flush({
      items: [
        {
          id: 'u1',
          username: 'jdoe',
          email: 'j@x.com',
          displayName: 'J Doe',
          mobile: null,
          universityId: null,
          status: 'Active',
          createdAt: '2026-01-01T00:00:00Z',
        },
      ],
      totalCount: 1,
      skip: 0,
      take: 20,
    });

    expect(store.isLoading()).toBeFalse();
    expect(store.users().length).toBe(1);
    expect(store.totalCount()).toBe(1);
  });

  it('surfaces an error message on a failed load', () => {
    store.loadUsers();
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/identity/users?skip=0&take=20`)
      .flush(null, { status: 500, statusText: 'Server Error' });

    expect(store.isLoading()).toBeFalse();
    expect(store.error()).toBeTruthy();
  });

  it('createUser reloads the list on success', () => {
    store
      .createUser({
        username: 'new',
        email: 'n@x.com',
        givenName: 'N',
        familyName: 'U',
        givenNameBn: null,
        familyNameBn: null,
        mobile: null,
        universityId: null,
        password: 'p',
      })
      .subscribe();
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/identity/users`)
      .flush({
        id: 'u2',
        username: 'new',
        email: 'n@x.com',
        displayName: 'N U',
        mobile: null,
        universityId: null,
        status: 'Active',
        createdAt: '2026-01-01T00:00:00Z',
      });

    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/identity/users?skip=0&take=20`)
      .flush({ items: [], totalCount: 0, skip: 0, take: 20 });
    expect(store.isLoading()).toBeFalse();
  });

  it('changeUserStatus reloads the list on success', () => {
    store.changeUserStatus('u1', 'Suspended').subscribe();
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/identity/users/u1/status`)
      .flush({
        id: 'u1',
        username: 'jdoe',
        email: 'j@x.com',
        displayName: 'J Doe',
        mobile: null,
        universityId: null,
        status: 'Suspended',
        createdAt: '2026-01-01T00:00:00Z',
      });

    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/identity/users?skip=0&take=20`)
      .flush({ items: [], totalCount: 0, skip: 0, take: 20 });
    expect(store.users()).toEqual([]);
  });

  it('loads and revokes sessions', () => {
    store.loadSessions();
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/identity/sessions`)
      .flush([
        {
          id: 's1',
          userAgent: 'Chrome',
          createdFromIp: '1.2.3.4',
          createdAt: '2026-01-01T00:00:00Z',
          lastUsedAt: '2026-01-01T00:00:00Z',
          status: 'Active',
          isCurrent: true,
        },
      ]);
    expect(store.sessions().length).toBe(1);

    store.revokeSession('s1').subscribe();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/identity/sessions/s1`).flush({});
    httpMock.expectOne(`${apiBaseUrl}/api/v1/identity/sessions`).flush([]);
    expect(store.sessions().length).toBe(0);
  });

  it('surfaces a sessions load error', () => {
    store.loadSessions();
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/identity/sessions`)
      .flush(null, { status: 500, statusText: 'Server Error' });
    expect(store.sessionsError()).toBeTruthy();
  });

  it('tracks role assignments made this session, per user, and can revoke them', () => {
    expect(store.assignmentsFor('u1')).toEqual([]);

    store.assignRole('u1', { roleId: 'r1', organizationNodeId: null }).subscribe();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/identity/users/u1/roles`).flush({
      assignmentId: 'a1',
      roleId: 'r1',
      roleName: 'Registrar',
      organizationNodeId: null,
      assignedAt: '2026-01-01T00:00:00Z',
    });

    expect(store.assignmentsFor('u1').length).toBe(1);

    store.revokeRoleAssignment('u1', 'a1').subscribe();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/identity/users/u1/roles/a1`).flush({});

    expect(store.assignmentsFor('u1')).toEqual([]);
  });

  it('keeps role assignments isolated per user', () => {
    store.assignRole('u1', { roleId: 'r1', organizationNodeId: null }).subscribe();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/identity/users/u1/roles`).flush({
      assignmentId: 'a1',
      roleId: 'r1',
      roleName: 'Registrar',
      organizationNodeId: null,
      assignedAt: '2026-01-01T00:00:00Z',
    });
    store.assignRole('u2', { roleId: 'r2', organizationNodeId: null }).subscribe();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/identity/users/u2/roles`).flush({
      assignmentId: 'a2',
      roleId: 'r2',
      roleName: 'Accountant',
      organizationNodeId: null,
      assignedAt: '2026-01-01T00:00:00Z',
    });

    expect(store.assignmentsFor('u1').map((a) => a.assignmentId)).toEqual(['a1']);
    expect(store.assignmentsFor('u2').map((a) => a.assignmentId)).toEqual(['a2']);
  });
});
