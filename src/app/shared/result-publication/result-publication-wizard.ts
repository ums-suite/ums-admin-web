import { Signal, WritableSignal, computed, signal } from '@angular/core';
import { Observable, catchError, map, of, switchMap, tap } from 'rxjs';
import { toUmsApiError } from '@ums/shared';
import type {
  ResultPublicationStepDefinition,
  ResultPublicationWizardDeps,
  ResultPublicationWizardStatus,
} from './result-publication-wizard.types';

/**
 * ADMIN-20/ADMIN-23: the one shared step-transition state machine behind every "deliberately slow,
 * multi-step, elevated-permission" Result Publication control in this app (design-decisions.md;
 * requirement-spec.md §7, §8 invariant #3) -- see `result-publication-wizard.types.ts`'s own doc
 * for the full status-transition rationale and edge-cases.md's "A Super Admin Revokes a Staff
 * Member's Role Mid-Way Through a Multi-Step Action" resolution this class directly implements.
 *
 * Deliberately a plain class, not an `@Injectable`/NgRx Signal Store -- exactly one wizard instance
 * exists per open flow (never a shared singleton two open tabs would fight over), constructed by
 * the feature component with its own step list, its own initial context, and the shared
 * {@link ResultPublicationWizardDeps} (in practice, `PermissionsService.revalidate`). This mirrors
 * `@ums/design-system`'s own guidance that a wizard's progress state is the CALLER's concern, not
 * a global store's.
 */
export class ResultPublicationWizard<TContext> {
  private readonly _stepIndex = signal(0);
  private readonly _status = signal<ResultPublicationWizardStatus>('authorizing');
  private readonly _context: WritableSignal<TContext>;
  private readonly _errorMessage = signal<string | null>(null);

  readonly stepIndex: Signal<number> = this._stepIndex.asReadonly();
  readonly status: Signal<ResultPublicationWizardStatus> = this._status.asReadonly();
  readonly context: Signal<TContext>;
  readonly errorMessage: Signal<string | null> = this._errorMessage.asReadonly();

  readonly currentStep = computed(() => this.steps[this._stepIndex()]);
  readonly isLastStep = computed(() => this._stepIndex() === this.steps.length - 1);
  readonly isTerminal = computed(() => {
    const status = this._status();
    return status === 'revoked' || status === 'completed';
  });

  constructor(
    private readonly steps: readonly ResultPublicationStepDefinition<TContext>[],
    initialContext: TContext,
    private readonly deps: ResultPublicationWizardDeps,
  ) {
    if (steps.length === 0) {
      throw new Error('ResultPublicationWizard requires at least one step.');
    }
    this._context = signal(initialContext);
    this.context = this._context.asReadonly();
  }

  /**
   * Live re-check of the CURRENT step's permission -- called by the hosting component on init and
   * again automatically after every successful step advance (see {@link submitCurrentStep}), per
   * edge-cases.md's "proactively call a lightweight 'am I still authorized' check ... before
   * rendering each next step as actionable." Never trusts a cached/session-start permission set.
   */
  authorizeCurrentStep(): Observable<boolean> {
    if (this.isTerminal()) {
      return of(false);
    }
    this._status.set('authorizing');
    this._errorMessage.set(null);
    return this.deps.revalidate(this.currentStep().requiredPermission).pipe(
      tap((granted) => this._status.set(granted ? 'ready' : 'revoked')),
      catchError(() => {
        this._status.set('revoked');
        return of(false);
      }),
    );
  }

  /**
   * Submits the current step's action. On success, either completes the wizard (last step) or
   * advances and immediately re-authorizes the next step. On failure, a `403` from the step's own
   * submit call is treated identically to a failed proactive check -- the other half of
   * edge-cases.md's "both options together" resolution -- any other failure is recoverable
   * (`status` becomes `'error'`, the same step can be retried).
   */
  submitCurrentStep(): Observable<TContext | null> {
    if (this._status() !== 'ready') {
      return of(null);
    }
    this._status.set('submitting');
    this._errorMessage.set(null);
    const step = this.currentStep();

    return step.action(this._context()).pipe(
      switchMap((nextContext) => {
        this._context.set(nextContext);
        if (this.isLastStep()) {
          this._status.set('completed');
          return of(nextContext);
        }
        this._stepIndex.update((index) => index + 1);
        return this.authorizeCurrentStep().pipe(map(() => nextContext));
      }),
      catchError((error: unknown) => {
        const apiError = toUmsApiError(error);
        if (apiError.status === 403) {
          this._status.set('revoked');
        } else {
          this._status.set('error');
          this._errorMessage.set(apiError.message);
        }
        return of(null);
      }),
    );
  }
}
