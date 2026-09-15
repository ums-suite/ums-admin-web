import { TestBed } from '@angular/core/testing';
import { CommandPaletteStateService } from './command-palette-state.service';

describe('CommandPaletteStateService', () => {
  let service: CommandPaletteStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CommandPaletteStateService);
  });

  it('starts closed', () => {
    expect(service.open()).toBeFalse();
  });

  it('show() opens it', () => {
    service.show();
    expect(service.open()).toBeTrue();
  });

  it('hide() closes it', () => {
    service.show();
    service.hide();
    expect(service.open()).toBeFalse();
  });

  it('toggle() flips it', () => {
    service.toggle();
    expect(service.open()).toBeTrue();
    service.toggle();
    expect(service.open()).toBeFalse();
  });
});
