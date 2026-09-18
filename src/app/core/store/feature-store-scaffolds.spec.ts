import { TestBed } from '@angular/core/testing';
import { AlumniStore } from '../../features/alumni/state/alumni.store';

/**
 * ADMIN-3: every module-scaffold store shares the exact same `withLoadState()` shape, so one
 * parameterized suite is enough to confirm each composes correctly and defaults sanely -- these
 * are intentionally trivial until their own module tickets flesh them out (see each store's own
 * class doc for which ticket that is). `AcademicStore` was removed from this list once ADMIN-18
 * fleshed it out into real per-entity stores (`features/academic/state/`) -- see those stores' own
 * specs instead. `FacultyStore` was likewise removed once ADMIN-26 fleshed it out, and
 * `HostelStore`/`LibraryStore`/`ContentStore`/`DocumentsStore`/`NotificationsStore`/`AuditStore`
 * were removed once ADMIN-27..35 fleshed each out into its own real per-entity store(s) -- see
 * each module's own `features/<module>/state/` specs instead. `AlumniStore` remains out of this
 * build pass's scope.
 */
const scaffoldStores = [['AlumniStore', AlumniStore]] as const;

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
