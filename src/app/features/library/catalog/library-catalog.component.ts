import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  UmsButtonComponent,
  UmsDataTableComponent,
  UmsFormFieldComponent,
  UmsInputComponent,
  UmsSelectComponent,
  type DataTableColumn,
  type SelectOption,
} from '@ums/design-system';
import { HasPermissionDirective } from '../../../core/auth/permissions/has-permission.directive';
import { PERMISSION_KEYS } from '../../../core/auth/permissions/permission-keys';
import { LibraryCatalogStore } from '../state/library-catalog.store';
import type { BookCopyDto, BookDto } from '../library.types';

const BOOK_COLUMNS: readonly DataTableColumn<BookDto>[] = [
  { id: 'title', header: 'Title', accessor: (r) => r.title, sortable: true, filterable: true },
  { id: 'isbn', header: 'ISBN', accessor: (r) => r.isbn },
  { id: 'status', header: 'Status', accessor: (r) => r.status, sortable: true },
];
const COPY_COLUMNS: readonly DataTableColumn<BookCopyDto>[] = [
  { id: 'accessionNumber', header: 'Accession #', accessor: (r) => r.accessionNumber },
  { id: 'copyType', header: 'Type', accessor: (r) => r.copyType },
  { id: 'status', header: 'Status', accessor: (r) => r.status, sortable: true },
];

/**
 * ADMIN-29: Book/Author/Category catalog administration, per-book copies, and reporting a copy
 * lost. `GET /books` is the only paginated endpoint in this module (1-based page).
 */
@Component({
  selector: 'app-library-catalog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    UmsButtonComponent,
    UmsDataTableComponent,
    UmsFormFieldComponent,
    UmsInputComponent,
    UmsSelectComponent,
    HasPermissionDirective,
  ],
  templateUrl: './library-catalog.component.html',
  styleUrl: './library-catalog.component.scss',
})
export class LibraryCatalogComponent {
  protected readonly store = inject(LibraryCatalogStore);
  protected readonly permissionKeys = PERMISSION_KEYS;
  protected readonly bookColumns = BOOK_COLUMNS;
  protected readonly copyColumns = COPY_COLUMNS;
  protected readonly rowId = (row: { readonly id: string }): string => row.id;

  protected readonly copyTypeOptions: readonly SelectOption[] = [
    { value: 'Physical', label: 'Physical' },
    { value: 'Digital', label: 'Digital' },
  ];

  protected readonly searchQuery = signal('');
  protected readonly searchCategoryId = signal('');
  protected readonly searchAuthorId = signal('');
  protected readonly currentPage = signal(1);

  protected readonly newBookTitle = signal('');
  protected readonly newBookIsbn = signal('');
  protected readonly newBookAuthorId = signal('');
  protected readonly newBookCategoryId = signal('');

  protected readonly newAuthorName = signal('');
  protected readonly newCategoryName = signal('');

  protected readonly copiesBookId = signal('');
  protected readonly newCopyAccession = signal('');
  protected readonly newCopyCondition = signal('');
  protected readonly newCopyType = signal('Physical');

  protected search(page = 1): void {
    this.currentPage.set(page);
    this.store.searchBooks({
      q: this.searchQuery().trim() || undefined,
      categoryId: this.searchCategoryId().trim() || undefined,
      authorId: this.searchAuthorId().trim() || undefined,
      page,
      pageSize: 20,
    });
  }

  protected nextPage(): void {
    if (this.currentPage() * this.store.pageSize() < this.store.totalCount()) {
      this.search(this.currentPage() + 1);
    }
  }

  protected previousPage(): void {
    if (this.currentPage() > 1) this.search(this.currentPage() - 1);
  }

  protected submitCreateBook(): void {
    const title = this.newBookTitle().trim();
    const authorId = this.newBookAuthorId().trim();
    const categoryId = this.newBookCategoryId().trim();
    if (!title || !authorId || !categoryId) return;
    this.store
      .createBook({ title, isbn: this.newBookIsbn().trim() || null, authorId, categoryId })
      .subscribe(() => this.newBookTitle.set(''));
  }

  protected withdraw(id: string): void {
    this.store.withdrawBook(id).subscribe();
  }

  protected loadAuthors(): void {
    this.store.loadAuthors();
  }

  protected submitCreateAuthor(): void {
    const name = this.newAuthorName().trim();
    if (!name) return;
    this.store.createAuthor({ name }).subscribe(() => this.newAuthorName.set(''));
  }

  protected loadCategories(): void {
    this.store.loadCategories();
  }

  protected submitCreateCategory(): void {
    const name = this.newCategoryName().trim();
    if (!name) return;
    this.store.createCategory({ name }).subscribe(() => this.newCategoryName.set(''));
  }

  protected loadCopies(): void {
    const bookId = this.copiesBookId().trim();
    if (bookId) this.store.loadCopies(bookId);
  }

  protected currentCopies(): readonly BookCopyDto[] {
    return this.store.copiesByBookId()[this.copiesBookId().trim()] ?? [];
  }

  protected submitCreateCopy(): void {
    const bookId = this.copiesBookId().trim();
    const accessionNumber = this.newCopyAccession().trim();
    if (!bookId || !accessionNumber) return;
    this.store
      .createCopy(bookId, {
        accessionNumber,
        condition: this.newCopyCondition().trim() || null,
        copyType: this.newCopyType(),
      })
      .subscribe(() => this.newCopyAccession.set(''));
  }

  protected reportLost(copyId: string): void {
    const bookId = this.copiesBookId().trim();
    if (bookId) this.store.reportCopyLost(bookId, copyId).subscribe();
  }
}
