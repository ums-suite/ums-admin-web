import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { map, switchMap } from 'rxjs';
import { AuditApiService } from '@ums/shared';
import {
  UmsButtonComponent,
  UmsDataTableComponent,
  UmsFormFieldComponent,
  UmsInputComponent,
  type DataTableColumn,
} from '@ums/design-system';
import { HasPermissionDirective } from '../../../core/auth/permissions/has-permission.directive';
import { PERMISSION_KEYS } from '../../../core/auth/permissions/permission-keys';
import { AuditedActionService } from '../../../shared/confirmation/audited-action.service';
import { confirmLatestAuditEntry } from '../../../shared/confirmation/audit-lookup.util';
import { DocumentsStore } from '../state/documents.store';
import type { GeneratedDocumentDto } from '../documents.types';

const COLUMNS: readonly DataTableColumn<GeneratedDocumentDto>[] = [
  { id: 'id', header: 'Document', accessor: (r) => r.id },
  { id: 'documentType', header: 'Type', accessor: (r) => r.documentType, sortable: true },
  { id: 'status', header: 'Status', accessor: (r) => r.status, sortable: true },
  { id: 'createdAt', header: 'Created', accessor: (r) => r.createdAt },
];

/**
 * ADMIN-31: Generated Document registry. **Confirmed gap**: `GET /documents` (list, by owner)
 * always returns `downloadUrl: null` for every row -- a real, time-limited presigned URL is only
 * ever present on `GET /documents/{id}`, and only once `status === 'Ready'`. This screen never
 * renders a download link from the list; it always requires a per-document lookup first. Revoke
 * reuses the shared confirmation-with-reason + audit-linked success pattern.
 */
@Component({
  selector: 'app-documents-registry',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    UmsButtonComponent,
    UmsDataTableComponent,
    UmsFormFieldComponent,
    UmsInputComponent,
    HasPermissionDirective,
  ],
  templateUrl: './documents-registry.component.html',
  styleUrl: './documents-registry.component.scss',
})
export class DocumentsRegistryComponent {
  protected readonly store = inject(DocumentsStore);
  protected readonly permissionKeys = PERMISSION_KEYS;
  protected readonly columns = COLUMNS;
  protected readonly rowId = (row: { readonly id: string }): string => row.id;

  private readonly auditApi = inject(AuditApiService);
  private readonly auditedAction = inject(AuditedActionService);

  protected readonly lookupOwnerId = signal('');
  protected readonly lookupDocumentId = signal('');

  protected loadForOwner(): void {
    const ownerId = this.lookupOwnerId().trim();
    if (ownerId) this.store.loadForOwner(ownerId);
  }

  protected currentList(): readonly GeneratedDocumentDto[] {
    return this.store.documentsByOwnerId()[this.lookupOwnerId().trim()] ?? [];
  }

  protected loadById(): void {
    const id = this.lookupDocumentId().trim();
    if (id) this.store.loadById(id);
  }

  protected revoke(): void {
    const document = this.store.currentDocument();
    if (!document) return;
    const sinceIso = new Date().toISOString();

    this.auditedAction
      .confirmAndRun({
        title: 'Revoke document',
        description: `Document ${document.id} (${document.documentType}) will be revoked and its download link disabled.`,
        reasonLabel: 'Reason for revocation (mandatory)',
        perform: (reason) =>
          this.store
            .revoke(document.id, { Reason: reason })
            .pipe(
              switchMap((revoked) =>
                confirmLatestAuditEntry(
                  this.auditApi,
                  'GeneratedDocument',
                  revoked.id,
                  sinceIso,
                ).pipe(map((auditEntryId) => ({ result: revoked, auditEntryId }))),
              ),
            ),
        successMessage: (outcome) => `Document revoked (audit entry ${outcome.auditEntryId}).`,
        errorMessage: (error) => `Could not revoke document: ${error.message}`,
      })
      .subscribe();
  }
}
