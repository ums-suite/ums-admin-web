import { signalStore } from '@ngrx/signals';
import { withLoadState } from '../../../core/store/with-load-state.feature';

/**
 * ADMIN-3 scaffold only -- mirrors ums-core's own Academic module boundary (ADR-0002) so this
 * app's state never quietly reintroduces cross-module coupling the backend forbids. Fleshed out
 * when Academic's own tickets (ADMIN-18 through ADMIN-23) land; out of this build pass's
 * ADMIN-1..17 scope.
 */
export const AcademicStore = signalStore({ providedIn: 'root' }, withLoadState());
