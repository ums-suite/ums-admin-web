import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  UmsButtonComponent,
  UmsFormFieldComponent,
  UmsInputComponent,
  UmsSelectComponent,
  type SelectOption,
} from '@ums/design-system';
import { HasPermissionDirective } from '../../../core/auth/permissions/has-permission.directive';
import { PERMISSION_KEYS } from '../../../core/auth/permissions/permission-keys';
import { DocumentsStore } from '../state/documents.store';

const DOCUMENT_TYPE_OPTIONS: readonly SelectOption[] = [
  { value: 'AdmitCard', label: 'Admit Card' },
  { value: 'MeritList', label: 'Merit List' },
  { value: 'Transcript', label: 'Transcript' },
  { value: 'Certificate', label: 'Certificate' },
  { value: 'IdCard', label: 'Id Card' },
  { value: 'Receipt', label: 'Receipt' },
  { value: 'RegulatoryReport', label: 'Regulatory Report' },
];

/**
 * ADMIN-31: Document Template versioning -- there is no edit/delete for a template; publishing a
 * new version is just another `POST /templates`. An English (`en`) translation is required by the
 * backend domain; this screen mirrors that as client-side validation too.
 */
@Component({
  selector: 'app-documents-templates',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    UmsButtonComponent,
    UmsFormFieldComponent,
    UmsInputComponent,
    UmsSelectComponent,
    HasPermissionDirective,
  ],
  templateUrl: './documents-templates.component.html',
  styleUrl: './documents-templates.component.scss',
})
export class DocumentsTemplatesComponent {
  protected readonly store = inject(DocumentsStore);
  protected readonly permissionKeys = PERMISSION_KEYS;
  protected readonly documentTypeOptions = DOCUMENT_TYPE_OPTIONS;

  protected readonly listDocumentType = signal('');
  protected readonly currentDocumentType = signal('IdCard');

  protected readonly newDocumentType = signal('IdCard');
  protected readonly newLayoutAssetKey = signal('');
  protected readonly newEnglishTitle = signal('');

  protected loadTemplates(): void {
    this.store.loadTemplates(this.listDocumentType().trim() || undefined);
  }

  protected loadCurrent(): void {
    const documentType = this.currentDocumentType().trim();
    if (documentType) this.store.loadCurrentTemplate(documentType);
  }

  protected submitCreate(): void {
    const title = this.newEnglishTitle().trim();
    if (!title) return;
    this.store
      .createTemplate({
        DocumentType: this.newDocumentType(),
        LayoutAssetKey: this.newLayoutAssetKey().trim() || null,
        Translations: [{ Language: 'en', Title: title }],
      })
      .subscribe(() => this.newEnglishTitle.set(''));
  }
}
