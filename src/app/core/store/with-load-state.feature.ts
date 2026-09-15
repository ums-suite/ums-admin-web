import { signalStoreFeature, withState } from '@ngrx/signals';

/**
 * ADMIN-3: the minimal shared shape every one of the 15 module-scoped scaffold stores starts
 * from. Kept deliberately tiny -- each module's own tickets (ADMIN-18 onward for Academic,
 * ADMIN-24 for Finance, etc.) replace/extend this with real domain state as they land; this
 * feature only exists so the 15 scaffold stores aren't 15 copies of the same two-field state
 * shape.
 */
export interface LoadState {
  readonly isLoading: boolean;
  readonly error: string | null;
}

export function withLoadState() {
  return signalStoreFeature(withState<LoadState>({ isLoading: false, error: null }));
}
