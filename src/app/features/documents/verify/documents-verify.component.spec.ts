import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../../../core/config/app-config';
import { DocumentsVerifyComponent } from './documents-verify.component';

describe('DocumentsVerifyComponent', () => {
  let httpMock: HttpTestingController;
  const apiBaseUrl = 'http://localhost:8080';

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentsVerifyComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { ...DEFAULT_APP_CONFIG, apiBaseUrl } },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('does not verify a blank id', () => {
    const fixture = TestBed.createComponent(DocumentsVerifyComponent);
    fixture.detectChanges();
    fixture.componentInstance['verify']();
    httpMock.expectNone((r) => r.url.startsWith(`${apiBaseUrl}/api/v1/documents/verify`));
  });

  it('verifies a document and renders the result, never an owner id or download link', () => {
    const fixture = TestBed.createComponent(DocumentsVerifyComponent);
    fixture.detectChanges();
    fixture.componentInstance['verificationId'].set('ver-1');
    fixture.componentInstance['verify']();

    httpMock.expectOne(`${apiBaseUrl}/api/v1/documents/verify/ver-1`).flush({
      digitalVerificationId: 'ver-1',
      documentType: 'IdCard',
      status: 'Ready',
      isValid: true,
      reason: null,
      issuedAt: '2026-01-01T00:00:00Z',
      readyAt: '2026-01-01T00:05:00Z',
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('IdCard');
    expect(fixture.nativeElement.textContent).not.toContain('ownerId');
    expect(fixture.nativeElement.textContent).not.toContain('downloadUrl');
  });
});
