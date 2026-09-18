import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { map, switchMap } from 'rxjs';
import { AuditApiService } from '@ums/shared';
import {
  UmsButtonComponent,
  UmsDataTableComponent,
  UmsFormFieldComponent,
  UmsInputComponent,
  UmsSelectComponent,
  UmsTextareaComponent,
  type DataTableColumn,
  type SelectOption,
} from '@ums/design-system';
import { HasPermissionDirective } from '../../../core/auth/permissions/has-permission.directive';
import { PERMISSION_KEYS } from '../../../core/auth/permissions/permission-keys';
import { AuditedActionService } from '../../../shared/confirmation/audited-action.service';
import { confirmLatestAuditEntry } from '../../../shared/confirmation/audit-lookup.util';
import { HostelAllocationsStore } from '../state/hostel-allocations.store';
import {
  HOSTEL_CONFLICT_MESSAGE,
  isHostelConflictCode,
  type AllocationDto,
  type ComplaintDto,
} from '../hostel.types';

const ALLOCATION_COLUMNS: readonly DataTableColumn<AllocationDto>[] = [
  { id: 'id', header: 'Allocation', accessor: (r) => r.id },
  { id: 'status', header: 'Status', accessor: (r) => r.status, sortable: true },
  { id: 'roomId', header: 'Room', accessor: (r) => r.roomId },
  { id: 'bedId', header: 'Bed', accessor: (r) => r.bedId },
];
const COMPLAINT_COLUMNS: readonly DataTableColumn<ComplaintDto>[] = [
  { id: 'id', header: 'Complaint', accessor: (r) => r.id },
  { id: 'category', header: 'Category', accessor: (r) => r.category },
  { id: 'status', header: 'Status', accessor: (r) => r.status, sortable: true },
];

/**
 * ADMIN-28: my-allocations self-service check-in/out, officer review-flags, and Complaint
 * submit/settle. **No staff-facing complaint list/GET-by-id endpoint exists** -- the "Resolve a
 * complaint" section below only ever acts on a complaint id an officer already has (e.g. surfaced
 * via the Audit Log), the same id-only interim workflow ADMIN-17's StudentRequest handling
 * established. A student checking themselves out is forced to `Voluntary` server-side regardless
 * of the `checkOutType` submitted here -- the field is only ever honored for a non-owner caller.
 */
@Component({
  selector: 'app-hostel-allocations',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    UmsButtonComponent,
    UmsDataTableComponent,
    UmsFormFieldComponent,
    UmsInputComponent,
    UmsSelectComponent,
    UmsTextareaComponent,
    HasPermissionDirective,
  ],
  templateUrl: './hostel-allocations.component.html',
  styleUrl: './hostel-allocations.component.scss',
})
export class HostelAllocationsComponent {
  protected readonly store = inject(HostelAllocationsStore);
  protected readonly permissionKeys = PERMISSION_KEYS;
  protected readonly allocationColumns = ALLOCATION_COLUMNS;
  protected readonly complaintColumns = COMPLAINT_COLUMNS;
  protected readonly rowId = (row: { readonly id: string }): string => row.id;

  private readonly auditApi = inject(AuditApiService);
  private readonly auditedAction = inject(AuditedActionService);

  protected readonly checkOutTypeOptions: readonly SelectOption[] = [
    { value: 'Voluntary', label: 'Voluntary' },
    { value: 'EndOfSession', label: 'End of session' },
    { value: 'Disciplinary', label: 'Disciplinary' },
  ];
  protected readonly complaintCategoryOptions: readonly SelectOption[] = [
    { value: 'Maintenance', label: 'Maintenance' },
    { value: 'RoommateDispute', label: 'Roommate dispute' },
    { value: 'Damage', label: 'Damage' },
    { value: 'Other', label: 'Other' },
  ];
  protected readonly resolveStatusOptions: readonly SelectOption[] = [
    { value: 'InProgress', label: 'In progress' },
    { value: 'Resolved', label: 'Resolved' },
    { value: 'Rejected', label: 'Rejected' },
  ];

  protected readonly checkOutTypeSelection = signal('EndOfSession');
  protected readonly flagsAllocationId = signal('');

  protected readonly complaintAllocationId = signal('');
  protected readonly complaintCategory = signal('Maintenance');
  protected readonly complaintDescription = signal('');

  protected readonly resolveComplaintId = signal('');
  protected readonly resolveStatus = signal('Resolved');
  protected readonly resolveNote = signal('');

  protected loadMyAllocations(): void {
    this.store.loadMyAllocations();
  }

  protected checkIn(allocationId: string): void {
    const sinceIso = new Date().toISOString();
    this.auditedAction
      .confirmAndRun({
        title: 'Check in',
        description: `Allocation ${allocationId} will be marked checked in.`,
        reasonLabel: 'Reason (optional)',
        perform: () =>
          this.store
            .checkIn(allocationId)
            .pipe(
              switchMap((allocation) =>
                confirmLatestAuditEntry(this.auditApi, 'Allocation', allocation.id, sinceIso).pipe(
                  map((auditEntryId) => ({ result: allocation, auditEntryId })),
                ),
              ),
            ),
        successMessage: (outcome) => `Checked in (audit entry ${outcome.auditEntryId}).`,
        errorMessage: (error) =>
          isHostelConflictCode(error.code) ? HOSTEL_CONFLICT_MESSAGE : error.message,
      })
      .subscribe();
  }

  protected checkOut(allocationId: string): void {
    const sinceIso = new Date().toISOString();
    const checkOutType = this.checkOutTypeSelection();
    this.auditedAction
      .confirmAndRun({
        title: 'Check out',
        description: `Allocation ${allocationId} will be checked out. If you are the owning student, checkOutType is ignored server-side and forced to Voluntary.`,
        reasonLabel: 'Reason (optional)',
        perform: () =>
          this.store
            .checkOut(allocationId, { checkOutType })
            .pipe(
              switchMap((allocation) =>
                confirmLatestAuditEntry(this.auditApi, 'Allocation', allocation.id, sinceIso).pipe(
                  map((auditEntryId) => ({ result: allocation, auditEntryId })),
                ),
              ),
            ),
        successMessage: (outcome) => `Checked out (audit entry ${outcome.auditEntryId}).`,
        errorMessage: (error) =>
          isHostelConflictCode(error.code) ? HOSTEL_CONFLICT_MESSAGE : error.message,
      })
      .subscribe();
  }

  protected loadReviewFlags(): void {
    const id = this.flagsAllocationId().trim();
    if (id) this.store.loadReviewFlags(id);
  }

  protected currentFlags() {
    return this.store.reviewFlagsByAllocationId()[this.flagsAllocationId().trim()] ?? [];
  }

  protected submitComplaint(): void {
    const allocationId = this.complaintAllocationId().trim();
    const description = this.complaintDescription().trim();
    if (!allocationId || !description) return;
    this.store
      .submitComplaint({
        AllocationId: allocationId,
        Category: this.complaintCategory(),
        Description: description,
      })
      .subscribe(() => this.complaintDescription.set(''));
  }

  protected loadMyComplaints(): void {
    this.store.loadMyComplaints();
  }

  protected resolveComplaint(): void {
    const id = this.resolveComplaintId().trim();
    if (!id) return;
    const sinceIso = new Date().toISOString();
    const status = this.resolveStatus() as 'InProgress' | 'Resolved' | 'Rejected';
    const note = this.resolveNote().trim() || undefined;

    this.auditedAction
      .confirmAndRun({
        title: 'Resolve complaint',
        description: `Complaint ${id} will be marked ${status}.`,
        reasonLabel: 'Resolution note',
        perform: () =>
          this.store
            .resolveComplaint(id, { Status: status, ResolutionNote: note })
            .pipe(
              switchMap((complaint) =>
                confirmLatestAuditEntry(this.auditApi, 'Complaint', complaint.id, sinceIso).pipe(
                  map((auditEntryId) => ({ result: complaint, auditEntryId })),
                ),
              ),
            ),
        successMessage: (outcome) =>
          `Complaint ${status.toLowerCase()} (audit entry ${outcome.auditEntryId}).`,
        errorMessage: (error) => error.message,
      })
      .subscribe(() => this.resolveComplaintId.set(''));
  }
}
