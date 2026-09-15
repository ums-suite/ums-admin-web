import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideApi } from '@ums/shared';
import { IdentityRolesStore } from './identity-roles.store';

describe('IdentityRolesStore', () => {
  let store: InstanceType<typeof IdentityRolesStore>;
  let httpMock: HttpTestingController;
  const apiBaseUrl = 'http://localhost:8080';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideApi(apiBaseUrl)],
    });
    store = TestBed.inject(IdentityRolesStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('loads roles', () => {
    store.loadRoles();
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/identity/roles`)
      .flush([
        {
          id: 'r1',
          name: 'Registrar',
          description: null,
          permissions: ['a.b.c'],
          requiresMfa: false,
          createdAt: '2026-01-01T00:00:00Z',
        },
      ]);
    expect(store.roles().length).toBe(1);
    expect(store.isLoading()).toBeFalse();
  });

  it('surfaces a roles load error', () => {
    store.loadRoles();
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/identity/roles`)
      .flush(null, { status: 500, statusText: 'Server Error' });
    expect(store.error()).toBeTruthy();
  });

  it('loads the permission catalog', () => {
    store.loadPermissionCatalog();
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/identity/permissions`)
      .flush([
        {
          key: 'identity.user.manage',
          owningModule: 'Identity',
          description: 'Manage users',
          registeredAt: '2026-01-01T00:00:00Z',
        },
      ]);
    expect(store.permissionCatalog().length).toBe(1);
  });

  it('surfaces a permission catalog load error', () => {
    store.loadPermissionCatalog();
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/identity/permissions`)
      .flush(null, { status: 500, statusText: 'Server Error' });
    expect(store.catalogError()).toBeTruthy();
  });

  it('createRole reloads the roles list on success', () => {
    store
      .createRole({
        name: 'Accountant',
        description: null,
        permissions: ['finance.refund.approve'],
      })
      .subscribe();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/identity/roles`).flush({
      id: 'r2',
      name: 'Accountant',
      description: null,
      permissions: ['finance.refund.approve'],
      requiresMfa: false,
      createdAt: '2026-01-01T00:00:00Z',
    });
    httpMock.expectOne(`${apiBaseUrl}/api/v1/identity/roles`).flush([]);
    expect(store.roles()).toEqual([]);
  });

  it('updateRolePermissions reloads the roles list on success', () => {
    store.updateRolePermissions('r1', { permissions: ['a.b.c', 'd.e.f'] }).subscribe();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/identity/roles/r1/permissions`).flush({
      id: 'r1',
      name: 'Registrar',
      description: null,
      permissions: ['a.b.c', 'd.e.f'],
      requiresMfa: false,
      createdAt: '2026-01-01T00:00:00Z',
    });
    httpMock.expectOne(`${apiBaseUrl}/api/v1/identity/roles`).flush([]);
    expect(store.roles()).toEqual([]);
  });
});
