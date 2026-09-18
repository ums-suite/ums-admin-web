import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../../../core/config/app-config';
import { LibraryCatalogStore } from './library-catalog.store';

describe('LibraryCatalogStore', () => {
  let store: InstanceType<typeof LibraryCatalogStore>;
  let httpMock: HttpTestingController;
  const apiBaseUrl = 'http://localhost:8080';

  const book = {
    id: 'book-1',
    title: 'Intro to Algorithms',
    isbn: '123',
    authorId: 'a-1',
    categoryId: 'c-1',
    status: 'Active',
    createdAt: '2026-01-01T00:00:00Z',
  };
  const page = { items: [book], totalCount: 1, page: 1, pageSize: 20 };
  const copy = {
    id: 'copy-1',
    bookId: 'book-1',
    accessionNumber: 'ACC-1',
    condition: 'Good',
    copyType: 'Physical',
    status: 'Available',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { ...DEFAULT_APP_CONFIG, apiBaseUrl } },
      ],
    });
    store = TestBed.inject(LibraryCatalogStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('searches books with page/pageSize params (1-based)', () => {
    store.searchBooks({ q: 'algorithms' });
    const req = httpMock.expectOne((r) => r.url === `${apiBaseUrl}/api/v1/library/books`);
    expect(req.request.params.get('q')).toBe('algorithms');
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('pageSize')).toBe('20');
    req.flush(page);
    expect(store.books()).toEqual([book]);
    expect(store.totalCount()).toBe(1);
  });

  it('creates a book and prepends it', () => {
    store
      .createBook({ title: book.title, isbn: null, authorId: 'a-1', categoryId: 'c-1' })
      .subscribe();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/library/books`).flush(book);
    expect(store.books()).toEqual([book]);
  });

  it('loads copies for a book keyed by bookId', () => {
    store.loadCopies('book-1');
    httpMock.expectOne(`${apiBaseUrl}/api/v1/library/books/book-1/copies`).flush([copy]);
    expect(store.copiesByBookId()['book-1']).toEqual([copy]);
  });

  it('creates a copy with BookId taken from the route, not the body', () => {
    store.createCopy('book-1', { accessionNumber: 'ACC-1', copyType: 'Physical' }).subscribe();
    const req = httpMock.expectOne(`${apiBaseUrl}/api/v1/library/books/book-1/copies`);
    expect(req.request.body).toEqual({ accessionNumber: 'ACC-1', copyType: 'Physical' });
    req.flush(copy);
    expect(store.copiesByBookId()['book-1']).toEqual([copy]);
  });

  it('reports a copy lost and updates it in place', () => {
    store.loadCopies('book-1');
    httpMock.expectOne(`${apiBaseUrl}/api/v1/library/books/book-1/copies`).flush([copy]);

    store.reportCopyLost('book-1', 'copy-1').subscribe();
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/library/book-copies/copy-1/report-lost`)
      .flush({ ...copy, status: 'Lost' });
    expect(store.copiesByBookId()['book-1'][0].status).toBe('Lost');
  });

  it('surfaces an error message when a search fails', () => {
    store.searchBooks({});
    httpMock
      .expectOne((r) => r.url === `${apiBaseUrl}/api/v1/library/books`)
      .flush(null, { status: 500, statusText: 'Server Error' });
    expect(store.error()).toBeTruthy();
  });
});
