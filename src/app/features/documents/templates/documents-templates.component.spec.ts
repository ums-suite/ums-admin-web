import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../../../core/config/app-config';
import { DocumentsTemplatesComponent } from './documents-templates.component';

describe('DocumentsTemplatesComponent', () => {
  let httpMock: HttpTestingController;
  const apiBaseUrl = 'http://localhost:8080';

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentsTemplatesComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { ...DEFAULT_APP_CONFIG, apiBaseUrl } },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('does not publish a version without an English title', () => {
    const fixture = TestBed.createComponent(DocumentsTemplatesComponent);
    fixture.detectChanges();
    fixture.componentInstance['submitCreate']();
    httpMock.expectNone(`${apiBaseUrl}/api/v1/documents/templates`);
  });

  it('publishes a new version requiring the English translation', () => {
    const fixture = TestBed.createComponent(DocumentsTemplatesComponent);
    fixture.detectChanges();
    fixture.componentInstance['newEnglishTitle'].set('ID Card');
    fixture.componentInstance['submitCreate']();

    const req = httpMock.expectOne(`${apiBaseUrl}/api/v1/documents/templates`);
    expect(req.request.body.Translations).toEqual([{ Language: 'en', Title: 'ID Card' }]);
    req.flush({
      id: 'tmpl-1',
      documentType: 'IdCard',
      layoutAssetKey: null,
      version: 1,
      translations: [{ language: 'en', title: 'ID Card', labelsJson: null }],
      createdAt: '2026-01-01T00:00:00Z',
    });
  });

  it('loads the current (highest-version) template for a required documentType', () => {
    const fixture = TestBed.createComponent(DocumentsTemplatesComponent);
    fixture.detectChanges();
    fixture.componentInstance['loadCurrent']();
    const req = httpMock.expectOne(
      (r) => r.url === `${apiBaseUrl}/api/v1/documents/templates/current`,
    );
    expect(req.request.params.get('documentType')).toBe('IdCard');
    req.flush({
      id: 'tmpl-2',
      documentType: 'IdCard',
      layoutAssetKey: null,
      version: 2,
      translations: [{ language: 'en', title: 'ID Card v2', labelsJson: null }],
      createdAt: '2026-01-01T00:00:00Z',
    });
    expect(fixture.componentInstance['store'].currentTemplate()?.version).toBe(2);
  });
});
