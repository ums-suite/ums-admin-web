import { TestBed } from '@angular/core/testing';
import { HostelStore } from '../../features/hostel/state/hostel.store';
import { LibraryStore } from '../../features/library/state/library.store';
import { AlumniStore } from '../../features/alumni/state/alumni.store';
import { ContentStore } from '../../features/content/state/content.store';
import { DocumentsStore } from '../../features/documents/state/documents.store';
import { NotificationsStore } from '../../features/notifications/state/notifications.store';
import { AuditStore } from '../../features/audit/state/audit.store';

/**
 * ADMIN-3: every module-scaffold store shares the exact same `withLoadState()` shape, so one
 * parameterized suite is enough to confirm each composes correctly and defaults sanely -- these
 * are intentionally trivial until their own module tickets flesh them out (see each store's own
 * class doc for which ticket that is). `AcademicStore` was removed from this list once ADMIN-18
 * fleshed it out into real per-entity stores (`features/academic/state/`) -- see those stores' own
 * specs instead. `FacultyStore` was likewise removed once ADMIN-26 fleshed it out.
 */
const scaffoldStores = [
  ['HostelStore', HostelStore],
  ['LibraryStore', LibraryStore],
  ['AlumniStore', AlumniStore],
  ['ContentStore', ContentStore],
  ['DocumentsStore', DocumentsStore],
  ['NotificationsStore', NotificationsStore],
  ['AuditStore', AuditStore],
] as const;

describe('module scaffold stores (ADMIN-3)', () => {
  for (const [name, Store] of scaffoldStores) {
    it(`${name} defaults to isLoading=false and error=null`, () => {
      TestBed.configureTestingModule({});
      const store = TestBed.inject(Store);
      expect(store.isLoading()).toBeFalse();
      expect(store.error()).toBeNull();
    });
  }
});
