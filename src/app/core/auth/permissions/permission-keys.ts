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
 * `CampaignManage`, `ApplicationReview` (Admission);
 * `Generate`, `Read`, `Revoke` (Documents -- `UMS.Modules.Documents.Application.Permissions.DocumentPermissions`,
 * whose own doc comment confirms these three are deliberately THREE-segment keys
 * (`document.document.<action>`), a documented deviation from the module's own two-segment
 * `document.<action>` spec literal, to satisfy Identity's real `<module>.<resource>.<action>`
 * catalog-validation pattern).
 *
 * The `academic`, `admission` (exam/merit/result keys), `finance`, and `faculty` sections below
 * are CONFIRMED REAL for ADMIN-18..26 -- read directly off each module's own
 * `Application/Permissions/<Module>Permissions.cs` C# constant declarations during this pass
 * (`AcademicPermissions`, `AdmissionPermissions`, `FinancePermissions`, `FacultyPermissions` in
 * `ums-core`'s real source), not guessed. `organization`/`admission.campaignManage`/
 * `admission.applicationReview`/`student` above predate this pass and are unchanged.
 *
 * Everything else below (Hostel/Library/Content/Documents/Reporting/Audit/Configuration keys) is
 * still this app's OWN BEST-EFFORT, ASSUMED literal string, following the confirmed
 * `<module>.<resource>.<action>` format but not independently verified against
 * `GET /api/v1/identity/permissions`'s real catalog (confirmed, still absent as of this pass --
 * see `permissions.service.ts`'s own doc for the fail-closed handling of that gap). Flagged
 * explicitly in this app's PR: confirm every remaining assumed key against the real catalog before
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
    // Confirmed real -- AdmissionPermissions.cs (ADMIN-19/20 pass).
    meritListGenerate: 'admission.meritlist.generate',
    meritListApprove: 'admission.meritlist.approve',
    resultPublish: 'admission.result.publish',
  },
  // Confirmed real -- AcademicPermissions.cs (ADMIN-18/21/22/23 pass).
  academic: {
    programManage: 'academic.program.manage',
    curriculumManage: 'academic.curriculum.manage',
    courseManage: 'academic.course.manage',
    academicSessionManage: 'academic.academicsession.manage',
    courseOfferingManage: 'academic.courseoffering.manage',
    attendanceRecord: 'academic.attendance.record',
    gradeEnter: 'academic.grade.enter',
    gradeLock: 'academic.grade.lock',
    gradeCorrect: 'academic.grade.correct',
    resultApprove: 'academic.result.approve',
    resultPublish: 'academic.result.publish',
    studentResultRead: 'academic.student.result.read',
  },
  // Confirmed real -- FinancePermissions.cs (ADMIN-24/25 pass).
  finance: {
    feeStructureManage: 'finance.feestructure.manage',
    invoiceCreate: 'finance.invoice.create',
    // Declared in ums-core's own permission manifest but NOT wired to any endpoint yet
    // (confirmed gap -- see finance.api.ts's own doc) -- kept here so this app's role/permission
    // administration screens (ADMIN-11) can still assign it ahead of the backend catching up.
    invoiceRead: 'finance.invoice.read',
    paymentInitiate: 'finance.payment.initiate',
    paymentRead: 'finance.payment.read',
    paymentRefund: 'finance.payment.refund',
    ledgerRead: 'finance.ledger.read',
    // Declared, but "no endpoint gates on it yet" per FinancePermissionManifest.cs's own doc
    // comment -- confirmed real string, confirmed real gap (see finance.api.ts).
    reconciliationReview: 'finance.reconciliation.review',
  },
  // Confirmed real -- FacultyPermissions.cs (ADMIN-26 pass).
  faculty: {
    profileRead: 'faculty.profile.read',
    profileUpdate: 'faculty.profile.update',
    memberManage: 'faculty.member.manage',
    courseAssignmentRead: 'faculty.courseassignment.read',
    leaveCreate: 'faculty.leave.create',
    leaveApproveDepartment: 'faculty.leave.approve.department',
    leaveApproveAuthority: 'faculty.leave.approve.authority',
    researchUpdate: 'faculty.research.update',
    researchPublish: 'faculty.research.publish',
  },
  student: {
    profileRead: 'student.profile.read',
    statusChange: 'student.status.change',
    bulkImportExecute: 'student.bulk-import.execute',
    requestReview: 'student.request.review',
  },
  // Confirmed real -- see class doc.
  documents: {
    generate: 'document.document.generate',
    read: 'document.document.read',
    revoke: 'document.document.revoke',
    // Confirmed real -- ADMIN-31 pass, Documents' own template/bulk-generation permission
    // manifest, deliberately two-segment (unlike the three above) per tickets.md's own literal.
    templateManage: 'document.template.manage',
    generateBulk: 'document.generate.bulk',
  },
  // Confirmed real -- `ReportingPermissions.cs` (ADMIN-32/33 pass): one `reporting.dashboard.
  // <domain>` permission per the 9 real dashboard domains (`DashboardEndpoints.cs`), plus
  // `reporting.regulatory.manage` (definitions CRUD) / `reporting.regulatory.run` (submit+poll a
  // RegulatoryReportRun).
  reporting: {
    dashboardAdmission: 'reporting.dashboard.admission',
    dashboardFinancial: 'reporting.dashboard.financial',
    dashboardHostel: 'reporting.dashboard.hostel',
    dashboardAcademic: 'reporting.dashboard.academic',
    dashboardFaculty: 'reporting.dashboard.faculty',
    dashboardLibrary: 'reporting.dashboard.library',
    dashboardContent: 'reporting.dashboard.content',
    dashboardAlumni: 'reporting.dashboard.alumni',
    dashboardCareer: 'reporting.dashboard.career',
    regulatoryManage: 'reporting.regulatory.manage',
    regulatoryRun: 'reporting.regulatory.run',
  },
  // Confirmed real -- `Audit/Application/Permissions` (ADMIN-34 pass).
  audit: {
    entryRead: 'audit.entry.read',
    exportGenerate: 'audit.export.generate',
  },
  // ASSUMED beyond this point again (Hostel/Library/Content/Notifications) -- literal strings
  // given directly by this batch's own ticket brief, following the confirmed
  // `<module>.<resource>.<action>` format but not independently re-verified against the real
  // permission catalog in this pass.
  hostel: {
    inventoryManage: 'hostel.inventory.manage',
    windowManage: 'hostel.window.manage',
    applicationReview: 'hostel.application.review',
    allocationCheckin: 'hostel.allocation.checkin',
    allocationCheckout: 'hostel.allocation.checkout',
    complaintResolve: 'hostel.complaint.resolve',
  },
  library: {
    catalogManage: 'library.catalog.manage',
    loanIssue: 'library.loan.issue',
    loanManage: 'library.loan.manage',
    fineWaive: 'library.fine.waive',
    copyWriteoff: 'library.copy.writeoff',
    reviewView: 'library.review.view',
  },
  content: {
    noticeWrite: 'content.notice.write',
    noticePublish: 'content.notice.publish',
    noticeRead: 'content.notice.read',
    eventWrite: 'content.event.write',
    bannerWrite: 'content.banner.write',
    bannerPublish: 'content.banner.publish',
  },
  notifications: {
    templateManage: 'notifications.template.manage',
  },
} as const;
