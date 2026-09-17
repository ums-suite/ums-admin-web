import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideApi } from '@ums/shared';
import { UmsToastService } from '@ums/design-system';
import { ConfirmationService } from '../../../shared/confirmation/confirmation.service';
import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../../../core/config/app-config';
import { FacultyResearchProfileComponent } from './faculty-research-profile.component';

describe('FacultyResearchProfileComponent', () => {
  let httpMock: HttpTestingController;
  let confirmation: ConfirmationService;
  let toast: UmsToastService;
  const apiBaseUrl = 'http://localhost:8080';

  const profile = {
    id: 'profile-1',
    facultyMemberId: 'fac-1',
    publications: [],
    ongoingResearch: null,
    grants: null,
    version: 1,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FacultyResearchProfileComponent],
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
  });

  afterEach(() => httpMock.verify());

  it('loads a research profile by faculty member id', () => {
    const fixture = TestBed.createComponent(FacultyResearchProfileComponent);
    fixture.detectChanges();
    fixture.componentInstance['facultyMemberId'].set('fac-1');
    fixture.componentInstance['loadProfile']();
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/faculty/members/fac-1/research-profile`)
      .flush(profile);
    expect(fixture.componentInstance['store'].currentProfile()).toEqual(profile);
  });

  it('adds and removes a draft publication', () => {
    const fixture = TestBed.createComponent(FacultyResearchProfileComponent);
    fixture.detectChanges();
    fixture.componentInstance['publicationTitle'].set('A Study');
    fixture.componentInstance['publicationVenue'].set('Journal');
    fixture.componentInstance['publicationYear'].set('2026');
    fixture.componentInstance['addDraftPublication']();
    expect(fixture.componentInstance['draftPublications']().length).toBe(1);

    fixture.componentInstance['removeDraftPublication'](0);
    expect(fixture.componentInstance['draftPublications']().length).toBe(0);
  });

  it('does not submit an update without a loaded profile', () => {
    const fixture = TestBed.createComponent(FacultyResearchProfileComponent);
    fixture.detectChanges();
    fixture.componentInstance['facultyMemberId'].set('fac-1');
    fixture.componentInstance['submitUpdate']();
    expect(confirmation.current()).toBeNull();
  });

  it('updates a research profile end to end with an audit-linked success toast', () => {
    const fixture = TestBed.createComponent(FacultyResearchProfileComponent);
    fixture.detectChanges();
    fixture.componentInstance['facultyMemberId'].set('fac-1');
    fixture.componentInstance['loadProfile']();
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/faculty/members/fac-1/research-profile`)
      .flush(profile);

    fixture.componentInstance['ongoingResearch'].set('AI ethics');
    fixture.componentInstance['submitUpdate']();
    confirmation.confirm('added ongoing research');

    const req = httpMock.expectOne(`${apiBaseUrl}/api/v1/faculty/members/fac-1/research-profile`);
    expect(req.request.method).toBe('PUT');
    req.flush({ ...profile, ongoingResearch: 'AI ethics', version: 2 });
    httpMock
      .expectOne((r) => r.url === `${apiBaseUrl}/api/v1/audit/entries`)
      .flush({ items: [{ id: 'audit-1' }] });

    expect(toast.toasts()[0].message).toContain('audit entry audit-1');
  });
});
