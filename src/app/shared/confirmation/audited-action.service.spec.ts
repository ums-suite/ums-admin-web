import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { UmsToastService } from '@ums/design-system';
import { ConfirmationService } from './confirmation.service';
import { AuditedActionService } from './audited-action.service';
import type { AuditedMutationOutcome } from './audited-action.types';

describe('AuditedActionService', () => {
  let service: AuditedActionService;
  let confirmation: ConfirmationService;
  let toast: UmsToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuditedActionService);
    confirmation = TestBed.inject(ConfirmationService);
    toast = TestBed.inject(UmsToastService);
  });

  it('does not call perform or show any toast when the user cancels', () => {
    const perform = jasmine.createSpy('perform');
    const emitted: (AuditedMutationOutcome | null)[] = [];

    service
      .confirmAndRun({
        title: 'Deactivate user',
        perform,
        successMessage: () => 'Deactivated',
      })
      .subscribe((v) => emitted.push(v));

    confirmation.cancel();

    expect(perform).not.toHaveBeenCalled();
    expect(toast.toasts()).toEqual([]);
    expect(emitted).toEqual([null]);
  });

  it('runs perform with the reason and shows a success toast naming the audit entry', () => {
    const outcome: AuditedMutationOutcome<{ userId: string }> = {
      result: { userId: 'u1' },
      auditEntryId: 'audit-123',
    };
    const perform = jasmine.createSpy('perform').and.returnValue(of(outcome));
    const emitted: (AuditedMutationOutcome | null)[] = [];

    service
      .confirmAndRun({
        title: 'Deactivate user',
        perform,
        successMessage: (o) => `Deactivated (audit ${o.auditEntryId})`,
      })
      .subscribe((v) => emitted.push(v));

    confirmation.confirm('No longer employed');

    expect(perform).toHaveBeenCalledWith('No longer employed');
    expect(emitted).toEqual([outcome]);
    expect(toast.toasts().length).toBe(1);
    expect(toast.toasts()[0].message).toBe('Deactivated (audit audit-123)');
    expect(toast.toasts()[0].variant).toBe('success');
  });

  it('shows an error toast and resolves null when perform fails, never a success toast', () => {
    const perform = () =>
      throwError(
        () =>
          new HttpErrorResponse({
            status: 500,
            error: { title: 'Server error' },
          }),
      );
    const emitted: (AuditedMutationOutcome | null)[] = [];

    service
      .confirmAndRun({
        title: 'Deactivate user',
        perform,
        successMessage: () => 'Deactivated',
        errorMessage: (e) => `Failed: ${e.message}`,
      })
      .subscribe((v) => emitted.push(v));

    confirmation.confirm('reason');

    expect(emitted).toEqual([null]);
    expect(toast.toasts().length).toBe(1);
    expect(toast.toasts()[0].variant).toBe('danger');
    expect(toast.toasts()[0].message).toBe('Failed: Server error');
  });

  it('falls back to the normalized API error message when no errorMessage is supplied', () => {
    const perform = (): Observable<AuditedMutationOutcome> =>
      throwError(
        () =>
          new HttpErrorResponse({
            status: 403,
            error: { title: 'Forbidden' },
          }),
      );

    service
      .confirmAndRun({
        title: 'Deactivate user',
        perform,
        successMessage: () => 'Deactivated',
      })
      .subscribe();

    confirmation.confirm('reason');

    expect(toast.toasts()[0].message).toBe('Forbidden');
  });
});
