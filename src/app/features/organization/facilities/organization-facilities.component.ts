import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { map, switchMap } from 'rxjs';
import { AuditApiService } from '@ums/shared';
import {
  UmsButtonComponent,
  UmsFormFieldComponent,
  UmsInputComponent,
  UmsModalComponent,
} from '@ums/design-system';
import { HasPermissionDirective } from '../../../core/auth/permissions/has-permission.directive';
import { PERMISSION_KEYS } from '../../../core/auth/permissions/permission-keys';
import { AuditedActionService } from '../../../shared/confirmation/audited-action.service';
import { confirmLatestAuditEntry } from '../../../shared/confirmation/audit-lookup.util';
import type { BuildingDto, RoomDto } from '../organization.types';
import { OrganizationStore } from '../state/organization.store';

/**
 * ADMIN-12: Building/Room registry (requirement-spec.md §3.3) -- "shared by Hostel allocation and
 * Academic exam-room scheduling," so this screen only manages the registry itself (name, code,
 * capacity, room type); ADMIN-28's hostel bed-map and ADMIN-21's exam room allocation are the
 * later consumers of these rooms, not built here.
 */
@Component({
  selector: 'app-organization-facilities',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    UmsButtonComponent,
    UmsModalComponent,
    UmsFormFieldComponent,
    UmsInputComponent,
    HasPermissionDirective,
  ],
  templateUrl: './organization-facilities.component.html',
  styleUrl: './organization-facilities.component.scss',
})
export class OrganizationFacilitiesComponent implements OnInit {
  protected readonly store = inject(OrganizationStore);
  protected readonly permissionKeys = PERMISSION_KEYS;

  private readonly auditApi = inject(AuditApiService);
  private readonly auditedAction = inject(AuditedActionService);

  protected readonly selectedBuilding = signal<BuildingDto | null>(null);

  protected readonly createBuildingModalOpen = signal(false);
  protected readonly newBuildingName = signal('');
  protected readonly newBuildingCode = signal('');
  protected readonly newBuildingCampusId = signal('');

  protected readonly createRoomModalOpen = signal(false);
  protected readonly newRoomName = signal('');
  protected readonly newRoomCapacity = signal('');
  protected readonly newRoomType = signal('');

  ngOnInit(): void {
    this.store.loadBuildings();
  }

  protected selectBuilding(building: BuildingDto): void {
    this.selectedBuilding.set(building);
    this.store.loadRoomsForBuilding(building.id);
  }

  protected openCreateBuildingModal(): void {
    this.newBuildingName.set('');
    this.newBuildingCode.set('');
    this.newBuildingCampusId.set('');
    this.createBuildingModalOpen.set(true);
  }

  protected submitCreateBuilding(): void {
    const name = this.newBuildingName().trim();
    const campusId = this.newBuildingCampusId().trim();
    if (!name || !campusId) return;
    this.store
      .createBuilding({ campusId, name, code: this.newBuildingCode().trim() || null })
      .subscribe(() => this.createBuildingModalOpen.set(false));
  }

  protected openCreateRoomModal(): void {
    this.newRoomName.set('');
    this.newRoomCapacity.set('');
    this.newRoomType.set('');
    this.createRoomModalOpen.set(true);
  }

  protected submitCreateRoom(): void {
    const building = this.selectedBuilding();
    const name = this.newRoomName().trim();
    if (!building || !name) return;
    const capacityText = this.newRoomCapacity().trim();
    this.store
      .createRoom({
        buildingId: building.id,
        name,
        capacity: capacityText ? Number(capacityText) : null,
        roomType: this.newRoomType().trim() || null,
      })
      .subscribe(() => this.createRoomModalOpen.set(false));
  }

  protected deleteBuilding(building: BuildingDto): void {
    const sinceIso = new Date().toISOString();
    this.auditedAction
      .confirmAndRun({
        title: 'Delete building',
        description: `${building.name} and its room registry entries will be removed.`,
        perform: () =>
          this.store
            .deleteBuilding(building.id, building.campusId)
            .pipe(
              switchMap(() =>
                confirmLatestAuditEntry(this.auditApi, 'Building', building.id, sinceIso).pipe(
                  map((auditEntryId) => ({ result: building, auditEntryId })),
                ),
              ),
            ),
        successMessage: (outcome) =>
          `${outcome.result.name} deleted (audit entry ${outcome.auditEntryId}).`,
        errorMessage: (error) => `Could not delete building: ${error.message}`,
      })
      .subscribe((outcome) => {
        if (outcome && this.selectedBuilding()?.id === building.id) {
          this.selectedBuilding.set(null);
        }
      });
  }

  protected deleteRoom(room: RoomDto): void {
    const sinceIso = new Date().toISOString();
    this.auditedAction
      .confirmAndRun({
        title: 'Delete room',
        description: `Room ${room.name} will be removed from the registry.`,
        perform: () =>
          this.store
            .deleteRoom(room.id, room.buildingId)
            .pipe(
              switchMap(() =>
                confirmLatestAuditEntry(this.auditApi, 'Room', room.id, sinceIso).pipe(
                  map((auditEntryId) => ({ result: room, auditEntryId })),
                ),
              ),
            ),
        successMessage: (outcome) =>
          `Room ${outcome.result.name} deleted (audit entry ${outcome.auditEntryId}).`,
        errorMessage: (error) => `Could not delete room: ${error.message}`,
      })
      .subscribe();
  }
}
