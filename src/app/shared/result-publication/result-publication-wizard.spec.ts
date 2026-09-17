import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { ResultPublicationWizard } from './result-publication-wizard';
import type { ResultPublicationStepDefinition } from './result-publication-wizard.types';

interface TestContext {
  readonly value: number;
}

function makeSteps(
  overrides: Partial<Record<string, Partial<ResultPublicationStepDefinition<TestContext>>>> = {},
): readonly ResultPublicationStepDefinition<TestContext>[] {
  const base: ResultPublicationStepDefinition<TestContext>[] = [
    {
      id: 'lock',
      label: 'Lock',
      requiredPermission: 'academic.grade.lock',
      action: (ctx) => of({ value: ctx.value + 1 }),
    },
    {
      id: 'approve',
      label: 'Approve',
      requiredPermission: 'academic.result.approve',
      action: (ctx) => of({ value: ctx.value + 1 }),
    },
    {
      id: 'publish',
      label: 'Publish',
      requiredPermission: 'academic.result.publish',
      action: (ctx) => of({ value: ctx.value + 1 }),
    },
  ];
  return base.map((step) => ({ ...step, ...overrides[step.id] }));
}

describe('ResultPublicationWizard', () => {
  it('throws when constructed with no steps', () => {
    expect(
      () => new ResultPublicationWizard([], { value: 0 }, { revalidate: () => of(true) }),
    ).toThrow();
  });

  it('starts at the first step with an authorizing status', () => {
    const wizard = new ResultPublicationWizard(
      makeSteps(),
      { value: 0 },
      { revalidate: () => of(true) },
    );
    expect(wizard.stepIndex()).toBe(0);
    expect(wizard.currentStep().id).toBe('lock');
    expect(wizard.status()).toBe('authorizing');
  });

  it('moves to ready once the live authorization check grants the permission', (done) => {
    const wizard = new ResultPublicationWizard(
      makeSteps(),
      { value: 0 },
      { revalidate: () => of(true) },
    );
    wizard.authorizeCurrentStep().subscribe(() => {
      expect(wizard.status()).toBe('ready');
      done();
    });
  });

  it('moves to revoked when the live authorization check denies the permission', (done) => {
    const wizard = new ResultPublicationWizard(
      makeSteps(),
      { value: 0 },
      { revalidate: () => of(false) },
    );
    wizard.authorizeCurrentStep().subscribe((granted) => {
      expect(granted).toBeFalse();
      expect(wizard.status()).toBe('revoked');
      expect(wizard.isTerminal()).toBeTrue();
      done();
    });
  });

  it('moves to revoked when the live authorization check itself errors', (done) => {
    const wizard = new ResultPublicationWizard(
      makeSteps(),
      { value: 0 },
      { revalidate: () => throwError(() => new Error('network down')) },
    );
    wizard.authorizeCurrentStep().subscribe(() => {
      expect(wizard.status()).toBe('revoked');
      done();
    });
  });

  it('does nothing when submitCurrentStep is called while not ready', (done) => {
    const wizard = new ResultPublicationWizard(
      makeSteps(),
      { value: 0 },
      { revalidate: () => of(true) },
    );
    // status is still 'authorizing' -- never called authorizeCurrentStep() yet.
    wizard.submitCurrentStep().subscribe((result) => {
      expect(result).toBeNull();
      expect(wizard.status()).toBe('authorizing');
      done();
    });
  });

  it('advances to the next step and re-authorizes it after a successful non-final submit', (done) => {
    const wizard = new ResultPublicationWizard(
      makeSteps(),
      { value: 0 },
      { revalidate: () => of(true) },
    );
    wizard.authorizeCurrentStep().subscribe(() => {
      wizard.submitCurrentStep().subscribe((result) => {
        expect(result).toEqual({ value: 1 });
        expect(wizard.stepIndex()).toBe(1);
        expect(wizard.currentStep().id).toBe('approve');
        expect(wizard.status()).toBe('ready');
        expect(wizard.context()).toEqual({ value: 1 });
        done();
      });
    });
  });

  it('reaches completed after the final step succeeds', (done) => {
    const wizard = new ResultPublicationWizard(
      makeSteps(),
      { value: 0 },
      { revalidate: () => of(true) },
    );
    const advanceThroughAll = (): void => {
      if (wizard.status() === 'completed') {
        expect(wizard.context()).toEqual({ value: 3 });
        expect(wizard.isTerminal()).toBeTrue();
        done();
        return;
      }
      wizard.authorizeCurrentStep().subscribe(() => {
        wizard.submitCurrentStep().subscribe(() => advanceThroughAll());
      });
    };
    advanceThroughAll();
  });

  it('renders an explicit revoked terminal state when a step submit itself 403s', (done) => {
    const steps = makeSteps({
      lock: {
        action: () =>
          throwError(() => new HttpErrorResponse({ status: 403, error: { title: 'Forbidden' } })),
      },
    });
    const wizard = new ResultPublicationWizard(steps, { value: 0 }, { revalidate: () => of(true) });
    wizard.authorizeCurrentStep().subscribe(() => {
      wizard.submitCurrentStep().subscribe((result) => {
        expect(result).toBeNull();
        expect(wizard.status()).toBe('revoked');
        expect(wizard.isTerminal()).toBeTrue();
        done();
      });
    });
  });

  it('renders a recoverable error state (not revoked) for a non-403 submit failure', (done) => {
    const steps = makeSteps({
      lock: {
        action: () =>
          throwError(() => new HttpErrorResponse({ status: 500, error: { title: 'boom' } })),
      },
    });
    const wizard = new ResultPublicationWizard(steps, { value: 0 }, { revalidate: () => of(true) });
    wizard.authorizeCurrentStep().subscribe(() => {
      wizard.submitCurrentStep().subscribe((result) => {
        expect(result).toBeNull();
        expect(wizard.status()).toBe('error');
        expect(wizard.errorMessage()).toContain('boom');
        expect(wizard.isTerminal()).toBeFalse();
        done();
      });
    });
  });

  it('never re-authorizes once terminal (revoked)', (done) => {
    const wizard = new ResultPublicationWizard(
      makeSteps(),
      { value: 0 },
      { revalidate: () => of(false) },
    );
    wizard.authorizeCurrentStep().subscribe(() => {
      expect(wizard.status()).toBe('revoked');
      wizard.authorizeCurrentStep().subscribe((granted) => {
        expect(granted).toBeFalse();
        done();
      });
    });
  });

  it('reports isLastStep correctly at each index', (done) => {
    const wizard = new ResultPublicationWizard(
      makeSteps(),
      { value: 0 },
      { revalidate: () => of(true) },
    );
    expect(wizard.isLastStep()).toBeFalse();
    wizard.authorizeCurrentStep().subscribe(() => {
      wizard.submitCurrentStep().subscribe(() => {
        expect(wizard.isLastStep()).toBeFalse();
        wizard.submitCurrentStep().subscribe(() => {
          expect(wizard.isLastStep()).toBeTrue();
          done();
        });
      });
    });
  });

  it('clears a prior error message when a fresh authorization check begins', (done) => {
    const steps = makeSteps({
      lock: {
        action: () =>
          throwError(() => new HttpErrorResponse({ status: 500, error: { title: 'boom' } })),
      },
    });
    const wizard = new ResultPublicationWizard(steps, { value: 0 }, { revalidate: () => of(true) });
    wizard.authorizeCurrentStep().subscribe(() => {
      wizard.submitCurrentStep().subscribe(() => {
        expect(wizard.errorMessage()).not.toBeNull();
        wizard.authorizeCurrentStep().subscribe(() => {
          expect(wizard.errorMessage()).toBeNull();
          done();
        });
      });
    });
  });

  it('typed context accessor exposes the live context signal, not a snapshot', () => {
    const wizard = new ResultPublicationWizard(
      makeSteps(),
      { value: 42 },
      { revalidate: () => of(true) },
    );
    const contextFn: () => TestContext = wizard.context;
    expect(contextFn()).toEqual({ value: 42 });
  });
});
