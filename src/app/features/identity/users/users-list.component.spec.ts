import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideApi } from '@ums/shared';
import { UmsToastService } from '@ums/design-system';
import { ConfirmationService } from '../../../shared/confirmation/confirmation.service';
import { PermissionsService } from '../../../core/auth/permissions/permissions.service';
import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../../../core/config/app-config';
import { UsersListComponent } from './users-list.component';

describe('UsersListComponent', () => {
  let httpMock: HttpTestingController;
  let confirmation: ConfirmationService;
  let toast: UmsToastService;
  let permissions: PermissionsService;
  const apiBaseUrl = 'http://localhost:8080';

  const userDto = {
    id: 'u1',
    username: 'jdoe',
    email: 'j@x.com',
    displayName: 'J Doe',
    mobile: null,
    universityId: null,
    status: 'Active',
    createdAt: '2026-01-01T00:00:00Z',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UsersListComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApi(apiBaseUrl),
        { provide: APP_CONFIG, useValue: { ...DEFAULT_APP_CONFIG, apiBaseUrl } },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    confirmation = TestBed.inject(ConfirmationService);
    toast = TestBed.inject(UmsToastService);
    permissions = TestBed.inject(PermissionsService);
  });

  afterEach(() => httpMock.verify());

  function createAndLoad() {
    permissions.load().subscribe();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/identity/me/permissions`).flush({
      permissions: ['identity.user.manage', 'identity.role.assign'],
      scopeGrants: [],
    });

    const fixture = TestBed.createComponent(UsersListComponent);
    fixture.detectChanges();
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/identity/users?skip=0&take=20`)
      .flush({ items: [userDto], totalCount: 1, skip: 0, take: 20 });
    fixture.detectChanges();
    return fixture;
  }

  it('loads users on init', () => {
    const fixture = createAndLoad();
    expect(fixture.componentInstance['store'].users().length).toBe(1);
  });

  it('renders a row per user with a deactivate action', () => {
    const fixture = createAndLoad();
    expect(fixture.nativeElement.textContent).toContain('jdoe');
    expect(fixture.nativeElement.textContent).toContain('Deactivate');
  });

  it('switching to the sessions tab loads sessions', () => {
    const fixture = createAndLoad();
    fixture.componentInstance['onTabChange'](1);
    httpMock.expectOne(`${apiBaseUrl}/api/v1/identity/sessions`).flush([]);
    expect(fixture.componentInstance['store'].sessions()).toEqual([]);
  });

  it('does not submit createUser when required fields are missing', () => {
    const fixture = createAndLoad();
    fixture.componentInstance['submitCreateUser']();
    expect(confirmation.current()).toBeNull();
  });

  it('creates a user end to end: confirm reason -> POST create -> audit lookup -> success toast', () => {
    const fixture = createAndLoad();
    fixture.componentInstance['newUser'].set({
      username: 'new',
      email: 'n@x.com',
      givenName: 'N',
      familyName: 'U',
      password: 'secret',
    });

    fixture.componentInstance['submitCreateUser']();
    expect(confirmation.current()?.title).toBe('Create user account');

    confirmation.confirm('Onboarding a new registrar');

    httpMock.expectOne(`${apiBaseUrl}/api/v1/identity/users`).flush({
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
      .flush({ items: [userDto], totalCount: 1, skip: 0, take: 20 });
    httpMock
      .expectOne((req) => req.url === `${apiBaseUrl}/api/v1/audit/entries`)
      .flush({ items: [{ id: 'audit-1' }] });

    expect(toast.toasts().length).toBe(1);
    expect(toast.toasts()[0].message).toContain('audit entry audit-1');
    expect(fixture.componentInstance['createModalOpen']()).toBeFalse();
  });

  it('deactivates a user end to end and shows the audit-linked success toast', () => {
    const fixture = createAndLoad();

    fixture.componentInstance['deactivateOrReactivate'](userDto);
    expect(confirmation.current()?.title).toBe('Deactivate user');
    confirmation.confirm('No longer employed');

    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/identity/users/u1/status`)
      .flush({ ...userDto, status: 'Suspended' });
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/identity/users?skip=0&take=20`)
      .flush({ items: [{ ...userDto, status: 'Suspended' }], totalCount: 1, skip: 0, take: 20 });
    httpMock
      .expectOne((req) => req.url === `${apiBaseUrl}/api/v1/audit/entries`)
      .flush({ items: [{ id: 'audit-2' }] });

    expect(toast.toasts()[0].message).toContain('Suspended');
    expect(toast.toasts()[0].message).toContain('audit entry audit-2');
  });

  it('shows an error toast, never a success one, when the audit entry cannot be confirmed', () => {
    const fixture = createAndLoad();

    fixture.componentInstance['deactivateOrReactivate'](userDto);
    confirmation.confirm('No longer employed');

    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/identity/users/u1/status`)
      .flush({ ...userDto, status: 'Suspended' });
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/identity/users?skip=0&take=20`)
      .flush({ items: [], totalCount: 0, skip: 0, take: 20 });
    httpMock
      .expectOne((req) => req.url === `${apiBaseUrl}/api/v1/audit/entries`)
      .flush({ items: [] });

    expect(toast.toasts().length).toBe(1);
    expect(toast.toasts()[0].variant).toBe('danger');
  });

  it('opens the assign-role modal and loads the roles catalog', () => {
    const fixture = createAndLoad();

    fixture.componentInstance['openAssignRoleModal'](userDto);
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/identity/roles`)
      .flush([
        {
          id: 'r1',
          name: 'Registrar',
          description: null,
          permissions: [],
          requiresMfa: false,
          createdAt: '2026-01-01T00:00:00Z',
        },
      ]);

    expect(fixture.componentInstance['assignRoleModalOpen']()).toBeTrue();
    expect(fixture.componentInstance['roleOptions']()).toEqual([
      { value: 'r1', label: 'Registrar' },
    ]);
  });

  it('assigns a role to the target user', () => {
    const fixture = createAndLoad();
    fixture.componentInstance['openAssignRoleModal'](userDto);
    httpMock.expectOne(`${apiBaseUrl}/api/v1/identity/roles`).flush([]);
    fixture.componentInstance['assignRoleForm'].set({ roleId: 'r1', organizationNodeId: '' });

    fixture.componentInstance['submitAssignRole']();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/identity/users/u1/roles`).flush({
      assignmentId: 'a1',
      roleId: 'r1',
      roleName: 'Registrar',
      organizationNodeId: null,
      assignedAt: '2026-01-01T00:00:00Z',
    });

    expect(fixture.componentInstance['assignRoleModalOpen']()).toBeFalse();
    expect(fixture.componentInstance['store'].assignmentsFor('u1').length).toBe(1);
  });

  it('does not submit assignRole without a selected role', () => {
    const fixture = createAndLoad();
    fixture.componentInstance['openAssignRoleModal'](userDto);
    httpMock.expectOne(`${apiBaseUrl}/api/v1/identity/roles`).flush([]);

    fixture.componentInstance['submitAssignRole']();
    httpMock.expectNone(`${apiBaseUrl}/api/v1/identity/users/u1/roles`);
    expect(fixture.componentInstance['assignRoleModalOpen']()).toBeTrue();
  });
});
