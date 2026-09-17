import { AuditApiService } from '@ums/shared';
import { Observable, map } from 'rxjs';

interface RawAuditLogEntry {
  readonly id: string;
}

interface RawAuditLogEntryListPage {
  readonly items?: readonly RawAuditLogEntry[];
}

/**
 * ADMIN-8/ADMIN-10+: resolves the `AuditLogEntry` id a just-completed mutation produced, for the
 * "names its own audit trail" half of the Confirmation-with-Reason + Audit-Linked Success Pattern
 * (design-decisions.md, requirement-spec.md §8 invariant #5).
 *
 * `ums-core` does NOT return a mutation's own resulting audit entry id inline in the mutation's
 * response today (confirmed against the real Identity/Student/Admission endpoint DTOs -- none of
 * them carry an `auditEntryId`-shaped field) -- this is the interim, flagged mechanism every
 * caller uses instead: query `GET /api/v1/audit/entries` (confirmed real, filterable by
 * `entityType`/`entityId`/`dateFrom`) for entries at/after the moment the mutation was issued and
 * take the first match. **`entityType`'s exact literal string (e.g. `"User"`) is this app's own
 * best-effort guess** at ums-core's actual entity-type naming convention, not independently
 * confirmed against a live Audit write -- flagged as a required verification once a real backend
 * is available. If no matching entry is found, this throws rather than fabricating one, so
 * {@link import('./audited-action.service').AuditedActionService} correctly withholds the
 * success toast per design-decisions.md's own literal requirement, even though the underlying
 * mutation itself may well have already succeeded (the calling feature's own store still reflects
 * the real state regardless of whether this lookup succeeds).
 */
export function confirmLatestAuditEntry(
  auditApi: AuditApiService,
  entityType: string,
  entityId: string,
  sinceIso: string,
): Observable<string> {
  return (
    auditApi.apiV1AuditEntriesGet(
      entityType,
      entityId,
      undefined,
      sinceIso,
    ) as Observable<RawAuditLogEntryListPage>
  ).pipe(
    map((page) => {
      const entry = page.items?.[0];
      if (!entry) {
        throw new Error(
          'The action completed, but its audit entry could not be confirmed yet -- check the Audit Log.',
        );
      }
      return entry.id;
    }),
  );
}
