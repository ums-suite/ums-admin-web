import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toUmsApiError } from '@ums/shared';
import {
  UmsButtonComponent,
  UmsDataTableComponent,
  UmsFormFieldComponent,
  UmsInputComponent,
  UmsToastService,
  type DataTableColumn,
} from '@ums/design-system';
import { HasPermissionDirective } from '../../../core/auth/permissions/has-permission.directive';
import { PERMISSION_KEYS } from '../../../core/auth/permissions/permission-keys';
import { VersionConflictBannerComponent } from '../../../shared/conflict/version-conflict-banner.component';
import { ContentBannersStore } from '../state/content-banners.store';
import type { BannerDto } from '../content.types';

const COLUMNS: readonly DataTableColumn<BannerDto>[] = [
  { id: 'headline', header: 'Headline', accessor: (r) => r.headline, sortable: true },
  { id: 'sortOrder', header: 'Sort order', accessor: (r) => r.sortOrder, numeric: true },
  { id: 'status', header: 'Status', accessor: (r) => r.status, sortable: true },
];

/**
 * ADMIN-30: Banner create/edit + schedule/publish/archive (`content.banner.publish` gates both
 * publish and archive -- there is no separate archive permission). **No translations at all** --
 * Banner is explicitly not localized, unlike Notice/Event, so this screen has no language field.
 */
@Component({
  selector: 'app-content-banners',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    UmsButtonComponent,
    UmsDataTableComponent,
    UmsFormFieldComponent,
    UmsInputComponent,
    HasPermissionDirective,
    VersionConflictBannerComponent,
  ],
  templateUrl: './content-banners.component.html',
  styleUrl: './content-banners.component.scss',
})
export class ContentBannersComponent {
  protected readonly store = inject(ContentBannersStore);
  protected readonly permissionKeys = PERMISSION_KEYS;
  protected readonly columns = COLUMNS;
  protected readonly rowId = (row: { readonly id: string }): string => row.id;

  private readonly toast = inject(UmsToastService);
  protected readonly conflictBannerId = signal<string | null>(null);

  protected readonly newHeadline = signal('');
  protected readonly newImageUrl = signal('');
  protected readonly newLinkUrl = signal('');
  protected readonly newSortOrder = signal('1');

  protected loadBanners(): void {
    this.store.loadBanners();
  }

  protected submitCreate(): void {
    const headline = this.newHeadline().trim();
    const imageUrl = this.newImageUrl().trim();
    const sortOrder = Number(this.newSortOrder());
    if (!headline || !imageUrl || !Number.isFinite(sortOrder)) return;
    this.store
      .createBanner({
        Headline: headline,
        ImageUrl: imageUrl,
        LinkUrl: this.newLinkUrl().trim() || null,
        SortOrder: sortOrder,
      })
      .subscribe(() => {
        this.newHeadline.set('');
        this.newImageUrl.set('');
      });
  }

  protected transition(banner: BannerDto, action: 'schedule' | 'publish' | 'archive'): void {
    this.conflictBannerId.set(null);
    const request = { Version: banner.version };
    const call =
      action === 'schedule'
        ? this.store.scheduleBanner(banner.id, request)
        : action === 'publish'
          ? this.store.publishBanner(banner.id, request)
          : this.store.archiveBanner(banner.id, request);
    const pastTense: Record<typeof action, string> = {
      schedule: 'scheduled',
      publish: 'published',
      archive: 'archived',
    };
    call.subscribe({
      next: () => this.toast.show(`Banner ${pastTense[action]}.`, { variant: 'success' }),
      error: (e: unknown) => {
        if (e instanceof HttpErrorResponse && e.status === 409) {
          this.conflictBannerId.set(banner.id);
        } else {
          this.toast.show(toUmsApiError(e).message, { variant: 'danger' });
        }
      },
    });
  }

  protected reloadAfterConflict(): void {
    this.conflictBannerId.set(null);
    this.store.loadBanners();
  }
}
