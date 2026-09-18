import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../../../core/config/app-config';
import { HostelInventoryStore } from './hostel-inventory.store';

describe('HostelInventoryStore', () => {
  let store: InstanceType<typeof HostelInventoryStore>;
  let httpMock: HttpTestingController;
  const apiBaseUrl = 'http://localhost:8080';

  const hostel = {
    id: 'h-1',
    name: 'North Hall',
    hostelType: 'Male',
    createdAt: '2026-01-01T00:00:00Z',
  };
  const building = { id: 'b-1', hostelId: 'h-1', name: 'Block A' };
  const room = {
    id: 'r-1',
    buildingId: 'b-1',
    roomNumber: '101',
    type: 'DoubleOccupancy',
    capacity: 2,
  };
  const bed = { id: 'bed-1', roomId: 'r-1', label: 'A' };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { ...DEFAULT_APP_CONFIG, apiBaseUrl } },
      ],
    });
    store = TestBed.inject(HostelInventoryStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('loads hostels', () => {
    store.loadHostels();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/hostel/hostels`).flush([hostel]);
    expect(store.hostels()).toEqual([hostel]);
  });

  it('creates a hostel and prepends it', () => {
    store.createHostel({ name: 'North Hall', hostelType: 'Male' }).subscribe();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/hostel/hostels`).flush(hostel);
    expect(store.hostels()).toEqual([hostel]);
  });

  it('loads buildings for a hostel', () => {
    store.loadBuildings('h-1');
    httpMock.expectOne(`${apiBaseUrl}/api/v1/hostel/hostels/h-1/buildings`).flush([building]);
    expect(store.buildings()).toEqual([building]);
  });

  it('loads rooms for a building', () => {
    store.loadRooms('b-1');
    httpMock.expectOne(`${apiBaseUrl}/api/v1/hostel/buildings/b-1/rooms`).flush([room]);
    expect(store.rooms()).toEqual([room]);
  });

  it('updates a room capacity in place', () => {
    store.loadRooms('b-1');
    httpMock.expectOne(`${apiBaseUrl}/api/v1/hostel/buildings/b-1/rooms`).flush([room]);

    store.updateRoomCapacity('r-1', { capacity: 3 }).subscribe();
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/hostel/rooms/r-1/capacity`)
      .flush({ ...room, capacity: 3 });
    expect(store.rooms()[0].capacity).toBe(3);
  });

  it('loads and keys beds per room', () => {
    store.loadRoomBeds('r-1');
    httpMock.expectOne(`${apiBaseUrl}/api/v1/hostel/rooms/r-1/beds`).flush([bed]);
    expect(store.bedsByRoomId()['r-1']).toEqual([bed]);
  });

  it('refreshRoomBeds re-fetches the same room -- the only honest post-conflict refresh', () => {
    store.refreshRoomBeds('r-1');
    httpMock.expectOne(`${apiBaseUrl}/api/v1/hostel/rooms/r-1/beds`).flush([bed]);
    expect(store.bedsByRoomId()['r-1']).toEqual([bed]);
  });

  it('derives bed-map occupancy from beds + a caller-supplied allocation list (Bed has no status field)', () => {
    store.loadRoomBeds('r-1');
    httpMock.expectOne(`${apiBaseUrl}/api/v1/hostel/rooms/r-1/beds`).flush([bed]);

    const occupiedMap = store.bedMapForRoom('r-1', [
      {
        id: 'al-1',
        applicationId: 'ap-1',
        studentId: 's-1',
        bedId: 'bed-1',
        roomId: 'r-1',
        status: 'Active',
        checkedInAt: null,
        checkedOutAt: null,
        checkOutType: null,
      },
    ]);
    expect(occupiedMap[0].occupyingAllocation?.id).toBe('al-1');

    const vacatedMap = store.bedMapForRoom('r-1', [
      {
        id: 'al-1',
        applicationId: 'ap-1',
        studentId: 's-1',
        bedId: 'bed-1',
        roomId: 'r-1',
        status: 'CheckedOut',
        checkedInAt: null,
        checkedOutAt: null,
        checkOutType: 'Voluntary',
      },
    ]);
    expect(vacatedMap[0].occupyingAllocation).toBeNull();
  });

  it('surfaces an error message when loading fails', () => {
    store.loadHostels();
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/hostel/hostels`)
      .flush(null, { status: 500, statusText: 'Server Error' });
    expect(store.error()).toBeTruthy();
  });
});
