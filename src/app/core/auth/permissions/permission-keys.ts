/**
 * ADMIN-5/ADMIN-6: permission-string constants used to gate routes/controls across this app.
 *
 * `ums-shared`'s own `hasPermission` doc comment confirms the real key FORMAT ums-core issues --
 * `<owning-module>.<resource>.<action>` (its own literal examples: `"identity.role.manage"`,
 * `"organization.faculty.write"`) -- and a handful of these are directly confirmed against
 * `ums-core`'s real Identity/Student/Admission source (`IdentityPermissions`,
 * `StudentPermissions`, `AdmissionPermissions` C# constants, read directly, not guessed):
 * `UserRead`, `UserManage`, `RoleManage`, `RoleAssign`, `PermissionRead` (Identity);
 * `ProfileRead`, `StatusChange`, `BulkImportExecute`, `RequestReview` (Student);
 * `CampaignManage`, `ApplicationReview` (Admission).
 *
 * Everything else below (Organization/Academic/Faculty/Finance/Hostel/Library/Content/
 * Documents/Reporting/Audit/Configuration keys) is this app's OWN BEST-EFFORT, ASSUMED literal
 * string, following the confirmed `<module>.<resource>.<action>` format but not independently
 * verified against `GET /api/v1/identity/permissions`'s real catalog (that call requires a live
 * backend + an authenticated privileged session, unavailable while building this app standalone).
 * Flagged explicitly in this app's PR: confirm every assumed key against the real catalog before
 * relying on it in production, and correct any mismatch here in one place.
 */
export const PERMISSION_KEYS = {
  identity: {
    userRead: 'identity.user.read',
    userManage: 'identity.user.manage',
    roleManage: 'identity.role.manage',
    roleAssign: 'identity.role.assign',
    permissionRead: 'identity.permission.read',
  },
  // ASSUMED beyond this point -- see class doc.
  organization: {
    manage: 'organization.hierarchy.manage',
    read: 'organization.hierarchy.read',
  },
  admission: {
    campaignManage: 'admission.campaign.manage',
    applicationReview: 'admission.application.review',
  },
  student: {
    profileRead: 'student.profile.read',
    statusChange: 'student.status.change',
    bulkImportExecute: 'student.bulk-import.execute',
    requestReview: 'student.request.review',
  },
  reporting: {
    // These four match ums-core's real, confirmed per-domain permission-gating pattern
    // ("each its own permission (reporting.dashboard.<domain>)") for the domains
    // requirement-spec.md §7 names by example (enrollment funnel, collection rate, occupancy,
    // GPA distribution) -- the exact literal strings are still this app's own assumed guess.
    dashboardAdmission: 'reporting.dashboard.admission',
    dashboardFinancial: 'reporting.dashboard.financial',
    dashboardHostel: 'reporting.dashboard.hostel',
    dashboardAcademic: 'reporting.dashboard.academic',
  },
} as const;
