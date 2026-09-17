import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { UmsTabBarComponent, type TabBarItem } from '@ums/design-system';
import { OrganizationDesignationsComponent } from './designations/organization-designations.component';
import { OrganizationFacilitiesComponent } from './facilities/organization-facilities.component';
import { OrganizationHierarchyComponent } from './hierarchy/organization-hierarchy.component';

const TABS: readonly TabBarItem[] = [
  { label: 'Hierarchy' },
  { label: 'Designations' },
  { label: 'Buildings & Rooms' },
];

/**
 * ADMIN-12: Organization Management module shell (requirement-spec.md §3.3) -- three tabs over
 * the existing, already-tested `OrganizationStore`/`OrganizationApi` data layer: the University
 * -> Campus -> Faculty -> Department -> Program hierarchy, the Designation catalog, and the
 * Building/Room registry. Each tab loads its own data lazily (only on first activation) via its
 * own `ngOnInit`, mirroring `UsersListComponent`'s tab pattern.
 */
@Component({
  selector: 'app-organization',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    UmsTabBarComponent,
    OrganizationHierarchyComponent,
    OrganizationDesignationsComponent,
    OrganizationFacilitiesComponent,
  ],
  templateUrl: './organization.component.html',
  styleUrl: './organization.component.scss',
})
export class OrganizationComponent {
  protected readonly tabs = TABS;
  protected readonly selectedTabIndex = signal(0);

  protected onTabChange(index: number): void {
    this.selectedTabIndex.set(index);
  }
}
