import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../../../core/config/app-config';
import { ReportingBuilderComponent } from './reporting-builder.component';

describe('ReportingBuilderComponent', () => {
  let httpMock: HttpTestingController;
  const apiBaseUrl = 'http://localhost:8080';

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportingBuilderComponent],
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

  it('adds and removes a draft field, driving the client-side-only preview columns', () => {
    const fixture = TestBed.createComponent(ReportingBuilderComponent);
    fixture.detectChanges();
    fixture.componentInstance['fieldKeyInput'].set('gender');
    fixture.componentInstance['fieldLabelInput'].set('Gender');
    fixture.componentInstance['addField']();
    expect(fixture.componentInstance['previewColumns']()).toEqual(['Gender']);

    fixture.componentInstance['removeField'](0);
    expect(fixture.componentInstance['previewColumns']()).toEqual([]);
  });

  it('does not create a definition without a name or fields', () => {
    const fixture = TestBed.createComponent(ReportingBuilderComponent);
    fixture.detectChanges();
    fixture.componentInstance['submitCreateDefinition']();
    httpMock.expectNone((r) => r.url.includes('/regulatory-reports/definitions/'));
  });

  it('does not submit a run without a definition id', () => {
    const fixture = TestBed.createComponent(ReportingBuilderComponent);
    fixture.detectChanges();
    fixture.componentInstance['submitRun']();
    httpMock.expectNone((r) => r.url.includes('/run'));
  });

  it('submits a run and downloads a CSV result as a client-side Blob once completed', (done) => {
    const fixture = TestBed.createComponent(ReportingBuilderComponent);
    fixture.detectChanges();
    fixture.componentInstance['runDefinitionId'].set('def-1');
    fixture.componentInstance['runFormat'].set('Csv');
    fixture.componentInstance['submitRun']();

    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/reporting/regulatory-reports/def-1/run`)
      .flush({ runId: 'run-1', inFlightDuplicateRunId: null });

    setTimeout(() => {
      const req = httpMock.expectOne(`${apiBaseUrl}/api/v1/reporting/regulatory-report-runs/run-1`);
      req.flush({
        runId: 'run-1',
        definitionId: 'def-1',
        status: 'Completed',
        format: 'Csv',
        requestedAt: '2026-01-01T00:00:00Z',
        dataAsOf: '2026-01-01T00:00:00Z',
        completedAt: '2026-01-01T00:01:00Z',
        resultDocumentId: null,
        resultCsvContent: 'a,b\n1,2',
        errorMessage: null,
      });
      expect(fixture.componentInstance['downloadUrl']()).toBeTruthy();
      fixture.componentInstance.ngOnDestroy();
      done();
    }, 20);
  });
});
