import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { PermissionsService } from '../../../core/auth/permissions/permissions.service';
import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../../../core/config/app-config';
import { HostelInventoryComponent } from './hostel-inventory.component';

describe('HostelInventoryComponent', () => {
  let httpMock: HttpTestingController;
  const apiBaseUrl = 'http://localhost:8080';

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostelInventoryComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { ...DEFAULT_APP_CONFIG, apiBaseUrl } },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('loads hostels into the store', () => {
    const fixture = TestBed.createComponent(HostelInventoryComponent);
    fixture.detectChanges();
    fixture.componentInstance['loadHostels']();
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/hostel/hostels`)
      .flush([
        { id: 'h-1', name: 'North Hall', hostelType: 'Male', createdAt: '2026-01-01T00:00:00Z' },
      ]);
    expect(fixture.componentInstance['store'].hostels().length).toBe(1);
  });

  it('does not create a hostel without a name', () => {
    const fixture = TestBed.createComponent(HostelInventoryComponent);
    fixture.detectChanges();
    fixture.componentInstance['submitCreateHostel']();
    httpMock.expectNone(`${apiBaseUrl}/api/v1/hostel/hostels`);
  });

  it('does not load buildings without a hostel id', () => {
    const fixture = TestBed.createComponent(HostelInventoryComponent);
    fixture.detectChanges();
    fixture.componentInstance['loadBuildings']();
    httpMock.expectNone((r) => r.url.includes('/buildings'));
  });

  it('loads a room id-scoped bed list and keeps occupancy honestly unknown', () => {
    const fixture = TestBed.createComponent(HostelInventoryComponent);
    fixture.detectChanges();
    fixture.componentInstance['selectedRoomId'].set('r-1');
    fixture.componentInstance['loadBeds']();
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/hostel/rooms/r-1/beds`)
      .flush([{ id: 'bed-1', roomId: 'r-1', label: 'A' }]);
    expect(fixture.componentInstance['currentBeds']()).toEqual([
      { id: 'bed-1', roomId: 'r-1', label: 'A' },
    ]);
  });

  it('renders the gated inventory-manage forms once permitted', () => {
    const permissions = TestBed.inject(PermissionsService);
    permissions.load().subscribe();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/identity/me/permissions`).flush({
      permissions: ['hostel.inventory.manage'],
      scopeGrants: [],
    });

    const fixture = TestBed.createComponent(HostelInventoryComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.hostel-inventory__form').length).toBe(4);
  });
});
