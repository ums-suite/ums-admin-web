import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { TokenStorageService } from '@ums/shared';
import { ThemeService } from '@ums/design-system';
import { provideCoreHttp } from './core/http/provide-core-http';
import { applyOperationalTheme } from './core/theme/apply-operational-theme';
import { PermissionsService } from './core/auth/permissions/permissions.service';
import { routes } from './app.routes';

/**
 * ADMIN-1/ADMIN-2/ADMIN-3/ADMIN-5 root providers. CSR only -- no `provideClientHydration`/SSR
 * bootstrap anywhere in this app (requirement-spec.md §2 Rendering row, §10 item 1: "No SSR --
 * RESOLVED, final"); there is no anonymous or SEO-relevant traffic to this internal console.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideCoreHttp(),
    // Runs before the router/App component tree renders, so the operational register + dark
    // default are on <html> before first paint -- see applyOperationalTheme's own doc for why
    // this can't just be an injected-for-side-effect service like SessionExpiryService.
    provideAppInitializer(() => applyOperationalTheme(inject(ThemeService))),
    // ADMIN-5: "permissions ... fetched at session start" also covers a page reload/relaunch
    // while an access token already exists (AuthService.login's own load() call only covers a
    // fresh interactive login) -- without this, a reloaded tab would render every permission-
    // gated control as absent until some other trigger happened to call load()/revalidate().
    // Best-effort: PermissionsService.load() never throws (fails closed internally), so this
    // never blocks bootstrap even if the endpoint is unavailable.
    provideAppInitializer(() => {
      const tokenStorage = inject(TokenStorageService);
      const permissions = inject(PermissionsService);
      if (tokenStorage.isAuthenticated()) {
        return permissions.load();
      }
      return undefined;
    }),
  ],
};
