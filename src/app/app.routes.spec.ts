import { routes } from './app.routes';

describe('app routes', () => {
  it('has a guest-only login route and an authenticated forbidden route', () => {
    expect(routes.find((r) => r.path === 'login')).toBeTruthy();
    expect(routes.find((r) => r.path === 'forbidden')).toBeTruthy();
  });

  it('guards the shell with authGuard and redirects the empty path to dashboard', () => {
    const shell = routes.find((r) => r.path === '');
    expect(shell?.canActivate).toBeDefined();
    const indexRedirect = shell?.children?.find((c) => c.path === '');
    expect(indexRedirect?.redirectTo).toBe('dashboard');
  });

  it('has one child route per module in the 15-module IA plus Dashboard', () => {
    const shell = routes.find((r) => r.path === '');
    const topLevelPaths = (shell?.children ?? []).map((c) => c.path);
    for (const expected of [
      'dashboard',
      'identity',
      'organization',
      'admission',
      'academic',
      'student',
      'faculty',
      'finance',
      'hostel',
      'library',
      'content',
      'documents',
      'reporting',
      'audit',
      'configuration',
    ]) {
      expect(topLevelPaths).toContain(expected);
    }
  });

  it('gates the Identity Roles sub-route behind its own, narrower permission', () => {
    const shell = routes.find((r) => r.path === '');
    const identity = shell?.children?.find((c) => c.path === 'identity');
    const roles = identity?.children?.find((c) => c.path === 'roles');
    expect(roles?.canActivate).toBeDefined();
  });
});
