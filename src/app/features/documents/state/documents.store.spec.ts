import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../../../core/config/app-config';
import {
  DocumentsStore,
  toBulkGenerationJobStatus,
  toBulkGenerationSnapshot,
} from './documents.store';

describe('toBulkGenerationJobStatus/toBulkGenerationSnapshot', () => {
  it('maps every real job status to a shared JobRunStatus', () => {
    expect(toBulkGenerationJobStatus('Queued')).toBe('queued');
    expect(toBulkGenerationJobStatus('Processing')).toBe('running');
    expect(toBulkGenerationJobStatus('Completed')).toBe('succeeded');
    expect(toBulkGenerationJobStatus('CompletedWithErrors')).toBe('succeeded');
    expect(toBulkGenerationJobStatus('Failed')).toBe('failed');
  });

  it('computes a progress percentage and message from a job snapshot', () => {
    const job = {
      id: 'job-1',
      documentType: 'IdCard',
      templateId: 't-1',
      templateVersion: 1,
      status: 'Processing' as const,
      totalItems: 10,
      completedCount: 4,
      deadLetteredCount: 1,
      createdAt: '2026-01-01T00:00:00Z',
      completedAt: null,
    };
    const snapshot = toBulkGenerationSnapshot(job);
    expect(snapshot.status).toBe('running');
    expect(snapshot.progressPercent).toBe(40);
    expect(snapshot.message).toContain('4/10');
  });
});

describe('DocumentsStore', () => {
  let store: InstanceType<typeof DocumentsStore>;
  let httpMock: HttpTestingController;
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

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { ...DEFAULT_APP_CONFIG, apiBaseUrl } },
      ],
    });
    store = TestBed.inject(DocumentsStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('loads a document by id, the only call carrying a real downloadUrl', () => {
    store.loadById('doc-1');
    httpMock.expectOne(`${apiBaseUrl}/api/v1/documents/doc-1`).flush(document);
    expect(store.currentDocument()?.downloadUrl).toBe('https://example.com/download/doc-1');
  });

  it('revokes a document with the PascalCase Reason body', () => {
    store.revoke('doc-1', { Reason: 'Issued in error' }).subscribe();
    const req = httpMock.expectOne(`${apiBaseUrl}/api/v1/documents/doc-1/revoke`);
    expect(req.request.body).toEqual({ Reason: 'Issued in error' });
    req.flush({ ...document, status: 'Revoked', revokedReason: 'Issued in error' });
    expect(store.currentDocument()?.status).toBe('Revoked');
  });

  it('creates a template with an English translation and prepends it', () => {
    store
      .createTemplate({
        DocumentType: 'IdCard',
        Translations: [{ Language: 'en', Title: 'ID Card' }],
      })
      .subscribe();
    const req = httpMock.expectOne(`${apiBaseUrl}/api/v1/documents/templates`);
    req.flush({
      id: 'tmpl-1',
      documentType: 'IdCard',
      layoutAssetKey: null,
      version: 1,
      translations: [{ language: 'en', title: 'ID Card', labelsJson: null }],
      createdAt: '2026-01-01T00:00:00Z',
    });
    expect(store.templates().length).toBe(1);
  });

  it('loads the current (highest-version) template for a required documentType', () => {
    store.loadCurrentTemplate('IdCard');
    const req = httpMock.expectOne(
      (r) => r.url === `${apiBaseUrl}/api/v1/documents/templates/current`,
    );
    expect(req.request.params.get('documentType')).toBe('IdCard');
    req.flush({
      id: 'tmpl-2',
      documentType: 'IdCard',
      layoutAssetKey: null,
      version: 2,
      translations: [],
      createdAt: '2026-01-01T00:00:00Z',
    });
    expect(store.currentTemplate()?.version).toBe(2);
  });

  it('submits a bulk generation job and stores it for polling', () => {
    store
      .submitBulkGeneration({
        DocumentType: 'IdCard',
        Items: [{ OwnerId: 'owner-1', SourceReferenceId: 'src-1', Fields: {} }],
      })
      .subscribe();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/documents/generate-bulk`).flush({
      id: 'job-1',
      documentType: 'IdCard',
      templateId: 't-1',
      templateVersion: 1,
      status: 'Queued',
      totalItems: 1,
      completedCount: 0,
      deadLetteredCount: 0,
      createdAt: '2026-01-01T00:00:00Z',
      completedAt: null,
    });
    expect(store.bulkJob()?.id).toBe('job-1');
  });

  it('verifies a document by verificationId, publicly and unauthenticated', () => {
    store.verify('ver-1');
    httpMock.expectOne(`${apiBaseUrl}/api/v1/documents/verify/ver-1`).flush({
      digitalVerificationId: 'ver-1',
      documentType: 'IdCard',
      status: 'Ready',
      isValid: true,
      reason: null,
      issuedAt: '2026-01-01T00:00:00Z',
      readyAt: '2026-01-01T00:05:00Z',
    });
    expect(store.verificationResult()?.isValid).toBeTrue();
  });

  it('surfaces an error message when verification fails', () => {
    store.verify('bad-id');
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/documents/verify/bad-id`)
      .flush(null, { status: 404, statusText: 'Not Found' });
    expect(store.error()).toBeTruthy();
  });
});
