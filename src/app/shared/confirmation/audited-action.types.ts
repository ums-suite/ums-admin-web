/**
 * ADMIN-8: the result shape every "perform" callback passed to {@link AuditedActionService} must
 * resolve with -- deliberately couples the mutation's own result to proof that the corresponding
 * `AuditLogEntry` was written (requirement-spec.md §5: "the response only reports success once
 * the corresponding AuditLogEntry is confirmed written"; §8 invariant #5: "a confirmed action
 * always names its own audit trail").
 *
 * Producing this shape is the CALLER's responsibility (e.g. ADMIN-10's deactivate-user flow): run
 * the mutation, then confirm the resulting audit entry actually exists (today, via `GET
 * /api/v1/audit/entries` filtered by entity, since ums-core writes the audit row synchronously in
 * the same request per BRD §4.1/§11 -- there is no dedicated "audit entry id" field returned
 * inline from a mutation response today, so a feature-level follow-up read is the interim
 * mechanism; flag a request for mutation responses to include their own audit entry id directly
 * as a real backend improvement). {@link AuditedActionService} itself is deliberately
 * module-agnostic and never assumes a specific Audit DTO shape.
 */
export interface AuditedMutationOutcome<TResult = unknown> {
  readonly result: TResult;
  /** The id of the `AuditLogEntry` this action produced -- named inline in the success toast. */
  readonly auditEntryId: string;
}
