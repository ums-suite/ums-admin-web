import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { GlobalStore } from './global.store';

describe('GlobalStore', () => {
  let store: InstanceType<typeof GlobalStore>;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(GlobalStore);
  });

  afterEach(() => localStorage.clear());

  it('defaults to the English locale', () => {
    expect(store.locale()).toBe('en');
  });

  it('setLocale updates the reactive locale signal', () => {
    store.setLocale('bn');
    expect(store.locale()).toBe('bn');
  });

  it('setThemeMode updates the reactive theme mode signal', () => {
    store.setThemeMode('dark');
    expect(store.themeMode()).toBe('dark');
  });

  it('starts with zero granted permissions and an unloaded (non-degraded) session', () => {
    expect(store.grantedPermissions()).toEqual([]);
    expect(store.scopeGrants()).toEqual([]);
    expect(store.isPermissionsDegraded()).toBeFalse();
  });
});
