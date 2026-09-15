import { TestBed } from '@angular/core/testing';
import { ConfirmationService } from './confirmation.service';
import { ConfirmationDialogHostComponent } from './confirmation-dialog-host.component';

describe('ConfirmationDialogHostComponent', () => {
  let confirmation: ConfirmationService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmationDialogHostComponent],
    }).compileComponents();
    confirmation = TestBed.inject(ConfirmationService);
  });

  it('renders nothing when there is no current request', () => {
    const fixture = TestBed.createComponent(ConfirmationDialogHostComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('ums-confirmation-dialog')).toBeNull();
  });

  it('renders the dialog with the current request title once one is open', () => {
    const fixture = TestBed.createComponent(ConfirmationDialogHostComponent);
    confirmation.requestReason({ title: 'Deactivate user' }).subscribe();
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('ums-confirmation-dialog');
    expect(dialog).not.toBeNull();
  });

  it('forwards a confirmed reason to ConfirmationService.confirm', () => {
    const fixture = TestBed.createComponent(ConfirmationDialogHostComponent);
    const emitted: (string | null)[] = [];
    confirmation
      .requestReason({ title: 'Deactivate user' })
      .subscribe((reason) => emitted.push(reason));
    fixture.detectChanges();

    fixture.componentInstance['onConfirmed']('Left the institution');

    expect(emitted).toEqual(['Left the institution']);
  });

  it('forwards a cancellation to ConfirmationService.cancel', () => {
    const fixture = TestBed.createComponent(ConfirmationDialogHostComponent);
    const emitted: (string | null)[] = [];
    confirmation
      .requestReason({ title: 'Deactivate user' })
      .subscribe((reason) => emitted.push(reason));
    fixture.detectChanges();

    fixture.componentInstance['onCancelled']();

    expect(emitted).toEqual([null]);
  });
});
