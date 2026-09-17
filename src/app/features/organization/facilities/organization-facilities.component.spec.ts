import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideApi } from '@ums/shared';
import { UmsToastService } from '@ums/design-system';
import { ConfirmationService } from '../../../shared/confirmation/confirmation.service';
import { OrganizationFacilitiesComponent } from './organization-facilities.component';

describe('OrganizationFacilitiesComponent', () => {
  let httpMock: HttpTestingController;
  let confirmation: ConfirmationService;
  let toast: UmsToastService;
  const apiBaseUrl = 'http://localhost:8080';
  const emptyPage = { items: [], totalCount: 0, skip: 0, take: 100 };

  const building = {
    id: 'b1',
    campusId: 'c1',
    name: 'Block A',
    code: 'A',
    createdAt: '2026-01-01T00:00:00Z',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrganizationFacilitiesComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideApi(apiBaseUrl)],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    confirmation = TestBed.inject(ConfirmationService);
    toast = TestBed.inject(UmsToastService);
  });

  afterEach(() => httpMock.verify());

  function createAndLoad() {
    const fixture = TestBed.createComponent(OrganizationFacilitiesComponent);
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.url === `${apiBaseUrl}/api/v1/organization/buildings`)
      .flush({ items: [building], totalCount: 1, skip: 0, take: 100 });
    fixture.detectChanges();
    return fixture;
  }

  it('loads buildings on init', () => {
    const fixture = createAndLoad();
    expect(fixture.nativeElement.textContent).toContain('Block A');
  });

  it('selecting a building loads its rooms', () => {
    const fixture = createAndLoad();
    fixture.componentInstance['selectBuilding'](building);
    httpMock
      .expectOne((r) => r.url === `${apiBaseUrl}/api/v1/organization/buildings/b1/rooms`)
      .flush(emptyPage);
    expect(fixture.componentInstance['selectedBuilding']()).toEqual(building);
  });

  it('does not submit createBuilding without a campus id', () => {
    const fixture = createAndLoad();
    fixture.componentInstance['openCreateBuildingModal']();
    fixture.componentInstance['newBuildingName'].set('Block B');
    fixture.componentInstance['submitCreateBuilding']();
    httpMock.expectNone((r) => r.method === 'POST');
  });

  it('creates a room for the selected building', () => {
    const fixture = createAndLoad();
    fixture.componentInstance['selectBuilding'](building);
    httpMock
      .expectOne((r) => r.url === `${apiBaseUrl}/api/v1/organization/buildings/b1/rooms`)
      .flush(emptyPage);

    fixture.componentInstance['openCreateRoomModal']();
    fixture.componentInstance['newRoomName'].set('101');
    fixture.componentInstance['newRoomCapacity'].set('40');
    fixture.componentInstance['submitCreateRoom']();

    const req = httpMock.expectOne(
      (r) => r.method === 'POST' && r.url === `${apiBaseUrl}/api/v1/organization/rooms`,
    );
    expect(req.request.body).toEqual({
      buildingId: 'b1',
      name: '101',
      capacity: 40,
      roomType: null,
    });
    req.flush({
      id: 'room1',
      buildingId: 'b1',
      name: '101',
      capacity: 40,
      roomType: null,
      createdAt: '2026-01-01T00:00:00Z',
    });
    httpMock
      .expectOne((r) => r.url === `${apiBaseUrl}/api/v1/organization/buildings/b1/rooms`)
      .flush(emptyPage);

    expect(fixture.componentInstance['createRoomModalOpen']()).toBeFalse();
  });

  it('deletes a building end to end and shows the audit-linked success toast', () => {
    const fixture = createAndLoad();
    fixture.componentInstance['deleteBuilding'](building);
    expect(confirmation.current()?.title).toBe('Delete building');
    confirmation.confirm('Demolished');

    httpMock
      .expectOne(
        (r) => r.method === 'DELETE' && r.url === `${apiBaseUrl}/api/v1/organization/buildings/b1`,
      )
      .flush({});
    httpMock
      .expectOne((r) => r.url === `${apiBaseUrl}/api/v1/organization/buildings`)
      .flush(emptyPage);
    httpMock
      .expectOne((r) => r.url === `${apiBaseUrl}/api/v1/audit/entries`)
      .flush({ items: [{ id: 'audit-7' }] });

    expect(toast.toasts()[0].message).toContain('audit entry audit-7');
  });
});
