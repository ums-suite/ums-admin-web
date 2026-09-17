import { signalStore } from '@ngrx/signals';
import { withLoadState } from '../../../core/store/with-load-state.feature';

/**
 * ADMIN-3 scaffold only -- mirrors ums-core's own Notifications module boundary (ADR-0002,
 * template management only per requirement-spec.md §6). Fleshed out when ADMIN-35 (System
 * Configuration's notification-template screens) lands; out of this build pass's ADMIN-1..17
 * scope.
 */
export const NotificationsStore = signalStore({ providedIn: 'root' }, withLoadState());
