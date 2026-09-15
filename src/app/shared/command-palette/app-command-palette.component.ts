import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { type CommandPaletteItem, UmsCommandPaletteComponent } from '@ums/design-system';
import { NAV_ITEMS } from '../../shell/nav-items';
import { CommandPaletteStateService } from './command-palette-state.service';

/**
 * ADMIN-6: the app-wide Command Palette (requirement-spec.md §2 Command palette row, §7's
 * "beauty" note: "a command palette that makes a 15-module console feel like one fast tool
 * instead of fifteen bolted-together screens"). Thin wrapper over
 * `@ums/design-system`'s `UmsCommandPaletteComponent`, which already owns the global ⌘K/Ctrl+K
 * listener itself -- this component only supplies the item list, the open/close state
 * ({@link CommandPaletteStateService}), and turns a selected item id into a navigation.
 *
 * **Scope note, flagged rather than faked:** this pass wires quick-navigation across the
 * 15-module IA only. Live global entity search (applicants/students/courses/invoices,
 * requirement-spec.md §3.1) is NOT implemented here for two confirmed, independent reasons: (1)
 * `UmsCommandPaletteComponent`'s current public API has no output exposing its in-progress query
 * text, so nothing outside it can drive a debounced server-backed search as the user types; (2)
 * reading `ums-core`'s real Admission/Student module source directly confirmed there is no
 * list/search endpoint for applicants, applications, or students today (only single-record
 * get-by-id and self-service `/me` routes exist) -- there is nothing to search against yet even
 * if (1) were solved. Both gaps are flagged for a follow-up once either side adds the missing
 * capability, rather than shipping a search box that can never return results.
 */
@Component({
  selector: 'app-command-palette',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UmsCommandPaletteComponent],
  template: `
    <ums-command-palette
      [open]="state.open()"
      [items]="items()"
      placeholder="Jump to a module..."
      (openRequested)="state.show()"
      (closed)="state.hide()"
      (commandSelected)="onCommandSelected($event)"
    />
  `,
})
export class AppCommandPaletteComponent {
  protected readonly state = inject(CommandPaletteStateService);
  private readonly router = inject(Router);

  protected readonly items = computed<readonly CommandPaletteItem[]>(() =>
    NAV_ITEMS.map((item) => ({
      id: item.path,
      label: item.label,
      group: 'Navigate',
      icon: item.icon,
    })),
  );

  protected onCommandSelected(commandId: string): void {
    this.state.hide();
    void this.router.navigateByUrl(commandId);
  }
}
