import { signalStore } from '@ngrx/signals';
import { withLoadState } from '../../../core/store/with-load-state.feature';

/**
 * ADMIN-3 scaffold only -- mirrors ums-core's own Alumni module boundary (ADR-0002). This app
 * only ever consumes Alumni for verification/moderation (requirement-spec.md §6); tickets.md's
 * own "Flagged Gaps" section notes that screen has no described UI yet -- not decomposed into a
 * ticket, so this store stays scaffold-only.
 */
export const AlumniStore = signalStore({ providedIn: 'root' }, withLoadState());
