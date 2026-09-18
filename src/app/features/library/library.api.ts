import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { APP_CONFIG } from '../../core/config/app-config';
import type {
  AuthorDto,
  BookCopyDto,
  BookDto,
  BookListPage,
  BookQuery,
  CategoryDto,
  CreateAuthorRequest,
  CreateBookCopyRequest,
  CreateBookRequest,
  CreateCategoryRequest,
  CreateLoanRequest,
  CreateReservationRequest,
  FineDto,
  LoanDto,
  LoanReviewFlagDto,
  ReservationDto,
  UpdateBookRequest,
  WaiveFineRequest,
} from './library.types';

/**
 * ADMIN-29: hand-rolled thin client for `ums-core`'s Library module -- see `library.types.ts`'s
 * own doc for the confirmed severe gaps (`IsOverdue` computed server-side, no reservation cancel/
 * claim endpoint, no staff-wide fines list).
 */
@Injectable({ providedIn: 'root' })
export class LibraryApi {
  private readonly http = inject(HttpClient);
  private readonly appConfig = inject(APP_CONFIG);

  private get baseUrl(): string {
    return `${this.appConfig.apiBaseUrl}/api/v1/library`;
  }

  // ---- Books -- the only paginated endpoint in this module ----

  listBooks(query: BookQuery): Observable<BookListPage> {
    let params = new HttpParams();
    if (query.q) params = params.set('q', query.q);
    if (query.categoryId) params = params.set('categoryId', query.categoryId);
    if (query.authorId) params = params.set('authorId', query.authorId);
    params = params.set('page', query.page ?? 1).set('pageSize', query.pageSize ?? 20);
    return this.http.get<BookListPage>(`${this.baseUrl}/books`, { params });
  }

  getBook(id: string): Observable<BookDto> {
    return this.http.get<BookDto>(`${this.baseUrl}/books/${id}`);
  }

  listBookCopies(bookId: string): Observable<readonly BookCopyDto[]> {
    return this.http.get<readonly BookCopyDto[]>(`${this.baseUrl}/books/${bookId}/copies`);
  }

  createBook(request: CreateBookRequest): Observable<BookDto> {
    return this.http.post<BookDto>(`${this.baseUrl}/books`, request);
  }

  updateBook(id: string, request: UpdateBookRequest): Observable<BookDto> {
    return this.http.put<BookDto>(`${this.baseUrl}/books/${id}`, request);
  }

  withdrawBook(id: string): Observable<BookDto> {
    return this.http.post<BookDto>(`${this.baseUrl}/books/${id}/withdraw`, {});
  }

  /** BookId comes from the route, never the body. */
  createBookCopy(bookId: string, request: CreateBookCopyRequest): Observable<BookCopyDto> {
    return this.http.post<BookCopyDto>(`${this.baseUrl}/books/${bookId}/copies`, request);
  }

  reportCopyLost(copyId: string): Observable<BookCopyDto> {
    return this.http.post<BookCopyDto>(`${this.baseUrl}/book-copies/${copyId}/report-lost`, {});
  }

  listAuthors(): Observable<readonly AuthorDto[]> {
    return this.http.get<readonly AuthorDto[]>(`${this.baseUrl}/authors`);
  }

  createAuthor(request: CreateAuthorRequest): Observable<AuthorDto> {
    return this.http.post<AuthorDto>(`${this.baseUrl}/authors`, request);
  }

  listCategories(): Observable<readonly CategoryDto[]> {
    return this.http.get<readonly CategoryDto[]>(`${this.baseUrl}/categories`);
  }

  createCategory(request: CreateCategoryRequest): Observable<CategoryDto> {
    return this.http.post<CategoryDto>(`${this.baseUrl}/categories`, request);
  }

  // ---- Loans ----

  createLoan(request: CreateLoanRequest): Observable<LoanDto> {
    return this.http.post<LoanDto>(`${this.baseUrl}/loans`, request);
  }

  myLoans(): Observable<readonly LoanDto[]> {
    return this.http.get<readonly LoanDto[]>(`${this.baseUrl}/loans/me`);
  }

  getLoan(id: string): Observable<LoanDto> {
    return this.http.get<LoanDto>(`${this.baseUrl}/loans/${id}`);
  }

  /** Owner OR `library.loan.manage`. */
  renewLoan(id: string): Observable<LoanDto> {
    return this.http.post<LoanDto>(`${this.baseUrl}/loans/${id}/renew`, {});
  }

  returnLoan(id: string): Observable<LoanDto> {
    return this.http.post<LoanDto>(`${this.baseUrl}/loans/${id}/return`, {});
  }

  getLoanReviewFlags(id: string): Observable<readonly LoanReviewFlagDto[]> {
    return this.http.get<readonly LoanReviewFlagDto[]>(`${this.baseUrl}/loans/${id}/review-flags`);
  }

  // ---- Reservations -- no cancel/claim endpoint exists, see library.types.ts's own doc ----

  createReservation(request: CreateReservationRequest): Observable<ReservationDto> {
    return this.http.post<ReservationDto>(`${this.baseUrl}/reservations`, request);
  }

  myReservations(): Observable<readonly ReservationDto[]> {
    return this.http.get<readonly ReservationDto[]>(`${this.baseUrl}/reservations/me`);
  }

  // ---- Fines -- no staff-wide list endpoint exists, only /me ----

  myFines(): Observable<readonly FineDto[]> {
    return this.http.get<readonly FineDto[]>(`${this.baseUrl}/fines/me`);
  }

  /** Owner OR `library.loan.manage`. Creates a real Finance Invoice; the resulting `invoiceId` lands on the returned Fine. */
  settleFine(id: string): Observable<FineDto> {
    return this.http.post<FineDto>(`${this.baseUrl}/fines/${id}/settle`, {});
  }

  waiveFine(id: string, request: WaiveFineRequest): Observable<FineDto> {
    return this.http.post<FineDto>(`${this.baseUrl}/fines/${id}/waive`, request);
  }
}
