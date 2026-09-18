import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { PermissionsService } from '../../../core/auth/permissions/permissions.service';
import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../../../core/config/app-config';
import { LibraryCatalogComponent } from './library-catalog.component';

describe('LibraryCatalogComponent', () => {
  let httpMock: HttpTestingController;
  const apiBaseUrl = 'http://localhost:8080';

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LibraryCatalogComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { ...DEFAULT_APP_CONFIG, apiBaseUrl } },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('searches books and paginates 1-based', () => {
    const fixture = TestBed.createComponent(LibraryCatalogComponent);
    fixture.detectChanges();
    fixture.componentInstance['search']();
    const req = httpMock.expectOne((r) => r.url === `${apiBaseUrl}/api/v1/library/books`);
    req.flush({
      items: [
        {
          id: 'b-1',
          title: 'Book',
          isbn: null,
          authorId: 'a-1',
          categoryId: 'c-1',
          status: 'Active',
          createdAt: '2026-01-01T00:00:00Z',
        },
      ],
      totalCount: 25,
      page: 1,
      pageSize: 20,
    });

    fixture.componentInstance['nextPage']();
    const req2 = httpMock.expectOne((r) => r.url === `${apiBaseUrl}/api/v1/library/books`);
    expect(req2.request.params.get('page')).toBe('2');
    req2.flush({ items: [], totalCount: 25, page: 2, pageSize: 20 });
  });

  it('does not create a book without required fields', () => {
    const fixture = TestBed.createComponent(LibraryCatalogComponent);
    fixture.detectChanges();
    fixture.componentInstance['submitCreateBook']();
    httpMock.expectNone(`${apiBaseUrl}/api/v1/library/books`);
  });

  it('renders the gated catalog-manage forms once permitted', () => {
    const permissions = TestBed.inject(PermissionsService);
    permissions.load().subscribe();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/identity/me/permissions`).flush({
      permissions: ['library.catalog.manage'],
      scopeGrants: [],
    });

    const fixture = TestBed.createComponent(LibraryCatalogComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Create book');
  });

  it('loads copies for a given book id', () => {
    const fixture = TestBed.createComponent(LibraryCatalogComponent);
    fixture.detectChanges();
    fixture.componentInstance['copiesBookId'].set('book-1');
    fixture.componentInstance['loadCopies']();
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/library/books/book-1/copies`)
      .flush([
        {
          id: 'c-1',
          bookId: 'book-1',
          accessionNumber: 'ACC-1',
          condition: null,
          copyType: 'Physical',
          status: 'Available',
        },
      ]);
    expect(fixture.componentInstance['currentCopies']().length).toBe(1);
  });
});
