import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { map, switchMap } from 'rxjs';
import { AuditApiService } from '@ums/shared';
import { UmsButtonComponent, UmsFormFieldComponent, UmsInputComponent } from '@ums/design-system';
import { HasPermissionDirective } from '../../../core/auth/permissions/has-permission.directive';
import { PERMISSION_KEYS } from '../../../core/auth/permissions/permission-keys';
import { AuditedActionService } from '../../../shared/confirmation/audited-action.service';
import { confirmLatestAuditEntry } from '../../../shared/confirmation/audit-lookup.util';
import { FacultyResearchProfileStore } from '../state/faculty-research-profile.store';
import type { PublicationDto } from '../faculty.types';

/**
 * ADMIN-26: ResearchProfile "moderation" for Public-Website-surfaced entries. `ums-core` has NO
 * moderation flag/state machine at all -- the single `PUT` this screen calls is immediately live on
 * the public, anonymous `GET` (confirmed, see `faculty.types.ts`'s own doc, which quotes the
 * backend's own source-code doc comment acknowledging this as a first-pass gap). This screen is
 * therefore direct editing, not a review queue -- still routed through confirmation-with-reason and
 * an audit-linked success toast (design-decisions.md) so every change to publicly-visible content
 * carries an explicit, traceable record of who changed what and why, even without a formal
 * moderation workflow to enforce it.
 */
@Component({
  selector: 'app-faculty-research-profile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UmsButtonComponent, UmsFormFieldComponent, UmsInputComponent, HasPermissionDirective],
  templateUrl: './faculty-research-profile.component.html',
  styleUrl: './faculty-research-profile.component.scss',
})
export class FacultyResearchProfileComponent {
  protected readonly store = inject(FacultyResearchProfileStore);
  protected readonly permissionKeys = PERMISSION_KEYS;

  private readonly auditApi = inject(AuditApiService);
  private readonly auditedAction = inject(AuditedActionService);

  protected readonly facultyMemberId = signal('');
  protected readonly draftPublications = signal<readonly PublicationDto[]>([]);
  protected readonly publicationTitle = signal('');
  protected readonly publicationVenue = signal('');
  protected readonly publicationYear = signal('');
  protected readonly publicationUrl = signal('');
  protected readonly ongoingResearch = signal('');
  protected readonly grants = signal('');

  protected loadProfile(): void {
    const id = this.facultyMemberId().trim();
    if (!id) return;
    this.store.loadProfile(id);
  }

  protected addDraftPublication(): void {
    const title = this.publicationTitle().trim();
    const venue = this.publicationVenue().trim();
    const year = Number(this.publicationYear());
    if (!title || !venue || !Number.isFinite(year)) return;
    this.draftPublications.update((publications) => [
      ...publications,
      { title, venue, year, url: this.publicationUrl().trim() || null },
    ]);
    this.publicationTitle.set('');
    this.publicationVenue.set('');
    this.publicationYear.set('');
    this.publicationUrl.set('');
  }

  protected removeDraftPublication(index: number): void {
    this.draftPublications.update((publications) => publications.filter((_, i) => i !== index));
  }

  protected submitUpdate(): void {
    const profile = this.store.currentProfile();
    const facultyMemberId = this.facultyMemberId().trim();
    if (!profile || !facultyMemberId) return;
    const sinceIso = new Date().toISOString();

    this.auditedAction
      .confirmAndRun({
        title: 'Update research profile',
        description: `This directly changes what is publicly visible for faculty member ${facultyMemberId} -- there is no moderation queue in ums-core today.`,
        perform: () =>
          this.store
            .updateProfile(facultyMemberId, {
              publications: this.draftPublications(),
              ongoingResearch: this.ongoingResearch().trim() || null,
              grants: this.grants().trim() || null,
              version: profile.version,
            })
            .pipe(
              switchMap((updated) =>
                confirmLatestAuditEntry(
                  this.auditApi,
                  'ResearchProfile',
                  updated.id,
                  sinceIso,
                ).pipe(map((auditEntryId) => ({ result: updated, auditEntryId }))),
              ),
            ),
        successMessage: (outcome) =>
          `Research profile updated (audit entry ${outcome.auditEntryId}).`,
        errorMessage: (error) => `Could not update research profile: ${error.message}`,
      })
      .subscribe();
  }
}
