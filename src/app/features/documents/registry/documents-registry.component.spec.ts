import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideApi } from '@ums/shared';
import { UmsToastService } from '@ums/design-system';
import { ConfirmationService } from '../../../shared/confirmation/confirmation.service';
import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../../../core/config/app-config';
import { DocumentsRegistryComponent } from './documents-registry.component';

describe('DocumentsRegistryComponent', () => {
  let httpMock: HttpTestingController;
  let confirmation: ConfirmationService;
  let toast: UmsToastService;
  const apiBaseUrl = 'http://localhost:8080';

  const document = {
    id: 'doc-1',
    ownerId: 'owner-1',
    documentType: 'IdCard',
    sourceReferenceId: 'src-1',
    templateId: 't-1',
    templateVersion: 1,
    status: 'Ready',
    digitalVerificationId: 'ver-1',
    mimeType: 'application/pdf',
    sizeBytes: 1024,
    createdAt: '2026-01-01T00:00:00Z',
    readyAt: '2026-01-01T00:05:00Z',
    revokedAt: null,
    revokedReason: null,
    supersededByDocumentId: null,
    downloadUrl: 'https://example.com/download/doc-1',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentsRegistryComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApi(apiBaseUrl),
        provideRouter([]),
        { provide: APP_CONFIG, useValue: { ...DEFAULT_APP_CONFIG, apiBaseUrl } },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    confirmation = TestBed.inject(ConfirmationService);
    toast = TestBed.inject(UmsToastService);
  });

  afterEach(() => httpMock.verify());

  it('does not load documents for a blank owner id', () => {
    const fixture = TestBed.createComponent(DocumentsRegistryComponent);
    fixture.detectChanges();
    fixture.componentInstance['loadForOwner']();
    httpMock.expectNone((r) => r.url === `${apiBaseUrl}/api/v1/documents`);
  });

  it('loads a document by id with its real download link', () => {
    const fixture = TestBed.createComponent(DocumentsRegistryComponent);
    fixture.detectChanges();
    fixture.componentInstance['lookupDocumentId'].set('doc-1');
    fixture.componentInstance['loadById']();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/documents/doc-1`).flush(document);
    expect(fixture.componentInstance['store'].currentDocument()?.downloadUrl).toBe(
      'https://example.com/download/doc-1',
    );
  });

  it('revokes a document end to end with a mandatory reason and audit-linked success', () => {
    const fixture = TestBed.createComponent(DocumentsRegistryComponent);
    fixture.detectChanges();
    fixture.componentInstance['lookupDocumentId'].set('doc-1');
    fixture.componentInstance['loadById']();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/documents/doc-1`).flush(document);

    fixture.componentInstance['revoke']();
    expect(confirmation.current()?.title).toBe('Revoke document');
    confirmation.confirm('Issued in error');

    const req = httpMock.expectOne(`${apiBaseUrl}/api/v1/documents/doc-1/revoke`);
    expect(req.request.body).toEqual({ Reason: 'Issued in error' });
    req.flush({ ...document, status: 'Revoked' });
    httpMock
      .expectOne((r) => r.url === `${apiBaseUrl}/api/v1/audit/entries`)
      .flush({ items: [{ id: 'audit-1' }] });

    expect(toast.toasts()[0].message).toContain('audit entry audit-1');
  });
});
