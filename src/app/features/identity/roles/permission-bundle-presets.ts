/**
 * ADMIN-35: Permission-bundle presets -- this concept **does not exist server-side** distinct
 * from Role -- a `Role` literally IS "the permission bundle" per `ums-core`'s own code comments,
 * and ADMIN-11 already built its full CRUD (`IdentityRolesStore`, `RolesListComponent`). No
 * clone/delete/preset-catalog endpoint exists anywhere.
 *
 * The only honest implementation: a small HARDCODED client-side list of a few starter presets
 * that pre-fill the EXISTING create-role form/store from ADMIN-11 when picked -- never a new
 * backend-backed screen, never a fabricated "preset" entity. Picking one is purely a same-session
 * form-prefill convenience; the resulting Role is still created through the ordinary
 * `IdentityRolesStore.createRole` call, going through the real backend validation exactly as if
 * every checkbox had been ticked by hand.
 */
export interface PermissionBundlePreset {
  readonly name: string;
  readonly description: string;
  readonly permissions: readonly string[];
}

export const PERMISSION_BUNDLE_PRESETS: readonly PermissionBundlePreset[] = [
  {
    name: 'Registrar starter bundle',
    description: 'Read/manage student records, organization hierarchy, and academic curriculum.',
    permissions: [
      'student.profile.read',
      'student.status.change',
      'organization.hierarchy.read',
      'academic.curriculum.manage',
      'academic.courseoffering.manage',
    ],
  },
  {
    name: 'Accountant starter bundle',
    description: 'Fee structures, invoice/payment oversight, and ledger inspection.',
    permissions: [
      'finance.feestructure.manage',
      'finance.invoice.read',
      'finance.payment.read',
      'finance.payment.refund',
      'finance.ledger.read',
    ],
  },
  {
    name: 'Hostel warden starter bundle',
    description: 'Application review, allocation check-in/out, and complaint resolution.',
    permissions: [
      'hostel.application.review',
      'hostel.allocation.checkin',
      'hostel.allocation.checkout',
      'hostel.complaint.resolve',
    ],
  },
  {
    name: 'Librarian starter bundle',
    description: 'Catalog management, loan issue/manage, and fine waiver.',
    permissions: [
      'library.catalog.manage',
      'library.loan.issue',
      'library.loan.manage',
      'library.fine.waive',
    ],
  },
];
