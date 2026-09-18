import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { UmsToastService } from '@ums/design-system';
import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../../../core/config/app-config';
import { ContentBannersComponent } from './content-banners.component';

describe('ContentBannersComponent', () => {
  let httpMock: HttpTestingController;
  let toast: UmsToastService;
  const apiBaseUrl = 'http://localhost:8080';

  const banner = {
    id: 'b-1',
    headline: 'Apply now',
    imageUrl: 'https://example.com/b.png',
    linkUrl: null,
    sortOrder: 1,
    status: 'Draft',
    version: 1,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContentBannersComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { ...DEFAULT_APP_CONFIG, apiBaseUrl } },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    toast = TestBed.inject(UmsToastService);
  });

  afterEach(() => httpMock.verify());

  it('does not create a banner without required fields', () => {
    const fixture = TestBed.createComponent(ContentBannersComponent);
    fixture.detectChanges();
    fixture.componentInstance['submitCreate']();
    httpMock.expectNone(`${apiBaseUrl}/api/v1/content/banners`);
  });

  it('publishes a banner successfully', () => {
    const fixture = TestBed.createComponent(ContentBannersComponent);
    fixture.detectChanges();
    fixture.componentInstance['transition'](banner, 'publish');
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/content/banners/b-1/publish`)
      .flush({ ...banner, status: 'Published', version: 2 });
    expect(toast.toasts()[0].message).toBe('Banner published.');
  });

  it('surfaces a conflict banner scoped to the specific banner id on a 409', () => {
    const fixture = TestBed.createComponent(ContentBannersComponent);
    fixture.detectChanges();
    fixture.componentInstance['transition'](banner, 'archive');
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/content/banners/b-1/archive`)
      .flush({ code: 'version_conflict' }, { status: 409, statusText: 'Conflict' });
    expect(fixture.componentInstance['conflictBannerId']()).toBe('b-1');
  });
});
