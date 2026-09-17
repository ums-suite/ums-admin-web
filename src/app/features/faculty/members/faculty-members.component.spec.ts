import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideApi } from '@ums/shared';
import { UmsToastService } from '@ums/design-system';
import { ConfirmationService } from '../../../shared/confirmation/confirmation.service';
import { PermissionsService } from '../../../core/auth/permissions/permissions.service';
import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../../../core/config/app-config';
import { FacultyMembersComponent } from './faculty-members.component';

describe('FacultyMembersComponent', () => {
  let httpMock: HttpTestingController;
  let confirmation: ConfirmationService;
  let toast: UmsToastService;
  const apiBaseUrl = 'http://localhost:8080';

  const member = {
    id: 'fac-1',
    userId: 'user-1',
    employeeId: 'EMP-1',
    departmentId: 'dept-1',
    designationId: 'desig-1',
    employmentType: 'FullTime',
    status: 'Active',
    isDepartmentHead: false,
    contactEmail: null,
    contactPhone: null,
    joiningDate: '2020-01-01',
    createdAt: '2020-01-01T00:00:00Z',
    version: 1,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FacultyMembersComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApi(apiBaseUrl),
        provideRouter([]),
        { provide: APP_CONFIG, useValue: { ...DEFAULT_APP_CONFIG, apiBaseUrl } },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    confirmation = TestBed.inject(ConfirmationService);
    toast = TestBed.inject(UmsToastService);
  });

  afterEach(() => httpMock.verify());

  it('loads a member by id', () => {
    const fixture = TestBed.createComponent(FacultyMembersComponent);
    fixture.detectChanges();
    fixture.componentInstance['lookupMemberId'].set('fac-1');
    fixture.componentInstance['loadMember']();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/faculty/members/fac-1`).flush(member);
    expect(fixture.componentInstance['store'].currentMember()).toEqual(member);
  });

  it('updates employment details end to end with an audit-linked success toast', () => {
    const fixture = TestBed.createComponent(FacultyMembersComponent);
    fixture.detectChanges();
    fixture.componentInstance['lookupMemberId'].set('fac-1');
    fixture.componentInstance['loadMember']();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/faculty/members/fac-1`).flush(member);

    fixture.componentInstance['editDesignationId'].set('desig-2');
    fixture.componentInstance['submitEmploymentUpdate']();
    confirmation.confirm('promotion');

    const req = httpMock.expectOne(`${apiBaseUrl}/api/v1/faculty/members/fac-1`);
    expect(req.request.body.designationId).toBe('desig-2');
    req.flush({ ...member, designationId: 'desig-2', version: 2 });
    httpMock
      .expectOne((r) => r.url === `${apiBaseUrl}/api/v1/audit/entries`)
      .flush({ items: [{ id: 'audit-1' }] });

    expect(toast.toasts()[0].message).toContain('audit entry audit-1');
  });

  it('renders the version-conflict banner on a 409 employment-details conflict, not a raw error', () => {
    const fixture = TestBed.createComponent(FacultyMembersComponent);
    fixture.detectChanges();
    fixture.componentInstance['lookupMemberId'].set('fac-1');
    fixture.componentInstance['loadMember']();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/faculty/members/fac-1`).flush(member);

    fixture.componentInstance['submitEmploymentUpdate']();
    confirmation.confirm('go');
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/faculty/members/fac-1`)
      .flush({ currentState: { ...member, version: 5 } }, { status: 409, statusText: 'Conflict' });

    expect(fixture.componentInstance['conflict']()?.currentState?.version).toBe(5);
  });

  it('changes status end to end', () => {
    const fixture = TestBed.createComponent(FacultyMembersComponent);
    fixture.detectChanges();
    fixture.componentInstance['lookupMemberId'].set('fac-1');
    fixture.componentInstance['loadMember']();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/faculty/members/fac-1`).flush(member);

    fixture.componentInstance['newStatus'].set('OnLeave');
    fixture.componentInstance['submitStatusChange']();
    confirmation.confirm('going on leave');

    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/faculty/members/fac-1/status`)
      .flush({ ...member, status: 'OnLeave', version: 2 });
    httpMock
      .expectOne((r) => r.url === `${apiBaseUrl}/api/v1/audit/entries`)
      .flush({ items: [{ id: 'audit-2' }] });

    expect(toast.toasts()[0].message).toContain('audit entry audit-2');
  });

  it('renders the department list and gated edit/status sections once permitted', () => {
    const permissions = TestBed.inject(PermissionsService);
    permissions.load().subscribe();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/identity/me/permissions`).flush({
      permissions: ['faculty.member.manage'],
      scopeGrants: [],
    });

    const fixture = TestBed.createComponent(FacultyMembersComponent);
    fixture.detectChanges();

    fixture.componentInstance['lookupDepartmentId'].set('dept-1');
    fixture.componentInstance['loadMembersByDepartment']();
    httpMock
      .expectOne((r) => r.url === `${apiBaseUrl}/api/v1/faculty/members/`)
      .flush({ items: [member], totalCount: 1, skip: 0, take: 50 });

    fixture.componentInstance['lookupMemberId'].set('fac-1');
    fixture.componentInstance['loadMember']();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/faculty/members/fac-1`).flush(member);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.faculty-members__card').length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('EMP-1');
  });

  it('navigates to course assignments and leave requests with the member id as a query param', () => {
    const fixture = TestBed.createComponent(FacultyMembersComponent);
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate');

    fixture.componentInstance['goToCourseAssignments']('fac-1');
    expect(navigateSpy).toHaveBeenCalledWith(['/faculty/course-assignments'], {
      queryParams: { facultyMemberId: 'fac-1' },
    });

    fixture.componentInstance['goToLeaveRequests']('fac-1');
    expect(navigateSpy).toHaveBeenCalledWith(['/faculty/leave-requests'], {
      queryParams: { facultyMemberId: 'fac-1' },
    });
  });

  it('does not submit an update without a loaded member', () => {
    const fixture = TestBed.createComponent(FacultyMembersComponent);
    fixture.detectChanges();
    fixture.componentInstance['submitEmploymentUpdate']();
    expect(confirmation.current()).toBeNull();
  });
});
