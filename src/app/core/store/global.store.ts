import { inject } from '@angular/core';
import { signalStore, withComputed, withMethods } from '@ngrx/signals';
import { CurrentUserService, LocaleService, type UmsLocale } from '@ums/shared';
import { ThemeService, type ThemeMode } from '@ums/design-system';
import { PermissionsService } from '../auth/permissions/permissions.service';

/**
 * ADMIN-3: the one small global NgRx Signal Store (requirement-spec.md §2 State management row:
 * "one global store (session, permissions, theme, locale)").
 *
 * **Substitution note, flagged explicitly per this app's own build brief:** requirement-spec.md
 * §2 asks for NgRx Signal Store specifically (unlike `ums-admission-web`/`ums-student-web`, which
 * used plain Angular `signal()`-based store classes). `@ngrx/signals@22.0.1` was confirmed
 * available and Angular-22-compatible against the real npm registry before choosing this --
 * it is used here as asked, not substituted.
 *
 * A thin facade over already-reactive services (`CurrentUserService`, `LocaleService`,
 * `ThemeService`, `PermissionsService`) -- this store deliberately never duplicates their state
 * (`withState` is unused here on purpose); it only gives the app shell and every feature a single
 * place to read "the current cross-cutting session context" via `withComputed`, exactly as
 * `ums-student-web`'s own `GlobalStore` class doc puts it: "this store does not duplicate their
 * state, it just gives ... a single place to read." Per-module feature-scoped stores
 * (`features/<module>/state/`) are each their own injectable, scoped to their own feature area --
 * this store is never a god-object those reach into for domain data.
 */
export const GlobalStore = signalStore(
  { providedIn: 'root' },
  withComputed(
    (
      _store,
      currentUser = inject(CurrentUserService),
      locale = inject(LocaleService),
      theme = inject(ThemeService),
      permissions = inject(PermissionsService),
    ) => ({
      userId: currentUser.userId,
      roles: currentUser.roles,
      locale: locale.locale,
      themeMode: theme.mode,
      resolvedTheme: theme.resolvedTheme,
      grantedPermissions: permissions.grantedPermissions,
      scopeGrants: permissions.scopeGrants,
      isPermissionsDegraded: permissions.isDegraded,
    }),
  ),
  withMethods((_store, locale = inject(LocaleService), theme = inject(ThemeService)) => ({
    setLocale(next: UmsLocale): void {
      locale.setLocale(next);
    },
    setThemeMode(next: ThemeMode): void {
      theme.setMode(next);
    },
  })),
);
