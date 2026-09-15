import { ThemeService } from '@ums/design-system';

/**
 * ADMIN-2: this app consumes `@ums/design-system` at the "operational" register
 * (requirement-spec.md §2 Design system row, §7) and defaults to dark mode for long admin
 * sessions (§7: "Dark mode is fully supported, expected to be the default for long admin
 * sessions"), unlike every other UMS app which stays on the design system's own defaults
 * (`register: 'marketing'`, `mode: 'system'`).
 *
 * Called from a `provideAppInitializer` in `app.config.ts` (not injected for a side effect in the
 * `App` component's constructor, unlike `SessionExpiryService`) so both attributes are applied to
 * `<html>` before the router/App component tree ever renders -- avoiding a flash of the wrong
 * register (serif `--type-heading-1`) or the wrong theme (light) on first paint.
 *
 * `THEME_MODE_STORAGE_KEY` duplicates `@ums/design-system`'s own private, unexported
 * `THEME_STORAGE_KEY` constant (`ums-design-system:theme-mode`) so this app can distinguish "the
 * user (on this device) has never expressed a preference" (apply the dark default) from "the
 * user explicitly chose 'system' or 'light'" (respect it, never override). `ThemeService` itself
 * cannot make this distinction -- its own `mode` signal already defaults to `'system'` whether or
 * not anything was ever persisted. This is a deliberate, documented coupling to a library
 * implementation detail; flagged in this app's PR as a follow-up for `@ums/design-system` to
 * expose a public "has an explicit preference been persisted?" query instead.
 */
const THEME_MODE_STORAGE_KEY = 'ums-design-system:theme-mode';

export function applyOperationalTheme(theme: ThemeService): void {
  theme.setRegister('operational');

  if (!hasPersistedThemeModePreference()) {
    theme.setMode('dark');
  }
}

function hasPersistedThemeModePreference(): boolean {
  try {
    return localStorage.getItem(THEME_MODE_STORAGE_KEY) !== null;
  } catch {
    // Private-browsing/storage-disabled: treat as "no preference recorded" -- the dark default
    // still applies for this session, it just won't persist across a reload.
    return false;
  }
}
