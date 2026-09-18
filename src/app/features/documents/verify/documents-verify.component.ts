import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  UmsBadgeComponent,
  UmsButtonComponent,
  UmsFormFieldComponent,
  UmsInputComponent,
} from '@ums/design-system';
import { DocumentsStore } from '../state/documents.store';

/**
 * ADMIN-31: Digital verification lookup -- `GET /verify/{verificationId}` is fully public,
 * unauthenticated, and rate-limited server-side (confirmed real). This is deliberately a plain
 * text-input + result card, never surfacing an owner id or download link (the backend never
 * returns one for this endpoint either).
 */
@Component({
  selector: 'app-documents-verify',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UmsButtonComponent, UmsBadgeComponent, UmsFormFieldComponent, UmsInputComponent],
  templateUrl: './documents-verify.component.html',
  styleUrl: './documents-verify.component.scss',
})
export class DocumentsVerifyComponent {
  protected readonly store = inject(DocumentsStore);
  protected readonly verificationId = signal('');

  protected verify(): void {
    const id = this.verificationId().trim();
    if (id) this.store.verify(id);
  }
}
