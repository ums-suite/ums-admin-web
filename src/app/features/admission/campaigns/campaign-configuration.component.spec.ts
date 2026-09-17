import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../../../core/config/app-config';
import { CampaignConfigurationComponent } from './campaign-configuration.component';

describe('CampaignConfigurationComponent', () => {
  let httpMock: HttpTestingController;
  const apiBaseUrl = 'http://localhost:8080';

  const campaign = {
    id: 'c1',
    name: 'Fall 2026',
    programIds: ['p1'],
    applicationWindowStart: '2026-01-01',
    applicationWindowEnd: '2026-02-01',
    applicationFeeType: 'AdmissionApplicationFee',
    confirmationFeeType: 'AdmissionConfirmationFee',
    isConfigurationLocked: false,
    requiredDocumentTypes: [],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CampaignConfigurationComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { ...DEFAULT_APP_CONFIG, apiBaseUrl } },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('does not submit createCampaign when required fields are missing', () => {
    const fixture = TestBed.createComponent(CampaignConfigurationComponent);
    fixture.detectChanges();
    fixture.componentInstance['newName'].set('Fall 2026');
    fixture.componentInstance['submitCreateCampaign']();
    httpMock.expectNone(`${apiBaseUrl}/api/v1/admission/campaigns`);
  });

  it('creates a campaign with the composed request body', () => {
    const fixture = TestBed.createComponent(CampaignConfigurationComponent);
    fixture.detectChanges();
    fixture.componentInstance['newName'].set('Fall 2026');
    fixture.componentInstance['newProgramIds'].set('p1, p2');
    fixture.componentInstance['newWindowStart'].set('2026-01-01');
    fixture.componentInstance['newWindowEnd'].set('2026-02-01');
    fixture.componentInstance['newApplicationFeeType'].set('AdmissionApplicationFee');
    fixture.componentInstance['newConfirmationFeeType'].set('AdmissionConfirmationFee');

    fixture.componentInstance['submitCreateCampaign']();

    const req = httpMock.expectOne(`${apiBaseUrl}/api/v1/admission/campaigns`);
    expect(req.request.body).toEqual({
      name: 'Fall 2026',
      programIds: ['p1', 'p2'],
      applicationWindowStart: '2026-01-01',
      applicationWindowEnd: '2026-02-01',
      applicationFeeType: 'AdmissionApplicationFee',
      confirmationFeeType: 'AdmissionConfirmationFee',
    });
    req.flush(campaign);

    expect(fixture.componentInstance['store'].currentCampaign()).toEqual(campaign);
  });

  it('loads a campaign by id', () => {
    const fixture = TestBed.createComponent(CampaignConfigurationComponent);
    fixture.detectChanges();
    fixture.componentInstance['lookupCampaignId'].set('c1');
    fixture.componentInstance['loadCampaign']();

    httpMock.expectOne(`${apiBaseUrl}/api/v1/admission/campaigns/c1`).flush(campaign);
    expect(fixture.componentInstance['store'].currentCampaign()).toEqual(campaign);
  });

  it('adds an eligibility rule to the loaded campaign', () => {
    const fixture = TestBed.createComponent(CampaignConfigurationComponent);
    fixture.detectChanges();
    fixture.componentInstance['lookupCampaignId'].set('c1');
    fixture.componentInstance['loadCampaign']();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/admission/campaigns/c1`).flush(campaign);

    fixture.componentInstance['ruleProgramId'].set('p1');
    fixture.componentInstance['ruleMinimumScore'].set('3.5');
    fixture.componentInstance['ruleIsGpaScale'].set(true);
    fixture.componentInstance['submitEligibilityRule']();

    const req = httpMock.expectOne(`${apiBaseUrl}/api/v1/admission/campaigns/c1/eligibility-rules`);
    expect(req.request.body).toEqual({
      programId: 'p1',
      minimumScore: 3.5,
      isGpaScale: true,
      requiredBoard: null,
    });
    req.flush({ ...campaign, requiredDocumentTypes: [] });
  });

  it('shows a locked-configuration note and hides the mutation forms once locked', () => {
    const fixture = TestBed.createComponent(CampaignConfigurationComponent);
    fixture.detectChanges();
    fixture.componentInstance['lookupCampaignId'].set('c1');
    fixture.componentInstance['loadCampaign']();
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/admission/campaigns/c1`)
      .flush({ ...campaign, isConfigurationLocked: true });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('locked');
  });
});
