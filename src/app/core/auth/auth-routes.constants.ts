/**
 * Canonical paths for the auth-adjacent screens (ADMIN-4), kept in one place so the login guard
 * (this file's sibling) and the actual route definitions (ADMIN-6) never drift apart.
 */
export const AUTH_ROUTES = {
  login: '/login',
  /** Where an authenticated staff member lands with nowhere more specific to go. */
  authenticatedHome: '/dashboard',
} as const;

/** Query param `authGuard` attaches so the login screen can return the caller to where they were headed. */
export const RETURN_URL_QUERY_PARAM = 'returnUrl';
