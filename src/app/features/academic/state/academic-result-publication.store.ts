import { signalStore, patchState, withMethods, withState } from '@ngrx/signals';
import type { ResultPublicationDto } from '../academic.types';

interface AcademicResultPublicationState {
  readonly currentResult: ResultPublicationDto | null;
}

const initialState: AcademicResultPublicationState = {
  currentResult: null,
};

/**
 * ADMIN-23: holds the most recently known {@link ResultPublicationDto} for a CourseOffering --
 * there is no `GET` endpoint for this entity at all in ums-core (confirmed, see
 * `academic.types.ts`'s own doc), so unlike every other store in this app, this one is never
 * populated by a load call. It exists purely so the component can display the real DTO returned by
 * whichever wizard step (or the standalone Reject action) most recently ran, across re-renders.
 */
export const AcademicResultPublicationStore = signalStore(
  { providedIn: 'root' },
  withState<AcademicResultPublicationState>(initialState),
  withMethods((store) => ({
    setCurrentResult(result: ResultPublicationDto): void {
      patchState(store, { currentResult: result });
    },
    clear(): void {
      patchState(store, { currentResult: null });
    },
  })),
);
