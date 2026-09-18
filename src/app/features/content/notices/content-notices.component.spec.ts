import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { UmsToastService } from '@ums/design-system';
import { PermissionsService } from '../../../core/auth/permissions/permissions.service';
import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../../../core/config/app-config';
import { ContentNoticesComponent } from './content-notices.component';

describe('ContentNoticesComponent', () => {
  let httpMock: HttpTestingController;
  let toast: UmsToastService;
  const apiBaseUrl = 'http://localhost:8080';

  const notice = {
    id: 'n-1',
    title: 'Campus closed',
    body: 'Due to weather.',
    audience: ['Public'],
    organizationNodeId: null,
    isUrgent: true,
    status: 'Draft',
    publishAt: null,
    expireAt: null,
    version: 1,
    createdAt: '2026-01-01T00:00:00Z',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContentNoticesComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { ...DEFAULT_APP_CONFIG, apiBaseUrl } },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    toast = TestBed.inject(UmsToastService);
  });

  afterEach(() => httpMock.verify());

  it('does not create a notice without a title or body', () => {
    const fixture = TestBed.createComponent(ContentNoticesComponent);
    fixture.detectChanges();
    fixture.componentInstance['submitCreate']();
    httpMock.expectNone(`${apiBaseUrl}/api/v1/content/notices`);
  });

  it('renders the gated write/publish sections once permitted', () => {
    const permissions = TestBed.inject(PermissionsService);
    permissions.load().subscribe();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/identity/me/permissions`).flush({
      permissions: ['content.notice.write', 'content.notice.read'],
      scopeGrants: [],
    });

    const fixture = TestBed.createComponent(ContentNoticesComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Create notice');
  });

  it('publishes a notice successfully', () => {
    const fixture = TestBed.createComponent(ContentNoticesComponent);
    fixture.detectChanges();
    fixture.componentInstance['loadForEdit']('n-1');
    httpMock.expectOne(`${apiBaseUrl}/api/v1/content/notices/n-1`).flush(notice);

    fixture.componentInstance['transition']('publish');
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/content/notices/n-1/publish`)
      .flush({ ...notice, status: 'Published', version: 2 });
    expect(toast.toasts()[0].message).toBe('Notice published.');
  });

  it('surfaces a version-conflict banner on a 409 and reloads on request', () => {
    const fixture = TestBed.createComponent(ContentNoticesComponent);
    fixture.detectChanges();
    fixture.componentInstance['loadForEdit']('n-1');
    httpMock.expectOne(`${apiBaseUrl}/api/v1/content/notices/n-1`).flush(notice);

    fixture.componentInstance['transition']('publish');
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/content/notices/n-1/publish`)
      .flush({ code: 'version_conflict' }, { status: 409, statusText: 'Conflict' });
    expect(fixture.componentInstance['conflict']()).toBeTrue();

    fixture.componentInstance['reloadAfterConflict']();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/content/notices/n-1`).flush(notice);
    expect(fixture.componentInstance['conflict']()).toBeFalse();
  });
});
