import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Observable, of } from 'rxjs';
import { IdentityApiService } from '@ums/shared';
import { AppShellComponent } from './app-shell.component';
import { GlobalStore } from '../core/store/global.store';

describe('AppShellComponent', () => {
  let identityApiSpy: { apiV1IdentityAuthLogoutPost: jasmine.Spy<() => Observable<unknown>> };
  let router: Router;

  beforeEach(async () => {
    identityApiSpy = { apiV1IdentityAuthLogoutPost: jasmine.createSpy().and.returnValue(of({})) };

    await TestBed.configureTestingModule({
      imports: [AppShellComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: IdentityApiService, useValue: identityApiSpy },
      ],
    }).compileComponents();
    router = TestBed.inject(Router);
  });

  it('builds 15 nav items from the module IA', () => {
    const fixture = TestBed.createComponent(AppShellComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance['navItems']().length).toBe(15);
  });

  it('marks the nav item matching the current URL as active', () => {
    spyOnProperty(router, 'url', 'get').and.returnValue('/student/records');
    const fixture = TestBed.createComponent(AppShellComponent);
    fixture.detectChanges();
    const active = fixture.componentInstance['navItems']().filter((i) => i.active);
    expect(active.length).toBe(1);
    expect(active[0].path).toBe('/student/records');
  });

  it('navigates when a nav item is clicked', () => {
    const fixture = TestBed.createComponent(AppShellComponent);
    fixture.detectChanges();
    const navigateSpy = spyOn(router, 'navigateByUrl').and.resolveTo(true);

    fixture.componentInstance['onNavItemClick']({ label: 'Organization', href: '/organization' });

    expect(navigateSpy).toHaveBeenCalledWith('/organization');
  });

  it('cycles the theme mode dark -> light -> system -> dark', () => {
    const fixture = TestBed.createComponent(AppShellComponent);
    fixture.detectChanges();
    const store = TestBed.inject(GlobalStore);
    store.setThemeMode('dark');

    fixture.componentInstance['toggleTheme']();
    expect(store.themeMode()).toBe('light');
    fixture.componentInstance['toggleTheme']();
    expect(store.themeMode()).toBe('system');
    fixture.componentInstance['toggleTheme']();
    expect(store.themeMode()).toBe('dark');
  });

  it('opens the command palette', () => {
    const fixture = TestBed.createComponent(AppShellComponent);
    fixture.detectChanges();
    fixture.componentInstance['openCommandPalette']();
    expect(fixture.componentInstance['commandPalette'].open()).toBeTrue();
  });

  it('logs out and navigates to /login on success', () => {
    const fixture = TestBed.createComponent(AppShellComponent);
    fixture.detectChanges();
    const navigateSpy = spyOn(router, 'navigateByUrl').and.resolveTo(true);

    fixture.componentInstance['logout']();

    expect(identityApiSpy.apiV1IdentityAuthLogoutPost).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith('/login');
  });
});
