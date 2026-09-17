import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideApi } from '@ums/shared';
import { UmsToastService } from '@ums/design-system';
import { ConfirmationService } from '../../../shared/confirmation/confirmation.service';
import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../../../core/config/app-config';
import { AdmissionResultPublicationComponent } from './admission-result-publication.component';

describe('AdmissionResultPublicationComponent', () => {
  let httpMock: HttpTestingController;
  let confirmation: ConfirmationService;
  let toast: UmsToastService;
  const apiBaseUrl = 'http://localhost:8080';
  const permissionsUrl = `${apiBaseUrl}/api/v1/identity/me/permissions`;

  const draftResult = {
    id: 'result-1',
    campaignId: 'campaign-1',
    meritListId: 'merit-1',
    status: 'Draft',
    entries: [],
  };

  function grantPermissions(): void {
    httpMock
      .expectOne(permissionsUrl)
      .flush({ permissions: ['admission.result.publish'], scopeGrants: [] });
  }

  function denyPermissions(): void {
    httpMock.expectOne(permissionsUrl).flush({ permissions: [], scopeGrants: [] });
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdmissionResultPublicationComponent],
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

  it('loads the current result and starts the wizard at the Calculate step for a Draft result', () => {
    const fixture = TestBed.createComponent(AdmissionResultPublicationComponent);
    fixture.detectChanges();
    fixture.componentInstance['lookupCampaignId'].set('campaign-1');
    fixture.componentInstance['loadCurrentResult']();
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/admission/results/by-campaign/campaign-1`)
      .flush(draftResult);

    fixture.componentInstance['startWizard']();
    grantPermissions();

    const wizard = fixture.componentInstance['wizard']();
    expect(wizard?.currentStep().id).toBe('calculate');
    expect(wizard?.status()).toBe('ready');
  });

  it('starts the wizard at the Approve step when the result is already Verified', () => {
    const fixture = TestBed.createComponent(AdmissionResultPublicationComponent);
    fixture.detectChanges();
    fixture.componentInstance['lookupCampaignId'].set('campaign-1');
    fixture.componentInstance['loadCurrentResult']();
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/admission/results/by-campaign/campaign-1`)
      .flush({ ...draftResult, status: 'Verified' });

    fixture.componentInstance['startWizard']();
    grantPermissions();

    expect(fixture.componentInstance['wizard']()?.currentStep().id).toBe('approve');
  });

  it('does not start a wizard when the result is already Published (terminal for the linear flow)', () => {
    const fixture = TestBed.createComponent(AdmissionResultPublicationComponent);
    fixture.detectChanges();
    fixture.componentInstance['lookupCampaignId'].set('campaign-1');
    fixture.componentInstance['loadCurrentResult']();
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/admission/results/by-campaign/campaign-1`)
      .flush({ ...draftResult, status: 'Published' });

    fixture.componentInstance['startWizard']();
    expect(fixture.componentInstance['wizard']()).toBeNull();
  });

  it('submits the Calculate step end to end: confirm, mutate, re-authorize next step, confirm audit', () => {
    const fixture = TestBed.createComponent(AdmissionResultPublicationComponent);
    fixture.detectChanges();
    fixture.componentInstance['lookupCampaignId'].set('campaign-1');
    fixture.componentInstance['loadCurrentResult']();
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/admission/results/by-campaign/campaign-1`)
      .flush(draftResult);
    fixture.componentInstance['startWizard']();
    grantPermissions();

    fixture.componentInstance['confirmAndSubmitCurrentStep']();
    expect(confirmation.current()?.title).toContain('Calculate Result');
    confirmation.confirm('because it is time');

    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/admission/results/campaign-1/calculate`)
      .flush({ ...draftResult, status: 'Calculated' });
    grantPermissions(); // re-authorization for the next step (Lock)
    httpMock
      .expectOne((r) => r.url === `${apiBaseUrl}/api/v1/audit/entries`)
      .flush({ items: [{ id: 'audit-1' }] });

    expect(toast.toasts()[0].message).toContain('audit entry audit-1');
    const wizard = fixture.componentInstance['wizard']();
    expect(wizard?.currentStep().id).toBe('lock');
    expect(wizard?.status()).toBe('ready');
  });

  it('renders the revoked terminal state when the live re-authorization check denies the permission', () => {
    const fixture = TestBed.createComponent(AdmissionResultPublicationComponent);
    fixture.detectChanges();
    fixture.componentInstance['lookupCampaignId'].set('campaign-1');
    fixture.componentInstance['loadCurrentResult']();
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/admission/results/by-campaign/campaign-1`)
      .flush(draftResult);

    fixture.componentInstance['startWizard']();
    denyPermissions();

    expect(fixture.componentInstance['wizard']()?.status()).toBe('revoked');
  });

  it('renders the revoked terminal state when the step submit itself 403s', () => {
    const fixture = TestBed.createComponent(AdmissionResultPublicationComponent);
    fixture.detectChanges();
    fixture.componentInstance['lookupCampaignId'].set('campaign-1');
    fixture.componentInstance['loadCurrentResult']();
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/admission/results/by-campaign/campaign-1`)
      .flush(draftResult);
    fixture.componentInstance['startWizard']();
    grantPermissions();

    fixture.componentInstance['confirmAndSubmitCurrentStep']();
    confirmation.confirm('go');
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/admission/results/campaign-1/calculate`)
      .flush({ title: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });

    expect(fixture.componentInstance['wizard']()?.status()).toBe('revoked');
  });

  it('leaveRevokedFlow clears the wizard', () => {
    const fixture = TestBed.createComponent(AdmissionResultPublicationComponent);
    fixture.detectChanges();
    fixture.componentInstance['lookupCampaignId'].set('campaign-1');
    fixture.componentInstance['loadCurrentResult']();
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/admission/results/by-campaign/campaign-1`)
      .flush(draftResult);
    fixture.componentInstance['startWizard']();
    denyPermissions();

    fixture.componentInstance['leaveRevokedFlow']();
    expect(fixture.componentInstance['wizard']()).toBeNull();
  });

  it('reenters a Published result for correction end to end', () => {
    const fixture = TestBed.createComponent(AdmissionResultPublicationComponent);
    fixture.detectChanges();
    fixture.componentInstance['lookupCampaignId'].set('campaign-1');
    fixture.componentInstance['loadCurrentResult']();
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/admission/results/by-campaign/campaign-1`)
      .flush({ ...draftResult, status: 'Published' });

    fixture.componentInstance['reenterForCorrection']();
    confirmation.confirm('found an error');

    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/admission/results/result-1/reenter-for-correction`)
      .flush({ ...draftResult, status: 'Verified' });
    httpMock
      .expectOne((r) => r.url === `${apiBaseUrl}/api/v1/audit/entries`)
      .flush({ items: [{ id: 'audit-9' }] });

    expect(toast.toasts()[0].message).toContain('audit entry audit-9');
    expect(fixture.componentInstance['store'].currentResult()?.status).toBe('Verified');
  });

  it('does not act without a campaign id', () => {
    const fixture = TestBed.createComponent(AdmissionResultPublicationComponent);
    fixture.detectChanges();
    fixture.componentInstance['loadCurrentResult']();
    fixture.componentInstance['startWizard']();
    expect(fixture.componentInstance['wizard']()).toBeNull();
    expect(fixture.componentInstance['store'].currentResult()).toBeNull();
  });
});
