import type { Observable } from 'rxjs';

/**
 * ADMIN-20/ADMIN-23: the shared step-transition state machine both Admission's and Academic's
 * Result Publication controls are built on (design-decisions.md's Result Publication pattern is
 * explicitly "mirrored" between the two modules -- tickets.md ADMIN-23: "mirroring the
 * admission-side pattern"). Built once here so the ≥90% status-transition-logic coverage bar
 * (requirement-spec.md §4 NFR table) is met once and reused twice, rather than two divergent
 * hand-rolled wizards.
 *
 * - `authorizing` -- a live permission re-check is in flight for the CURRENT step, before it is
 *   allowed to render as actionable (edge-cases.md "A Super Admin Revokes a Staff Member's Role
 *   Mid-Way Through a Multi-Step Action": "proactively call a lightweight 'am I still authorized'
 *   check ... before rendering each next step as actionable").
 * - `ready` -- the current step is authorized; its action can be submitted.
 * - `submitting` -- the current step's action is in flight.
 * - `completed` -- the final step's action succeeded; the workflow is done.
 * - `revoked` -- a terminal state reached from EITHER an `authorizing` check that came back denied
 *   OR a `submitting` action that failed with a `403` -- edge-cases.md's literal "any 403 anywhere
 *   in the flow ... renders an explicit 'your permission for this action was revoked' terminal
 *   state, never a generic error." Once here, this wizard never recovers -- a revoked caller must
 *   leave and re-enter the flow (picking up a fresh permission set) rather than resume.
 * - `error` -- a non-403 failure while submitting the current step; recoverable, the caller may
 *   retry the same step.
 */
export type ResultPublicationWizardStatus =
  'authorizing' | 'ready' | 'submitting' | 'completed' | 'revoked' | 'error';

export interface ResultPublicationStepDefinition<TContext> {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
  /** Re-checked live immediately before this step renders as actionable -- never a session-start-only snapshot. */
  readonly requiredPermission: string;
  /** Performs this step's real mutation/advance call and resolves the (possibly updated) context. */
  readonly action: (context: TContext) => Observable<TContext>;
}

export interface ResultPublicationWizardDeps {
  /** Re-validates against the server (never the in-memory cache) -- see `PermissionsService.revalidate`. */
  readonly revalidate: (permission: string) => Observable<boolean>;
}
