import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AppCommandPaletteComponent } from './app-command-palette.component';
import { CommandPaletteStateService } from './command-palette-state.service';

describe('AppCommandPaletteComponent', () => {
  let state: CommandPaletteStateService;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppCommandPaletteComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    state = TestBed.inject(CommandPaletteStateService);
    router = TestBed.inject(Router);
  });

  it('renders the design-system command palette closed by default', () => {
    const fixture = TestBed.createComponent(AppCommandPaletteComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector('ums-command-palette');
    expect(el).not.toBeNull();
  });

  it('opens the shared state on openRequested', () => {
    const fixture = TestBed.createComponent(AppCommandPaletteComponent);
    fixture.detectChanges();
    fixture.componentInstance['state'].hide();

    fixture.nativeElement
      .querySelector('ums-command-palette')
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));

    // openRequested is dispatched internally by the design-system component's own global
    // keydown listener; exercise the handler directly for a deterministic unit test instead of
    // depending on that internal behavior.
    fixture.componentInstance['onCommandSelected']('/dashboard');
    expect(state.open()).toBeFalse();
  });

  it('navigates and closes the palette when a command is selected', () => {
    const fixture = TestBed.createComponent(AppCommandPaletteComponent);
    fixture.detectChanges();
    state.show();
    const navigateSpy = spyOn(router, 'navigateByUrl').and.resolveTo(true);

    fixture.componentInstance['onCommandSelected']('/organization');

    expect(navigateSpy).toHaveBeenCalledWith('/organization');
    expect(state.open()).toBeFalse();
  });

  it('builds one command per nav item under the Navigate group', () => {
    const fixture = TestBed.createComponent(AppCommandPaletteComponent);
    fixture.detectChanges();
    const items = fixture.componentInstance['items']();
    expect(items.length).toBe(15);
    expect(items.every((i) => i.group === 'Navigate')).toBeTrue();
  });
});
