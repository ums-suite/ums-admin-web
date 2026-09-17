import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { LoginPageComponent } from './login-page.component';
import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../../core/config/app-config';

describe('LoginPageComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;
  const apiBaseUrl = 'http://localhost:8080';

  function setup(returnUrl: string | null = null) {
    TestBed.configureTestingModule({
      imports: [LoginPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { ...DEFAULT_APP_CONFIG, apiBaseUrl } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: convertToParamMap(returnUrl ? { returnUrl } : {}) },
          },
        },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(LoginPageComponent);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('shows validation errors and does not submit when fields are blank', () => {
    const fixture = setup();
    fixture.componentInstance['onSubmit']();
    expect(fixture.componentInstance['errors'].identifier).toBeDefined();
    expect(fixture.componentInstance['errors'].password).toBeDefined();
    httpMock.expectNone(`${apiBaseUrl}/api/v1/identity/auth/login`);
  });

  it('logs in and redirects to the default home on success', () => {
    const fixture = setup();
    const navigateSpy = spyOn(router, 'navigateByUrl').and.resolveTo(true);
    fixture.componentInstance['identifier'].set('jdoe');
    fixture.componentInstance['password'].set('secret');

    fixture.componentInstance['onSubmit']();

    httpMock.expectOne(`${apiBaseUrl}/api/v1/identity/auth/login`).flush({
      accessToken: 'a',
      accessTokenExpiresAt: '2026-01-01T00:15:00Z',
      refreshToken: 'r',
      refreshTokenExpiresAt: '2026-01-08T00:00:00Z',
      sessionId: 's',
    });
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/identity/me/permissions`)
      .flush({ permissions: [], scopeGrants: [] });

    expect(navigateSpy).toHaveBeenCalledWith('/dashboard');
  });

  it('redirects to returnUrl when present', () => {
    const fixture = setup('/identity/users');
    const navigateSpy = spyOn(router, 'navigateByUrl').and.resolveTo(true);
    fixture.componentInstance['identifier'].set('jdoe');
    fixture.componentInstance['password'].set('secret');

    fixture.componentInstance['onSubmit']();

    httpMock.expectOne(`${apiBaseUrl}/api/v1/identity/auth/login`).flush({
      accessToken: 'a',
      accessTokenExpiresAt: '2026-01-01T00:15:00Z',
      refreshToken: 'r',
      refreshTokenExpiresAt: '2026-01-08T00:00:00Z',
      sessionId: 's',
    });
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/identity/me/permissions`)
      .flush({ permissions: [], scopeGrants: [] });

    expect(navigateSpy).toHaveBeenCalledWith('/identity/users');
  });

  it('shows a server error message on failed login', () => {
    const fixture = setup();
    fixture.componentInstance['identifier'].set('jdoe');
    fixture.componentInstance['password'].set('wrong');

    fixture.componentInstance['onSubmit']();

    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/identity/auth/login`)
      .flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(fixture.componentInstance['serverErrorMessage']()).toBeTruthy();
  });
});
