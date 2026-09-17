import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../../config/app-config';
import { PermissionsService } from './permissions.service';

describe('PermissionsService', () => {
  let service: PermissionsService;
  let httpMock: HttpTestingController;
  const apiBaseUrl = 'http://localhost:8080';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { ...DEFAULT_APP_CONFIG, apiBaseUrl } },
      ],
    });
    service = TestBed.inject(PermissionsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('starts unloaded with zero permissions and zero scope grants', () => {
    expect(service.session().source).toBe('unloaded');
    expect(service.grantedPermissions()).toEqual([]);
    expect(service.hasPermission('identity.user.manage')).toBeFalse();
  });

  it('load() populates the session from a successful server response', () => {
    let resolved: import('./permission.types').PermissionSession | undefined;
    service.load().subscribe((s) => (resolved = s));

    httpMock.expectOne(`${apiBaseUrl}/api/v1/identity/me/permissions`).flush({
      permissions: ['identity.user.manage', 'organization.faculty.write'],
      scopeGrants: [
        { assignmentId: 'a1', roleId: 'r1', roleName: 'Registrar', organizationNodeId: 'campus-1' },
      ],
    });

    expect(resolved?.source).toBe('server');
    expect(service.hasPermission('identity.user.manage')).toBeTrue();
    expect(service.hasPermission('finance.refund.approve')).toBeFalse();
    expect(service.scopeGrants()).toEqual([
      { assignmentId: 'a1', roleId: 'r1', roleName: 'Registrar', organizationNodeId: 'campus-1' },
    ]);
  });

  it('defaults missing fields on a partial server response to empty, never undefined', () => {
    service.load().subscribe();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/identity/me/permissions`).flush({});

    expect(service.grantedPermissions()).toEqual([]);
    expect(service.scopeGrants()).toEqual([]);
  });

  it('fails closed (zero permissions, source "unavailable") when the endpoint 404s -- the documented backend gap', () => {
    let resolved: import('./permission.types').PermissionSession | undefined;
    service.load().subscribe((s) => (resolved = s));

    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/identity/me/permissions`)
      .flush(null, { status: 404, statusText: 'Not Found' });

    expect(resolved?.source).toBe('unavailable');
    expect(service.isDegraded()).toBeTrue();
    expect(service.hasPermission('identity.user.manage')).toBeFalse();
  });

  it('fails closed on a network-level error too', () => {
    service.load().subscribe();
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/identity/me/permissions`)
      .error(new ProgressEvent('network error'));

    expect(service.isDegraded()).toBeTrue();
    expect(service.grantedPermissions()).toEqual([]);
  });

  it('revalidate() re-fetches from the server rather than trusting the cache', () => {
    service.load().subscribe();
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/identity/me/permissions`)
      .flush({ permissions: ['identity.user.manage'], scopeGrants: [] });
    expect(service.hasPermission('identity.user.manage')).toBeTrue();

    // The permission was revoked server-side mid-session -- revalidate must reflect that, not
    // the stale cached "true" (edge-cases.md "Super Admin revokes a role mid-flow").
    let revalidated: boolean | undefined;
    service.revalidate('identity.user.manage').subscribe((v) => (revalidated = v));
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/identity/me/permissions`)
      .flush({ permissions: [], scopeGrants: [] });

    expect(revalidated).toBeFalse();
    expect(service.hasPermission('identity.user.manage')).toBeFalse();
  });

  it('revalidate() accepts an array and checks hasAnyPermission semantics', () => {
    let revalidated: boolean | undefined;
    service.revalidate(['a.b.c', 'd.e.f']).subscribe((v) => (revalidated = v));
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/identity/me/permissions`)
      .flush({ permissions: ['d.e.f'], scopeGrants: [] });

    expect(revalidated).toBeTrue();
  });

  it('hasAnyPermission / hasAllPermissions reflect the cached session', () => {
    service.load().subscribe();
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/identity/me/permissions`)
      .flush({ permissions: ['a.b.c', 'd.e.f'], scopeGrants: [] });

    expect(service.hasAnyPermission(['x.y.z', 'a.b.c'])).toBeTrue();
    expect(service.hasAllPermissions(['a.b.c', 'd.e.f'])).toBeTrue();
    expect(service.hasAllPermissions(['a.b.c', 'x.y.z'])).toBeFalse();
  });
});
