import { Injectable, signal } from '@angular/core';

/**
 * ADMIN-6: tiny shared open/close state for the app-wide command palette -- the ⌘K/Ctrl+K
 * keydown listener itself lives inside `@ums/design-system`'s `UmsCommandPaletteComponent` (a
 * controlled component: it only ever *requests* an open/close via its own outputs), so something
 * outside it has to own the actual boolean this app renders `[open]` from. Root-provided so any
 * future non-shell trigger (e.g. a "Search" nav item) can open it without reaching into the shell
 * component's internals.
 */
@Injectable({ providedIn: 'root' })
export class CommandPaletteStateService {
  private readonly _open = signal(false);
  readonly open = this._open.asReadonly();

  show(): void {
    this._open.set(true);
  }

  hide(): void {
    this._open.set(false);
  }

  toggle(): void {
    this._open.update((value) => !value);
  }
}
