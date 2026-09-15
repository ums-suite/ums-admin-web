import { TestBed } from '@angular/core/testing';
import { ConfirmationService } from './confirmation.service';

describe('ConfirmationService', () => {
  let service: ConfirmationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ConfirmationService);
  });

  it('has no current request initially', () => {
    expect(service.current()).toBeNull();
  });

  it('sets current on requestReason and clears it, emitting the reason, on confirm', () => {
    const emitted: (string | null)[] = [];
    let completed = false;
    service.requestReason({ title: 'Deactivate user' }).subscribe({
      next: (reason) => emitted.push(reason),
      complete: () => (completed = true),
    });

    expect(service.current()).toEqual({ title: 'Deactivate user' });

    service.confirm('No longer employed here');

    expect(service.current()).toBeNull();
    expect(emitted).toEqual(['No longer employed here']);
    expect(completed).toBeTrue();
  });

  it('emits null and clears current on cancel', () => {
    const emitted: (string | null)[] = [];
    service.requestReason({ title: 'Deactivate user' }).subscribe((reason) => emitted.push(reason));

    service.cancel();

    expect(service.current()).toBeNull();
    expect(emitted).toEqual([null]);
  });

  it('a second request replaces the first', () => {
    service.requestReason({ title: 'First' }).subscribe();
    service.requestReason({ title: 'Second' }).subscribe();

    expect(service.current()).toEqual({ title: 'Second' });
  });
});
