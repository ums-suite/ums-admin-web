import type { ThemeService } from '@ums/design-system';
import { applyOperationalTheme } from './apply-operational-theme';

describe('applyOperationalTheme', () => {
  const THEME_MODE_STORAGE_KEY = 'ums-design-system:theme-mode';

  function fakeTheme(): jasmine.SpyObj<ThemeService> {
    return jasmine.createSpyObj<ThemeService>('ThemeService', ['setRegister', 'setMode']);
  }

  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('always sets the operational typography register', () => {
    const theme = fakeTheme();
    applyOperationalTheme(theme);
    expect(theme.setRegister).toHaveBeenCalledWith('operational');
  });

  it('defaults to dark mode when no preference was ever persisted', () => {
    const theme = fakeTheme();
    applyOperationalTheme(theme);
    expect(theme.setMode).toHaveBeenCalledWith('dark');
  });

  it('does not override an explicitly persisted preference', () => {
    localStorage.setItem(THEME_MODE_STORAGE_KEY, 'light');
    const theme = fakeTheme();
    applyOperationalTheme(theme);
    expect(theme.setMode).not.toHaveBeenCalled();
  });

  it('still defaults to dark when reading localStorage throws', () => {
    spyOn(localStorage, 'getItem').and.throwError('blocked');
    const theme = fakeTheme();
    expect(() => applyOperationalTheme(theme)).not.toThrow();
    expect(theme.setMode).toHaveBeenCalledWith('dark');
  });
});
