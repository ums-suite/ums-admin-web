import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideApi } from '@ums/shared';
import { UmsToastService } from '@ums/design-system';
import { ConfirmationService } from '../../../shared/confirmation/confirmation.service';
import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../../../core/config/app-config';
import { HostelAllocationsComponent } from './hostel-allocations.component';

describe('HostelAllocationsComponent', () => {
  let httpMock: HttpTestingController;
  let confirmation: ConfirmationService;
  let toast: UmsToastService;
  const apiBaseUrl = 'http://localhost:8080';

  const allocation = {
    id: 'al-1',
    applicationId: 'app-1',
    studentId: 's-1',
    bedId: 'bed-1',
    roomId: 'r-1',
    status: 'Pending',
    checkedInAt: null,
    checkedOutAt: null,
    checkOutType: null,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostelAllocationsComponent],
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

  it('does not submit a complaint without an allocation id or description', () => {
    const fixture = TestBed.createComponent(HostelAllocationsComponent);
    fixture.detectChanges();
    fixture.componentInstance['submitComplaint']();
    httpMock.expectNone(`${apiBaseUrl}/api/v1/hostel/complaints`);
  });

  it('checks in an allocation end to end with a confirmation and audit-linked success', () => {
    const fixture = TestBed.createComponent(HostelAllocationsComponent);
    fixture.detectChanges();
    fixture.componentInstance['checkIn']('al-1');
    expect(confirmation.current()?.title).toBe('Check in');
    confirmation.confirm('routine');

    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/hostel/allocations/al-1/check-in`)
      .flush({ ...allocation, status: 'Active' });
    httpMock
      .expectOne((r) => r.url === `${apiBaseUrl}/api/v1/audit/entries`)
      .flush({ items: [{ id: 'audit-1' }] });

    expect(toast.toasts()[0].message).toContain('audit entry audit-1');
  });

  it('resolves a complaint id-only with the required note', () => {
    const fixture = TestBed.createComponent(HostelAllocationsComponent);
    fixture.detectChanges();
    fixture.componentInstance['resolveComplaintId'].set('c-1');
    fixture.componentInstance['resolveComplaint']();
    confirmation.confirm('fixed');

    const req = httpMock.expectOne(`${apiBaseUrl}/api/v1/hostel/complaints/c-1`);
    expect(req.request.body).toEqual({ Status: 'Resolved', ResolutionNote: undefined });
    req.flush({
      id: 'c-1',
      allocationId: 'al-1',
      category: 'Maintenance',
      description: 'Leaking tap',
      status: 'Resolved',
      resolutionNote: null,
      createdAt: '2026-01-01T00:00:00Z',
    });
    httpMock
      .expectOne((r) => r.url === `${apiBaseUrl}/api/v1/audit/entries`)
      .flush({ items: [{ id: 'audit-2' }] });

    expect(toast.toasts()[0].message).toContain('audit entry audit-2');
  });

  it('loads review flags for an allocation id', () => {
    const fixture = TestBed.createComponent(HostelAllocationsComponent);
    fixture.detectChanges();
    fixture.componentInstance['flagsAllocationId'].set('al-1');
    fixture.componentInstance['loadReviewFlags']();
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/hostel/allocations/al-1/review-flags`)
      .flush([{ id: 'f-1', flag: 'LateCheckIn', detail: null, raisedAt: '2026-01-01T00:00:00Z' }]);
    expect(fixture.componentInstance['currentFlags']().length).toBe(1);
  });
});
