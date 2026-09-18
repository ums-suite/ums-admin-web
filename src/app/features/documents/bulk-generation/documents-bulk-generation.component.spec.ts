import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../../../core/config/app-config';
import { DocumentsBulkGenerationComponent } from './documents-bulk-generation.component';

describe('DocumentsBulkGenerationComponent', () => {
  let httpMock: HttpTestingController;
  const apiBaseUrl = 'http://localhost:8080';

  const job = {
    id: 'job-1',
    documentType: 'IdCard',
    templateId: 't-1',
    templateVersion: 1,
    status: 'Queued',
    totalItems: 2,
    completedCount: 0,
    deadLetteredCount: 0,
    createdAt: '2026-01-01T00:00:00Z',
    completedAt: null,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentsBulkGenerationComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: APP_CONFIG,
          useValue: { ...DEFAULT_APP_CONFIG, apiBaseUrl, jobPollIntervalMs: 5 },
        },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('does not submit without any parsed items', () => {
    const fixture = TestBed.createComponent(DocumentsBulkGenerationComponent);
    fixture.detectChanges();
    fixture.componentInstance['submit']();
    httpMock.expectNone(`${apiBaseUrl}/api/v1/documents/generate-bulk`);
  });

  it('parses one ownerId,sourceReferenceId pair per line and submits, then starts polling', (done) => {
    const fixture = TestBed.createComponent(DocumentsBulkGenerationComponent);
    fixture.detectChanges();
    fixture.componentInstance['itemsCsv'].set('owner-1,src-1\nowner-2,src-2');
    fixture.componentInstance['submit']();

    const req = httpMock.expectOne(`${apiBaseUrl}/api/v1/documents/generate-bulk`);
    expect(req.request.body.Items).toEqual([
      { OwnerId: 'owner-1', SourceReferenceId: 'src-1', Fields: {} },
      { OwnerId: 'owner-2', SourceReferenceId: 'src-2', Fields: {} },
    ]);
    req.flush(job);

    setTimeout(() => {
      expect(fixture.componentInstance['isTracking']()).toBeTrue();
      const pollReq = httpMock.expectOne(`${apiBaseUrl}/api/v1/documents/jobs/job-1`);
      pollReq.flush({ ...job, status: 'Completed', completedCount: 2 });
      fixture.componentInstance.ngOnDestroy();
      done();
    }, 20);
  });
});
