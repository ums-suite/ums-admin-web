import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { firstValueFrom, isObservable } from 'rxjs';
import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../../config/app-config';
import { AUTH_ROUTES } from '../auth-routes.constants';
import { permissionGuard } from './permission.guard';

describe('permissionGuard', () => {
  let httpMock: HttpTestingController;
  let router: Router;
  const apiBaseUrl = 'http://localhost:8080';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { ...DEFAULT_APP_CONFIG, apiBaseUrl } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => httpMock.verify());

  it('allows navigation when the caller holds the required permission', async () => {
    const guard = permissionGuard('organization.faculty.write');
    const resultOrObservable = TestBed.runInInjectionContext(() => guard({} as never, {} as never));
    expect(isObservable(resultOrObservable)).toBeTrue();

    const resultPromise = firstValueFrom(resultOrObservable as never);
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/identity/me/permissions`)
      .flush({ permissions: ['organization.faculty.write'], scopeGrants: [] });

    expect(await resultPromise).toBeTrue();
  });

  it('redirects to /forbidden when the caller lacks the required permission', async () => {
    const guard = permissionGuard('identity.role.manage');
    const resultOrObservable = TestBed.runInInjectionContext(() => guard({} as never, {} as never));
    const resultPromise = firstValueFrom(resultOrObservable as never);
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/identity/me/permissions`)
      .flush({ permissions: [], scopeGrants: [] });

    const result = await resultPromise;
    const tree = router.serializeUrl(result as ReturnType<Router['createUrlTree']>);
    expect(tree).toContain(AUTH_ROUTES.forbidden);
  });

  it('redirects to /forbidden when the permission endpoint is unavailable (fail-closed)', async () => {
    const guard = permissionGuard('identity.role.manage');
    const resultOrObservable = TestBed.runInInjectionContext(() => guard({} as never, {} as never));
    const resultPromise = firstValueFrom(resultOrObservable as never);
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/identity/me/permissions`)
      .flush(null, { status: 404, statusText: 'Not Found' });

    const result = await resultPromise;
    expect(result).not.toBe(true);
  });

  it('supports an array of permissions evaluated as "any of"', async () => {
    const guard = permissionGuard(['a.b.c', 'd.e.f']);
    const resultOrObservable = TestBed.runInInjectionContext(() => guard({} as never, {} as never));
    const resultPromise = firstValueFrom(resultOrObservable as never);
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/identity/me/permissions`)
      .flush({ permissions: ['d.e.f'], scopeGrants: [] });

    expect(await resultPromise).toBeTrue();
  });
});
