import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../../config/app-config';
import { HasPermissionDirective } from './has-permission.directive';
import { PermissionsService } from './permissions.service';

@Component({
  template: `
    <button *appHasPermission="'identity.user.manage'">Deactivate</button>
    <button *appHasPermission="['a.b.c', 'd.e.f']; mode: 'all'">All-mode button</button>
  `,
  imports: [HasPermissionDirective],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- test-only template host, no members needed
class HostComponent {}

describe('HasPermissionDirective', () => {
  let httpMock: HttpTestingController;
  let permissions: PermissionsService;
  const apiBaseUrl = 'http://localhost:8080';

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { ...DEFAULT_APP_CONFIG, apiBaseUrl } },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    permissions = TestBed.inject(PermissionsService);
  });

  afterEach(() => httpMock.verify());

  function buttons(
    fixture: ReturnType<typeof TestBed.createComponent<HostComponent>>,
  ): NodeListOf<HTMLButtonElement> {
    return fixture.nativeElement.querySelectorAll('button');
  }

  it('renders nothing before any permission session is loaded (fail-closed default)', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    expect(buttons(fixture).length).toBe(0);
  });

  it('renders a single-permission control once the session grants it', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    permissions.load().subscribe();
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/identity/me/permissions`)
      .flush({ permissions: ['identity.user.manage'], scopeGrants: [] });
    fixture.detectChanges();

    expect(buttons(fixture).length).toBe(1);
    expect(buttons(fixture)[0].textContent).toContain('Deactivate');
  });

  it('removes the control from the DOM the instant a revalidation narrows the grant (no reload)', () => {
    const fixture = TestBed.createComponent(HostComponent);
    permissions.load().subscribe();
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/identity/me/permissions`)
      .flush({ permissions: ['identity.user.manage'], scopeGrants: [] });
    fixture.detectChanges();
    expect(buttons(fixture).length).toBe(1);

    permissions.revalidate('identity.user.manage').subscribe();
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/identity/me/permissions`)
      .flush({ permissions: [], scopeGrants: [] });
    fixture.detectChanges();

    expect(buttons(fixture).length).toBe(0);
  });

  it('honors mode="all" for an array requirement', () => {
    const fixture = TestBed.createComponent(HostComponent);
    permissions.load().subscribe();
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/identity/me/permissions`)
      .flush({ permissions: ['a.b.c'], scopeGrants: [] });
    fixture.detectChanges();

    // Only "a.b.c" granted, mode 'all' requires both -- still absent.
    expect(
      Array.from(buttons(fixture)).some((b) => b.textContent?.includes('All-mode')),
    ).toBeFalse();
  });
});
