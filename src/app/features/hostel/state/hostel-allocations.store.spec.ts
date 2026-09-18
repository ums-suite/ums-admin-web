import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../../../core/config/app-config';
import { HostelAllocationsStore } from './hostel-allocations.store';

describe('HostelAllocationsStore', () => {
  let store: InstanceType<typeof HostelAllocationsStore>;
  let httpMock: HttpTestingController;
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
  const complaint = {
    id: 'c-1',
    allocationId: 'al-1',
    category: 'Maintenance',
    description: 'Leaking tap',
    status: 'Open',
    resolutionNote: null,
    createdAt: '2026-01-01T00:00:00Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { ...DEFAULT_APP_CONFIG, apiBaseUrl } },
      ],
    });
    store = TestBed.inject(HostelAllocationsStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('loads my allocations', () => {
    store.loadMyAllocations();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/hostel/allocations/me`).flush([allocation]);
    expect(store.myAllocations()).toEqual([allocation]);
  });

  it('checks in an allocation with no body and updates it in place', () => {
    store.loadMyAllocations();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/hostel/allocations/me`).flush([allocation]);

    store.checkIn('al-1').subscribe();
    const req = httpMock.expectOne(`${apiBaseUrl}/api/v1/hostel/allocations/al-1/check-in`);
    expect(req.request.body).toEqual({});
    req.flush({ ...allocation, status: 'Active', checkedInAt: '2026-02-01T00:00:00Z' });
    expect(store.myAllocations()[0].status).toBe('Active');
  });

  it('checks out an allocation, passing through the caller-supplied body', () => {
    store.checkOut('al-1', { checkOutType: 'Disciplinary' }).subscribe();
    const req = httpMock.expectOne(`${apiBaseUrl}/api/v1/hostel/allocations/al-1/check-out`);
    expect(req.request.body).toEqual({ checkOutType: 'Disciplinary' });
    req.flush({ ...allocation, status: 'CheckedOut' });
  });

  it('loads review flags keyed by allocation id', () => {
    store.loadReviewFlags('al-1');
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/hostel/allocations/al-1/review-flags`)
      .flush([{ id: 'f-1', flag: 'LateCheckIn', detail: null, raisedAt: '2026-01-01T00:00:00Z' }]);
    expect(store.reviewFlagsByAllocationId()['al-1'].length).toBe(1);
  });

  it('submits a complaint and prepends it to myComplaints', () => {
    store
      .submitComplaint({
        AllocationId: 'al-1',
        Category: 'Maintenance',
        Description: 'Leaking tap',
      })
      .subscribe();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/hostel/complaints`).flush(complaint);
    expect(store.myComplaints()).toEqual([complaint]);
  });

  it('resolves a complaint by id-only (no staff list endpoint exists) with the PascalCase body', () => {
    store
      .resolveComplaint('c-1', { Status: 'Resolved', ResolutionNote: 'Fixed the tap' })
      .subscribe();
    const req = httpMock.expectOne(`${apiBaseUrl}/api/v1/hostel/complaints/c-1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ Status: 'Resolved', ResolutionNote: 'Fixed the tap' });
    req.flush({ ...complaint, status: 'Resolved', resolutionNote: 'Fixed the tap' });
  });

  it('surfaces an error message when loading fails', () => {
    store.loadMyAllocations();
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/hostel/allocations/me`)
      .flush(null, { status: 500, statusText: 'Server Error' });
    expect(store.error()).toBeTruthy();
  });
});
