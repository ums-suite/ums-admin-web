import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import {
  type AppShellNavItem,
  UmsAppShellComponent,
  UmsIconButtonComponent,
} from '@ums/design-system';
import { AuthService } from '../core/auth/auth.service';
import { GlobalStore } from '../core/store/global.store';
import { AppCommandPaletteComponent } from '../shared/command-palette/app-command-palette.component';
import { CommandPaletteStateService } from '../shared/command-palette/command-palette-state.service';
import { NAV_ITEMS, type AdminNavItem } from './nav-items';

interface ShellNavItem extends AppShellNavItem {
  readonly path: string;
}

/**
 * ADMIN-6: the authenticated app shell -- top bar + collapsible side nav, `mode="operational"`
 * per requirement-spec.md §7's "operational register" (this is a daily-use back-office console,
 * not a marketing mega-menu surface). Wraps `@ums/design-system`'s `UmsAppShellComponent`, owns
 * nav-item-to-route mapping (the design system component only emits `navItemClick`, it never
 * navigates itself), and hosts the command palette trigger and theme toggle.
 */
@Component({
  selector: 'app-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, UmsAppShellComponent, UmsIconButtonComponent, AppCommandPaletteComponent],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
})
export class AppShellComponent {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  protected readonly globalStore = inject(GlobalStore);
  protected readonly commandPalette = inject(CommandPaletteStateService);

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  protected readonly navItems = computed<ShellNavItem[]>(() => {
    const url = this.currentUrl();
    return NAV_ITEMS.map((item: AdminNavItem) => ({
      label: item.label,
      icon: item.icon,
      href: item.path,
      path: item.path,
      active: url.startsWith(item.path),
    }));
  });

  protected onNavItemClick(item: AppShellNavItem): void {
    const path = (item as ShellNavItem).path ?? item.href;
    if (path) {
      void this.router.navigateByUrl(path);
    }
  }

  protected toggleTheme(): void {
    const order: readonly ('light' | 'dark' | 'system')[] = ['dark', 'light', 'system'];
    const current = this.globalStore.themeMode();
    const next = order[(order.indexOf(current) + 1) % order.length];
    this.globalStore.setThemeMode(next);
  }

  protected openCommandPalette(): void {
    this.commandPalette.show();
  }

  protected logout(): void {
    this.authService.logout().subscribe({
      complete: () => void this.router.navigateByUrl('/login'),
      error: () => void this.router.navigateByUrl('/login'),
    });
  }
}
