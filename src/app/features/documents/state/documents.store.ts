import { signalStore } from '@ngrx/signals';
import { withLoadState } from '../../../core/store/with-load-state.feature';

/**
 * ADMIN-3 scaffold only -- mirrors ums-core's own Documents module boundary (ADR-0002). Fleshed
 * out when ADMIN-31 lands (sequenced after ADMIN-17's Student 360, its primary trigger surface,
 * per tickets.md's own sprint-planner note); out of this build pass's ADMIN-1..17 scope proper,
 * though ADMIN-17 does wire ad hoc document-generation trigger calls directly.
 */
export const DocumentsStore = signalStore({ providedIn: 'root' }, withLoadState());
