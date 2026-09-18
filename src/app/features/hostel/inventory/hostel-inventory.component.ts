import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  UmsButtonComponent,
  UmsDataTableComponent,
  UmsFormFieldComponent,
  UmsInputComponent,
  UmsSelectComponent,
  type DataTableColumn,
  type SelectOption,
} from '@ums/design-system';
import { HasPermissionDirective } from '../../../core/auth/permissions/has-permission.directive';
import { PERMISSION_KEYS } from '../../../core/auth/permissions/permission-keys';
import { HostelInventoryStore } from '../state/hostel-inventory.store';
import type { BedDto, BuildingDto, HostelDto, RoomDto } from '../hostel.types';

const HOSTEL_COLUMNS: readonly DataTableColumn<HostelDto>[] = [
  { id: 'name', header: 'Name', accessor: (r) => r.name, sortable: true },
  { id: 'type', header: 'Type', accessor: (r) => r.hostelType },
];
const BUILDING_COLUMNS: readonly DataTableColumn<BuildingDto>[] = [
  { id: 'name', header: 'Building', accessor: (r) => r.name, sortable: true },
  { id: 'id', header: 'Id', accessor: (r) => r.id },
];
const ROOM_COLUMNS: readonly DataTableColumn<RoomDto>[] = [
  { id: 'roomNumber', header: 'Room #', accessor: (r) => r.roomNumber, sortable: true },
  { id: 'type', header: 'Type', accessor: (r) => r.type },
  { id: 'capacity', header: 'Capacity', accessor: (r) => r.capacity, numeric: true },
];
const BED_COLUMNS: readonly DataTableColumn<BedDto>[] = [
  { id: 'label', header: 'Bed', accessor: (r) => r.label, sortable: true },
  { id: 'occupancy', header: 'Occupancy', accessor: () => 'Unknown' },
];

/**
 * ADMIN-27: Hostel/Building/Room/Bed inventory + this app's own client-assembled "bed map".
 *
 * **Flagged, confirmed backend gap**: `Bed` has no status field, and no endpoint anywhere in this
 * module lists allocations by bed/room/building/floor -- an officer has no server-side way to
 * learn which beds are currently occupied at all (only a Student's own `GET /allocations/me` is
 * self-service-scoped). The "Occupancy" column below is therefore always rendered as "Unknown"
 * rather than fabricated -- this app does not pretend to show live occupancy it cannot actually
 * fetch. Re-fetching a room's own bed list (`refreshBeds`) is the only honest post-conflict refresh
 * this module supports; there is no floor/section/building-wide refresh available.
 */
@Component({
  selector: 'app-hostel-inventory',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    UmsButtonComponent,
    UmsDataTableComponent,
    UmsFormFieldComponent,
    UmsInputComponent,
    UmsSelectComponent,
    HasPermissionDirective,
  ],
  templateUrl: './hostel-inventory.component.html',
  styleUrl: './hostel-inventory.component.scss',
})
export class HostelInventoryComponent {
  protected readonly store = inject(HostelInventoryStore);
  protected readonly permissionKeys = PERMISSION_KEYS;
  protected readonly hostelColumns = HOSTEL_COLUMNS;
  protected readonly buildingColumns = BUILDING_COLUMNS;
  protected readonly roomColumns = ROOM_COLUMNS;
  protected readonly bedColumns = BED_COLUMNS;
  protected readonly rowId = (row: { readonly id: string }): string => row.id;

  protected readonly hostelTypeOptions: readonly SelectOption[] = [
    { value: 'Male', label: 'Male' },
    { value: 'Female', label: 'Female' },
    { value: 'International', label: 'International' },
    { value: 'Mixed', label: 'Mixed' },
  ];
  protected readonly roomTypeOptions: readonly SelectOption[] = [
    { value: 'SingleOccupancy', label: 'Single occupancy' },
    { value: 'DoubleOccupancy', label: 'Double occupancy' },
    { value: 'TripleOccupancy', label: 'Triple occupancy' },
    { value: 'Dormitory', label: 'Dormitory' },
  ];

  protected readonly newHostelName = signal('');
  protected readonly newHostelType = signal('Male');

  protected readonly selectedHostelId = signal('');
  protected readonly newBuildingName = signal('');

  protected readonly selectedBuildingId = signal('');
  protected readonly newRoomNumber = signal('');
  protected readonly newRoomType = signal('DoubleOccupancy');
  protected readonly newRoomCapacity = signal('2');
  protected readonly capacityRoomId = signal('');
  protected readonly capacityValue = signal('');

  protected readonly selectedRoomId = signal('');
  protected readonly newBedLabel = signal('');

  protected loadHostels(): void {
    this.store.loadHostels();
  }

  protected submitCreateHostel(): void {
    const name = this.newHostelName().trim();
    if (!name) return;
    this.store
      .createHostel({ name, hostelType: this.newHostelType() })
      .subscribe(() => this.newHostelName.set(''));
  }

  protected loadBuildings(): void {
    const hostelId = this.selectedHostelId().trim();
    if (hostelId) this.store.loadBuildings(hostelId);
  }

  protected submitCreateBuilding(): void {
    const hostelId = this.selectedHostelId().trim();
    const name = this.newBuildingName().trim();
    if (!hostelId || !name) return;
    this.store.createBuilding(hostelId, { name }).subscribe(() => this.newBuildingName.set(''));
  }

  protected loadRooms(): void {
    const buildingId = this.selectedBuildingId().trim();
    if (buildingId) this.store.loadRooms(buildingId);
  }

  protected submitCreateRoom(): void {
    const buildingId = this.selectedBuildingId().trim();
    const roomNumber = this.newRoomNumber().trim();
    const capacity = Number(this.newRoomCapacity());
    if (!buildingId || !roomNumber || !Number.isFinite(capacity)) return;
    this.store
      .createRoom(buildingId, { roomNumber, type: this.newRoomType(), capacity })
      .subscribe(() => this.newRoomNumber.set(''));
  }

  protected submitCapacityUpdate(): void {
    const roomId = this.capacityRoomId().trim();
    const capacity = Number(this.capacityValue());
    if (!roomId || !Number.isFinite(capacity)) return;
    this.store.updateRoomCapacity(roomId, { capacity }).subscribe(() => this.capacityValue.set(''));
  }

  protected loadBeds(): void {
    const roomId = this.selectedRoomId().trim();
    if (roomId) this.store.loadRoomBeds(roomId);
  }

  /** Re-fetches the same room's own bed list -- the only honest post-conflict refresh available. */
  protected refreshBeds(): void {
    const roomId = this.selectedRoomId().trim();
    if (roomId) this.store.refreshRoomBeds(roomId);
  }

  protected submitCreateBed(): void {
    const roomId = this.selectedRoomId().trim();
    const label = this.newBedLabel().trim();
    if (!roomId || !label) return;
    this.store.createBed(roomId, { label }).subscribe(() => this.newBedLabel.set(''));
  }

  protected currentBeds(): readonly BedDto[] {
    return this.store.bedsByRoomId()[this.selectedRoomId().trim()] ?? [];
  }
}
