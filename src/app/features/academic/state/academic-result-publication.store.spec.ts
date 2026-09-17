import { TestBed } from '@angular/core/testing';
import { AcademicResultPublicationStore } from './academic-result-publication.store';

describe('AcademicResultPublicationStore', () => {
  let store: InstanceType<typeof AcademicResultPublicationStore>;

  const result = {
    id: 'rp-1',
    courseOfferingId: 'off-1',
    status: 'Verified',
    calculatedAt: null,
    rejectedAt: null,
    rejectionReason: null,
    lockedAt: '2026-01-01T00:00:00Z',
    approvedAt: null,
    publishedAt: null,
    archivedAt: null,
    correctionCount: 0,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(AcademicResultPublicationStore);
  });

  it('starts with no known current result', () => {
    expect(store.currentResult()).toBeNull();
  });

  it('setCurrentResult replaces the held result', () => {
    store.setCurrentResult(result);
    expect(store.currentResult()).toEqual(result);
  });

  it('clear resets back to null', () => {
    store.setCurrentResult(result);
    store.clear();
    expect(store.currentResult()).toBeNull();
  });
});
