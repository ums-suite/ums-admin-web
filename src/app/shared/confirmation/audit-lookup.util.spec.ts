import { of } from 'rxjs';
import type { AuditApiService } from '@ums/shared';
import { confirmLatestAuditEntry } from './audit-lookup.util';

describe('confirmLatestAuditEntry', () => {
  function fakeAuditApi(response: unknown): AuditApiService {
    return {
      apiV1AuditEntriesGet: jasmine.createSpy().and.returnValue(of(response)),
    } as unknown as AuditApiService;
  }

  it('resolves the first matching entry id', (done) => {
    const api = fakeAuditApi({ items: [{ id: 'audit-1' }, { id: 'audit-2' }] });
    confirmLatestAuditEntry(api, 'User', 'u1', '2026-01-01T00:00:00Z').subscribe((id) => {
      expect(id).toBe('audit-1');
      done();
    });
  });

  it('calls the audit API with the given entityType/entityId/sinceIso', () => {
    const api = fakeAuditApi({ items: [{ id: 'audit-1' }] });
    confirmLatestAuditEntry(api, 'User', 'u1', '2026-01-01T00:00:00Z').subscribe();
    expect(api.apiV1AuditEntriesGet).toHaveBeenCalledWith(
      'User',
      'u1',
      undefined,
      '2026-01-01T00:00:00Z',
    );
  });

  it('throws (as an observable error) when no matching entry is found', (done) => {
    const api = fakeAuditApi({ items: [] });
    confirmLatestAuditEntry(api, 'User', 'u1', '2026-01-01T00:00:00Z').subscribe({
      error: (error: unknown) => {
        expect(error).toBeInstanceOf(Error);
        done();
      },
    });
  });

  it('throws when the response has no items field at all', (done) => {
    const api = fakeAuditApi({});
    confirmLatestAuditEntry(api, 'User', 'u1', '2026-01-01T00:00:00Z').subscribe({
      error: (error: unknown) => {
        expect(error).toBeInstanceOf(Error);
        done();
      },
    });
  });
});
