import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { toUmsApiError } from '@ums/shared';
import { tap } from 'rxjs';
import { LibraryApi } from '../library.api';
import type {
  AuthorDto,
  BookCopyDto,
  BookDto,
  BookQuery,
  CategoryDto,
  CreateAuthorRequest,
  CreateBookCopyRequest,
  CreateBookRequest,
  CreateCategoryRequest,
  UpdateBookRequest,
} from '../library.types';

interface LibraryCatalogState {
  readonly books: readonly BookDto[];
  readonly totalCount: number;
  readonly page: number;
  readonly pageSize: number;
  readonly copiesByBookId: Readonly<Record<string, readonly BookCopyDto[]>>;
  readonly authors: readonly AuthorDto[];
  readonly categories: readonly CategoryDto[];
  readonly isLoading: boolean;
  readonly error: string | null;
}

const initialState: LibraryCatalogState = {
  books: [],
  totalCount: 0,
  page: 1,
  pageSize: 20,
  copiesByBookId: {},
  authors: [],
  categories: [],
  isLoading: false,
  error: null,
};

/**
 * ADMIN-29: Book/Author/Category catalog management, plus per-book copies and the
 * report-lost action -- `GET /books` is the ONLY paginated endpoint in this module (1-based
 * `page`).
 */
export const LibraryCatalogStore = signalStore(
  { providedIn: 'root' },
  withState<LibraryCatalogState>(initialState),
  withMethods((store, api = inject(LibraryApi)) => ({
    searchBooks(query: BookQuery): void {
      patchState(store, { isLoading: true, error: null });
      api.listBooks(query).subscribe({
        next: (page) =>
          patchState(store, {
            books: page.items,
            totalCount: page.totalCount,
            page: page.page,
            pageSize: page.pageSize,
            isLoading: false,
          }),
        error: (e: unknown) =>
          patchState(store, { isLoading: false, error: toUmsApiError(e).message }),
      });
    },
    createBook: (request: CreateBookRequest) =>
      api
        .createBook(request)
        .pipe(tap((book) => patchState(store, { books: [book, ...store.books()] }))),
    updateBook: (id: string, request: UpdateBookRequest) =>
      api
        .updateBook(id, request)
        .pipe(
          tap((book) =>
            patchState(store, { books: store.books().map((b) => (b.id === id ? book : b)) }),
          ),
        ),
    withdrawBook: (id: string) =>
      api
        .withdrawBook(id)
        .pipe(
          tap((book) =>
            patchState(store, { books: store.books().map((b) => (b.id === id ? book : b)) }),
          ),
        ),

    loadCopies(bookId: string): void {
      patchState(store, { isLoading: true, error: null });
      api.listBookCopies(bookId).subscribe({
        next: (copies) =>
          patchState(store, {
            copiesByBookId: { ...store.copiesByBookId(), [bookId]: copies },
            isLoading: false,
          }),
        error: (e: unknown) =>
          patchState(store, { isLoading: false, error: toUmsApiError(e).message }),
      });
    },
    createCopy: (bookId: string, request: CreateBookCopyRequest) =>
      api.createBookCopy(bookId, request).pipe(
        tap((copy) =>
          patchState(store, {
            copiesByBookId: {
              ...store.copiesByBookId(),
              [bookId]: [...(store.copiesByBookId()[bookId] ?? []), copy],
            },
          }),
        ),
      ),
    reportCopyLost: (bookId: string, copyId: string) =>
      api.reportCopyLost(copyId).pipe(
        tap((updated) =>
          patchState(store, {
            copiesByBookId: {
              ...store.copiesByBookId(),
              [bookId]: (store.copiesByBookId()[bookId] ?? []).map((c) =>
                c.id === copyId ? updated : c,
              ),
            },
          }),
        ),
      ),

    loadAuthors(): void {
      api.listAuthors().subscribe({
        next: (authors) => patchState(store, { authors }),
        error: (e: unknown) => patchState(store, { error: toUmsApiError(e).message }),
      });
    },
    createAuthor: (request: CreateAuthorRequest) =>
      api
        .createAuthor(request)
        .pipe(tap((author) => patchState(store, { authors: [author, ...store.authors()] }))),

    loadCategories(): void {
      api.listCategories().subscribe({
        next: (categories) => patchState(store, { categories }),
        error: (e: unknown) => patchState(store, { error: toUmsApiError(e).message }),
      });
    },
    createCategory: (request: CreateCategoryRequest) =>
      api
        .createCategory(request)
        .pipe(
          tap((category) => patchState(store, { categories: [category, ...store.categories()] })),
        ),
  })),
);
