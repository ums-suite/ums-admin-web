import { EnvironmentProviders, inject, makeEnvironmentProviders } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  authInterceptor,
  correlationIdInterceptor,
  localeInterceptor,
  provideApi,
  UMS_AUTH_CONFIG,
} from '@ums/shared';
import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../config/app-config';
import { environment } from '../../../environments/environment';

/**
 * Wires this app's entire HTTP/API-client layer (ADMIN-3, requirement-spec.md §2 Backend access
 * row, §4 Observability row).
 *
 * Interceptor order matters, mirroring `@ums/shared`'s own README ("Wiring it up") and the
 * identical pattern already established in `ums-admission-web`/`ums-student-web`:
 * 1. {@link correlationIdInterceptor} first, so even a 401-triggered retry's very first attempt
 *    still carries a correlation id (requirement-spec.md §4: "correlation id surfaced on every
 *    error toast for support triage").
 * 2. {@link localeInterceptor} next, so every call (including the retry) carries the active
 *    locale (ADR-0011).
 * 3. {@link authInterceptor} last -- it's the one that clones the request again for a retry and
 *    reads/attaches the bearer token; its own third-party-origin token-leak bug is already fixed
 *    upstream (checks the request's origin against `config.baseUrl` before attaching), so it is
 *    used here with no workaround.
 *
 * `provideApi` wires `@ums/shared`'s generated OpenAPI client (Identity/Audit/Organization today
 * -- see `core/http/*.gap.md`-style PR notes for the remaining 12 modules this app also needs)
 * with the same base URL as {@link UMS_AUTH_CONFIG}, so the generated client, the refresh
 * coordinator, and the interceptor chain above are all always pointed at the same origin.
 */
export function provideCoreHttp(): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: APP_CONFIG,
      useValue: { ...DEFAULT_APP_CONFIG, apiBaseUrl: environment.apiBaseUrl },
    },
    provideHttpClient(
      withInterceptors([correlationIdInterceptor, localeInterceptor, authInterceptor]),
    ),
    {
      provide: UMS_AUTH_CONFIG,
      useFactory: () => ({ baseUrl: inject(APP_CONFIG).apiBaseUrl }),
    },
    provideApi({ basePath: environment.apiBaseUrl }),
  ]);
}
