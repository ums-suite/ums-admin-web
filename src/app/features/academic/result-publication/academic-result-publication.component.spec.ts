import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideApi } from '@ums/shared';
import { UmsToastService } from '@ums/design-system';
import { ConfirmationService } from '../../../shared/confirmation/confirmation.service';
import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../../../core/config/app-config';
import { AcademicResultPublicationComponent } from './academic-result-publication.component';

describe('AcademicResultPublicationComponent', () => {
  let httpMock: HttpTestingController;
  let confirmation: ConfirmationService;
  let toast: UmsToastService;
  const apiBaseUrl = 'http://localhost:8080';
  const permissionsUrl = `${apiBaseUrl}/api/v1/identity/me/permissions`;

  const rp = (status: string) => ({
    id: 'rp-1',
    courseOfferingId: 'off-1',
    status,
    calculatedAt: null,
    rejectedAt: null,
    rejectionReason: null,
    lockedAt: null,
    approvedAt: null,
    publishedAt: null,
    archivedAt: null,
    correctionCount: 0,
  });

  function grantPermissions(): void {
    httpMock
      .expectOne(permissionsUrl)
      .flush({
        permissions: ['academic.grade.lock', 'academic.result.approve', 'academic.result.publish'],
        scopeGrants: [],
      });
  }

  function denyPermissions(): void {
    httpMock.expectOne(permissionsUrl).flush({ permissions: [], scopeGrants: [] });
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AcademicResultPublicationComponent],
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

  it('starts the wizard at the chosen starting stage', () => {
    const fixture = TestBed.createComponent(AcademicResultPublicationComponent);
    fixture.detectChanges();
    fixture.componentInstance['courseOfferingId'].set('off-1');
    fixture.componentInstance['startStageIndex'].set('1');
    fixture.componentInstance['startWizard']();
    grantPermissions();

    expect(fixture.componentInstance['wizard']()?.currentStep().id).toBe('approve');
  });

  it('does not start a wizard without a course offering id', () => {
    const fixture = TestBed.createComponent(AcademicResultPublicationComponent);
    fixture.detectChanges();
    fixture.componentInstance['startWizard']();
    expect(fixture.componentInstance['wizard']()).toBeNull();
  });

  it('submits the Lock step end to end with confirmation and audit-linked success', () => {
    const fixture = TestBed.createComponent(AcademicResultPublicationComponent);
    fixture.detectChanges();
    fixture.componentInstance['courseOfferingId'].set('off-1');
    fixture.componentInstance['startWizard']();
    grantPermissions();

    fixture.componentInstance['confirmAndSubmitCurrentStep']();
    confirmation.confirm('reviewed');

    httpMock.expectOne(`${apiBaseUrl}/api/v1/academic/results/off-1/lock`).flush(rp('Verified'));
    grantPermissions();
    httpMock
      .expectOne((r) => r.url === `${apiBaseUrl}/api/v1/audit/entries`)
      .flush({ items: [{ id: 'audit-1' }] });

    expect(toast.toasts()[0].message).toContain('audit entry audit-1');
    expect(fixture.componentInstance['store'].currentResult()?.status).toBe('Verified');
    expect(fixture.componentInstance['wizard']()?.currentStep().id).toBe('approve');
  });

  it('renders the revoked terminal state on a denied live re-authorization', () => {
    const fixture = TestBed.createComponent(AcademicResultPublicationComponent);
    fixture.detectChanges();
    fixture.componentInstance['courseOfferingId'].set('off-1');
    fixture.componentInstance['startWizard']();
    denyPermissions();

    expect(fixture.componentInstance['wizard']()?.status()).toBe('revoked');
  });

  it('renders the version-conflict banner (not a generic error) on a 409 batch-state conflict', () => {
    const fixture = TestBed.createComponent(AcademicResultPublicationComponent);
    fixture.detectChanges();
    fixture.componentInstance['courseOfferingId'].set('off-1');
    fixture.componentInstance['startWizard']();
    grantPermissions();

    fixture.componentInstance['confirmAndSubmitCurrentStep']();
    confirmation.confirm('go');
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/academic/results/off-1/lock`)
      .flush(
        { title: "CourseOffering 'off-1''s grade batch is already 'Verified'" },
        { status: 409, statusText: 'Conflict' },
      );

    const wizard = fixture.componentInstance['wizard']();
    expect(wizard?.status()).toBe('error');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('already');
  });

  it('reload after a conflict clears the wizard so the admin can start over', () => {
    const fixture = TestBed.createComponent(AcademicResultPublicationComponent);
    fixture.detectChanges();
    fixture.componentInstance['courseOfferingId'].set('off-1');
    fixture.componentInstance['startWizard']();
    grantPermissions();

    fixture.componentInstance['reloadAfterConflict']();
    expect(fixture.componentInstance['wizard']()).toBeNull();
  });

  it('rejects a batch to Faculty end to end', () => {
    const fixture = TestBed.createComponent(AcademicResultPublicationComponent);
    fixture.detectChanges();
    fixture.componentInstance['courseOfferingId'].set('off-1');

    fixture.componentInstance['rejectToFaculty']();
    confirmation.confirm('missing scores');

    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/academic/results/off-1/reject`)
      .flush(rp('Calculated'));
    httpMock
      .expectOne((r) => r.url === `${apiBaseUrl}/api/v1/audit/entries`)
      .flush({ items: [{ id: 'audit-2' }] });

    expect(toast.toasts()[0].message).toContain('audit entry audit-2');
    expect(fixture.componentInstance['store'].currentResult()?.status).toBe('Calculated');
  });

  it('does not reject without a course offering id', () => {
    const fixture = TestBed.createComponent(AcademicResultPublicationComponent);
    fixture.detectChanges();
    fixture.componentInstance['rejectToFaculty']();
    expect(confirmation.current()).toBeNull();
  });

  it('leaveRevokedFlow clears the wizard', () => {
    const fixture = TestBed.createComponent(AcademicResultPublicationComponent);
    fixture.detectChanges();
    fixture.componentInstance['courseOfferingId'].set('off-1');
    fixture.componentInstance['startWizard']();
    denyPermissions();

    fixture.componentInstance['leaveRevokedFlow']();
    expect(fixture.componentInstance['wizard']()).toBeNull();
  });
});
