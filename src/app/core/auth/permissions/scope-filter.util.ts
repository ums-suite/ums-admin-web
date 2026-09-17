import type { ScopeGrant } from './permission.types';

/**
 * ADMIN-5: client-side defense-in-depth for requirement-spec.md §8 invariant #2 -- "organizational
 * scope is never silently widened by a shared list endpoint... the UI still filters/labels by the
 * caller's ScopeGrant." A shared-list endpoint (e.g. a Student roster, a HostelApplication queue)
 * can legitimately return rows outside the caller's granted organization node(s) -- most of
 * ums-core's list endpoints confirmed in this app's research take no scope-narrowing query param
 * at all -- so every module feature area that renders such a list MUST run it through this filter
 * before display, never trust that the server already scoped the response.
 *
 * `getNodeId` extracts the row's own owning organization node id (its `DepartmentId`,
 * `CampusId`, `ProgramId`, etc. -- whichever the specific list's rows carry).
 *
 * A grant with `organizationNodeId === null` is unscoped/global for that Role (ADR-0006) -- if
 * ANY of the caller's grants is global, every row passes (no narrowing needed). Otherwise a row
 * passes only if its node id exactly matches one of the caller's granted node ids.
 *
 * **Known limitation, flagged rather than silently assumed away:** this performs exact-node
 * matching only, not hierarchy-aware matching (a grant scoped to a Faculty does not currently
 * expand to that Faculty's Departments/Programs here) -- resolving the full descendant-node set
 * would require a call to Organization's `GET /organization/nodes/{id}/ancestors`-style
 * tree endpoints per grant, which this generic utility deliberately does not perform (it has no
 * knowledge of the Organization module). A feature that needs hierarchy-aware scoping should
 * resolve the caller's grant node(s) to their full descendant-id set first (e.g. via
 * `OrganizationApiService`'s tree endpoints) and pass that expanded id set to this same filter,
 * rather than this utility silently guessing a hierarchy relationship it can't verify.
 *
 * **Fails closed:** a caller with zero resolved scope grants (including
 * {@link import('./permission.types').PermissionSession}'s degraded `'unavailable'` state) sees
 * zero rows, never the unfiltered list -- consistent with {@link import('./permissions.service').PermissionsService}'s
 * own fail-closed default.
 */
export function filterByScope<T>(
  rows: readonly T[],
  getNodeId: (row: T) => string | null | undefined,
  scopeGrants: readonly ScopeGrant[],
): readonly T[] {
  if (scopeGrants.length === 0) {
    return [];
  }

  const hasGlobalGrant = scopeGrants.some((grant) => grant.organizationNodeId === null);
  if (hasGlobalGrant) {
    return rows;
  }

  const allowedNodeIds = new Set(
    scopeGrants.map((grant) => grant.organizationNodeId).filter((id): id is string => id !== null),
  );

  return rows.filter((row) => {
    const nodeId = getNodeId(row);
    return nodeId != null && allowedNodeIds.has(nodeId);
  });
}

/** A short, user-facing label for the caller's current scope, for the "visually explicit" half of invariant #2. */
export function describeScope(scopeGrants: readonly ScopeGrant[]): string {
  if (scopeGrants.length === 0) {
    return 'No organizational scope resolved';
  }
  if (scopeGrants.some((grant) => grant.organizationNodeId === null)) {
    return 'All organizations';
  }
  const uniqueRoles = Array.from(new Set(scopeGrants.map((grant) => grant.roleName))).join(', ');
  return `Scoped to ${scopeGrants.length} organization node(s) via ${uniqueRoles}`;
}
