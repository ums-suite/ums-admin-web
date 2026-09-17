import { TestBed } from '@angular/core/testing';
import { Observable, Subject, throwError } from 'rxjs';
import type { JobSnapshot } from './job.types';
import { JobPollerService } from './job-poller.service';

describe('JobPollerService', () => {
  let service: JobPollerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(JobPollerService);
  });

  it('fetches immediately and reports queued/running snapshots without stopping', (done) => {
    const snapshots: JobSnapshot[] = [
      { jobId: 'job-1', status: 'queued' },
      { jobId: 'job-1', status: 'running', progressPercent: 40 },
    ];
    let call = 0;
    const fetchStatus = () =>
      new Observable<JobSnapshot>((sub) => {
        sub.next(snapshots[Math.min(call, snapshots.length - 1)]);
        call++;
        sub.complete();
      });

    const handle = service.track(fetchStatus, { intervalMs: 5 });

    setTimeout(() => {
      expect(handle.snapshot()?.status).toBe('running');
      expect(handle.isTerminal()).toBeFalse();
      handle.stop();
      done();
    }, 30);
  });

  it('stops polling once a terminal (succeeded) snapshot is fetched', (done) => {
    const fetchStatus = () =>
      new Observable<JobSnapshot<{ imported: number }>>((sub) => {
        sub.next({
          jobId: 'job-2',
          status: 'succeeded',
          progressPercent: 100,
          result: { imported: 10 },
        });
        sub.complete();
      });

    const handle = service.track(fetchStatus, { intervalMs: 5 });

    setTimeout(() => {
      expect(handle.isTerminal()).toBeTrue();
      expect(handle.snapshot()?.result).toEqual({ imported: 10 });
      done();
    }, 20);
  });

  it('never treats a 100% progressPercent alone as terminal', (done) => {
    const fetchStatus = () =>
      new Observable<JobSnapshot>((sub) => {
        sub.next({ jobId: 'job-3', status: 'running', progressPercent: 100 });
        sub.complete();
      });

    const handle = service.track(fetchStatus, { intervalMs: 5 });

    setTimeout(() => {
      expect(handle.snapshot()?.progressPercent).toBe(100);
      expect(handle.isTerminal()).toBeFalse();
      handle.stop();
      done();
    }, 15);
  });

  it('surfaces a fetch error via lastError without treating it as terminal', (done) => {
    const fetchStatus = () => throwError(() => new Error('boom'));

    // A long interval so only the single immediate tick fires within this test's wait window --
    // a real (non-mocked) HttpErrorResponse case is covered end-to-end by AuditedActionService's
    // own spec, this test only exercises JobPollerService's own error-surfacing/non-terminal path.
    const handle = service.track(fetchStatus, { intervalMs: 1000 });

    setTimeout(() => {
      expect(handle.lastError()).not.toBeNull();
      expect(handle.isTerminal()).toBeFalse();
      handle.stop();
      done();
    }, 20);
  });

  it('stop() halts further polling', (done) => {
    let calls = 0;
    const fetchStatus = () =>
      new Observable<JobSnapshot>((sub) => {
        calls++;
        sub.next({ jobId: 'job-5', status: 'running' });
        sub.complete();
      });

    const handle = service.track(fetchStatus, { intervalMs: 5 });
    handle.stop();
    const callsAtStop = calls;

    setTimeout(() => {
      expect(calls).toBe(callsAtStop);
      done();
    }, 30);
  });

  it('does not overlap requests when a fetch is slower than the poll interval (exhaustMap)', (done) => {
    let inFlight = 0;
    let maxInFlight = 0;
    const subject = new Subject<JobSnapshot>();
    const fetchStatus = () =>
      new Observable<JobSnapshot>((sub) => {
        inFlight++;
        maxInFlight = Math.max(maxInFlight, inFlight);
        const inner = subject.subscribe((v) => {
          inFlight--;
          sub.next(v);
          sub.complete();
        });
        return () => inner.unsubscribe();
      });

    const handle = service.track(fetchStatus, { intervalMs: 1 });

    setTimeout(() => {
      expect(maxInFlight).toBe(1);
      subject.next({ jobId: 'job-6', status: 'succeeded' });
      handle.stop();
      done();
    }, 20);
  });
});
