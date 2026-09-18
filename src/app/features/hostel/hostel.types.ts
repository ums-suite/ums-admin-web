/**
 * ADMIN-27/ADMIN-28: hand-typed DTOs against `ums-core`'s real Hostel module
 * (`UMS.Modules.Hostel`) -- `@ums/shared` has no generated Hostel client (same confirmed gap as
 * every other non-Identity/Audit/Organization module in this app). Every route this app calls is
 * confirmed real per this build pass's own research; DTO FIELD NAMES beyond the ones explicitly
 * enumerated in tickets.md are this app's own best-effort guess at a reasonable shape (flagged
 * inline below), not independently read off a C# response record.
 *
 * **CONFIRMED SEVERE GAPS, not invented workarounds**:
 * - `Bed` has NO status field at all -- occupancy must be inferred client-side by cross-referencing
 *   an Allocation's `bedId` against the beds loaded for a room (see `hostel-inventory.store.ts`'s
 *   own doc for the derivation).
 * - No bed-map/floor/building-occupancy endpoint exists anywhere in this module (confirmed by
 *   exhaustive source grep) -- the bed-map grid is assembled client-side from
 *   `GET /buildings/{id}/rooms` + `GET /rooms/{id}/beds` per room. There is also no floor-scoped or
 *   building-wide "refresh occupancy" call -- the closest honest re-fetch after a conflict is
 *   re-fetching that one room's own bed list, not a floor/section-scoped refresh.
 * - Approving a HostelApplication auto-allocates a bed server-side -- there is no manual bed-picking
 *   endpoint, so this app never offers one.
 * - No staff-facing list/GET-by-id endpoint for Complaints exists at all -- an officer can only
 *   PATCH a complaint id they already have (e.g. surfaced via the Audit Log), the same "id-only
 *   interim workflow" shape as Student's own StudentRequest handling (ADMIN-17).
 */

// ---- Enums (confirmed real names/members) ----

export type HostelType = 'Male' | 'Female' | 'International' | 'Mixed';
export type RoomType = 'SingleOccupancy' | 'DoubleOccupancy' | 'TripleOccupancy' | 'Dormitory';
export type HostelApplicationStatus =
  'Draft' | 'Submitted' | 'Ranked' | 'Approved' | 'Waitlisted' | 'Rejected' | 'Withdrawn';
export type AllocationStatus = 'Pending' | 'FeePaid' | 'Active' | 'CheckedOut' | 'Expired';
export type CheckOutType = 'Voluntary' | 'EndOfSession' | 'Disciplinary';
export type ComplaintStatus = 'Open' | 'InProgress' | 'Resolved' | 'Rejected';
export type ComplaintCategory = 'Maintenance' | 'RoommateDispute' | 'Damage' | 'Other';
export type EligibilityRuleType =
  'MinimumYearOfStudy' | 'FinancialNeedRequired' | 'MinimumHomeDistrictDistanceKm';

// ---- Inventory ----

/** ASSUMED shape -- ums-core's own `Hostel` creation body was not enumerated in tickets.md. */
export interface HostelDto {
  readonly id: string;
  readonly name: string;
  readonly hostelType: HostelType | string;
  readonly createdAt: string;
}

export interface CreateHostelRequest {
  readonly name: string;
  readonly hostelType: HostelType | string;
}

export interface BuildingDto {
  readonly id: string;
  readonly hostelId: string;
  readonly name: string;
}

export interface CreateBuildingRequest {
  readonly name: string;
}

export interface RoomDto {
  readonly id: string;
  readonly buildingId: string;
  readonly roomNumber: string;
  readonly type: RoomType | string;
  readonly capacity: number;
}

export interface CreateRoomRequest {
  readonly roomNumber: string;
  readonly type: RoomType | string;
  readonly capacity: number;
}

export interface UpdateRoomCapacityRequest {
  readonly capacity: number;
}

/** Confirmed real: NO status field. See this file's own class doc. */
export interface BedDto {
  readonly id: string;
  readonly roomId: string;
  readonly label: string;
}

export interface CreateBedRequest {
  readonly label: string;
}

/** Client-side-derived (never a server response) -- see `hostel-inventory.store.ts`. */
export interface BedOccupancy {
  readonly bed: BedDto;
  readonly occupyingAllocation: AllocationDto | null;
}

// ---- Application Windows ----

export interface EligibilityRuleDto {
  readonly ruleType: EligibilityRuleType | string;
  readonly value: string;
  readonly description?: string | null;
}

/** ASSUMED base shape beyond the confirmed eligible-programs/years/rules sub-resources. */
export interface ApplicationWindowDto {
  readonly id: string;
  readonly name: string;
  readonly opensAt: string;
  readonly closesAt: string;
  readonly eligibleProgramIds: readonly string[];
  readonly eligibleYears: readonly number[];
  readonly eligibilityRules: readonly EligibilityRuleDto[];
}

export interface CreateApplicationWindowRequest {
  readonly name: string;
  readonly opensAt: string;
  readonly closesAt: string;
}

export interface SetEligibleProgramsRequest {
  readonly ProgramIds: readonly string[];
}

export interface SetEligibleYearsRequest {
  readonly Years: readonly number[];
}

export interface SetEligibilityRulesRequest {
  readonly Rules: readonly EligibilityRuleDto[];
}

export interface RankApplicationsResult {
  readonly rankedCount: number;
}

// ---- Applications ----

/** ASSUMED self-service create body -- not enumerated beyond "self-service" in tickets.md. */
export interface CreateHostelApplicationRequest {
  readonly applicationWindowId: string;
}

export interface HostelApplicationDto {
  readonly id: string;
  readonly applicationWindowId: string;
  readonly studentId: string;
  readonly status: HostelApplicationStatus | string;
  readonly submittedAt: string | null;
  readonly rank: number | null;
}

export type HostelApplicationDecision = 'Approve' | 'Waitlist' | 'Reject';

export interface ReviewApplicationRequest {
  readonly Decision: HostelApplicationDecision;
  readonly Reason?: string | null;
}

// ---- Allocations ----

export interface AllocationDto {
  readonly id: string;
  readonly applicationId: string;
  readonly studentId: string;
  readonly bedId: string;
  readonly roomId: string;
  readonly status: AllocationStatus | string;
  readonly checkedInAt: string | null;
  readonly checkedOutAt: string | null;
  readonly checkOutType: CheckOutType | string | null;
}

export interface CheckOutRequest {
  /** Only read server-side when the caller isn't the owning student -- see class doc. */
  readonly checkOutType?: CheckOutType | string;
}

/** ASSUMED shape -- a read-only officer view, exact fields not enumerated in tickets.md. */
export interface AllocationReviewFlagDto {
  readonly id: string;
  readonly flag: string;
  readonly detail: string | null;
  readonly raisedAt: string;
}

// ---- Complaints ----

export interface CreateComplaintRequest {
  readonly AllocationId: string;
  readonly Category: ComplaintCategory | string;
  readonly Description: string;
  readonly IdempotencyKey?: string;
}

export interface ComplaintDto {
  readonly id: string;
  readonly allocationId: string;
  readonly category: ComplaintCategory | string;
  readonly description: string;
  readonly status: ComplaintStatus | string;
  readonly resolutionNote: string | null;
  readonly createdAt: string;
}

export interface ResolveComplaintRequest {
  readonly Status: 'InProgress' | 'Resolved' | 'Rejected';
  readonly ResolutionNote?: string | null;
}

/**
 * The three documented HTTP-409 `code` values a caller must branch on
 * (`UmsApiError.code`, already parsed off the real `ProblemDetails` body by `toUmsApiError`).
 * `allocation.no_bed_available`/`hostel_application.not_reviewable` are the routine, expected
 * app-level race outcome; `allocation.duplicate_value` is the rare DB-constraint backstop -- the
 * same user-facing message is fine for all three.
 */
export const HOSTEL_CONFLICT_CODES = [
  'allocation.no_bed_available',
  'hostel_application.not_reviewable',
  'allocation.duplicate_value',
] as const;

export function isHostelConflictCode(code: string | undefined): boolean {
  return !!code && (HOSTEL_CONFLICT_CODES as readonly string[]).includes(code);
}

export const HOSTEL_CONFLICT_MESSAGE =
  'This could not be completed because someone else acted first (e.g. the bed was just taken, or this was already reviewed). Refresh and try again.';
