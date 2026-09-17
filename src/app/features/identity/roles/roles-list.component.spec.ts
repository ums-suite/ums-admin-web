import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideApi } from '@ums/shared';
import { RolesListComponent } from './roles-list.component';

describe('RolesListComponent', () => {
  let httpMock: HttpTestingController;
  const apiBaseUrl = 'http://localhost:8080';

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RolesListComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideApi(apiBaseUrl)],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function createAndLoad() {
    const fixture = TestBed.createComponent(RolesListComponent);
    fixture.detectChanges();
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/identity/roles`)
      .flush([
        {
          id: 'r1',
          name: 'Registrar',
          description: 'Handles admissions',
          permissions: ['admission.campaign.manage'],
          requiresMfa: true,
          createdAt: '2026-01-01T00:00:00Z',
        },
      ]);
    httpMock.expectOne(`${apiBaseUrl}/api/v1/identity/permissions`).flush([
      {
        key: 'admission.campaign.manage',
        owningModule: 'Admission',
        description: 'Manage campaigns',
        registeredAt: '2026-01-01T00:00:00Z',
      },
      {
        key: 'identity.user.manage',
        owningModule: 'Identity',
        description: 'Manage users',
        registeredAt: '2026-01-01T00:00:00Z',
      },
    ]);
    fixture.detectChanges();
    return fixture;
  }

  it('renders roles with their MFA-required status', () => {
    const fixture = createAndLoad();
    expect(fixture.nativeElement.textContent).toContain('Registrar');
    expect(fixture.nativeElement.textContent).toContain('Required');
  });

  it('groups the permission catalog by owning module', () => {
    const fixture = createAndLoad();
    const groups = fixture.componentInstance['permissionGroups']();
    expect(groups.map((g: { owningModule: string }) => g.owningModule).sort()).toEqual([
      'Admission',
      'Identity',
    ]);
  });

  it('togglePermission adds and removes a key', () => {
    const fixture = createAndLoad();
    fixture.componentInstance['togglePermission']('identity.user.manage');
    expect(
      fixture.componentInstance['selectedPermissions']().has('identity.user.manage'),
    ).toBeTrue();
    fixture.componentInstance['togglePermission']('identity.user.manage');
    expect(
      fixture.componentInstance['selectedPermissions']().has('identity.user.manage'),
    ).toBeFalse();
  });

  it('does not submit createRole with a blank name', () => {
    const fixture = createAndLoad();
    fixture.componentInstance['newRoleName'].set('   ');
    fixture.componentInstance['submitCreateRole']();
    httpMock.expectNone(`${apiBaseUrl}/api/v1/identity/roles`);
  });

  it('creates a role with the selected permissions', () => {
    const fixture = createAndLoad();
    fixture.componentInstance['openCreateModal']();
    fixture.componentInstance['newRoleName'].set('Accountant');
    fixture.componentInstance['togglePermission']('identity.user.manage');

    fixture.componentInstance['submitCreateRole']();

    const req = httpMock.expectOne(`${apiBaseUrl}/api/v1/identity/roles`);
    expect(req.request.body).toEqual({
      name: 'Accountant',
      description: null,
      permissions: ['identity.user.manage'],
    });
    req.flush({
      id: 'r2',
      name: 'Accountant',
      description: null,
      permissions: ['identity.user.manage'],
      requiresMfa: false,
      createdAt: '2026-01-01T00:00:00Z',
    });
    httpMock.expectOne(`${apiBaseUrl}/api/v1/identity/roles`).flush([]);

    expect(fixture.componentInstance['createModalOpen']()).toBeFalse();
  });

  it("edits a role's permissions, pre-populated from the current role", () => {
    const fixture = createAndLoad();
    fixture.componentInstance['openEditModal'](fixture.componentInstance['store'].roles()[0]);
    expect(
      fixture.componentInstance['selectedPermissions']().has('admission.campaign.manage'),
    ).toBeTrue();

    fixture.componentInstance['togglePermission']('identity.user.manage');
    fixture.componentInstance['submitEditPermissions']();

    const req = httpMock.expectOne(`${apiBaseUrl}/api/v1/identity/roles/r1/permissions`);
    expect(req.request.body.permissions.sort()).toEqual(
      ['admission.campaign.manage', 'identity.user.manage'].sort(),
    );
    req.flush({
      id: 'r1',
      name: 'Registrar',
      description: null,
      permissions: [],
      requiresMfa: true,
      createdAt: '2026-01-01T00:00:00Z',
    });
    httpMock.expectOne(`${apiBaseUrl}/api/v1/identity/roles`).flush([]);

    expect(fixture.componentInstance['editModalOpen']()).toBeFalse();
  });
});
