import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../../../core/config/app-config';
import { ContentBannersStore } from './content-banners.store';

describe('ContentBannersStore', () => {
  let store: InstanceType<typeof ContentBannersStore>;
  let httpMock: HttpTestingController;
  const apiBaseUrl = 'http://localhost:8080';

  const banner = {
    id: 'b-1',
    headline: 'Apply now',
    imageUrl: 'https://example.com/banner.png',
    linkUrl: null,
    sortOrder: 1,
    status: 'Draft',
    version: 1,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { ...DEFAULT_APP_CONFIG, apiBaseUrl } },
      ],
    });
    store = TestBed.inject(ContentBannersStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('loads active banners, unpaginated', () => {
    store.loadBanners();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/content/banners`).flush([banner]);
    expect(store.banners()).toEqual([banner]);
  });

  it('creates a banner with the PascalCase body', () => {
    store
      .createBanner({ Headline: banner.headline, ImageUrl: banner.imageUrl, SortOrder: 1 })
      .subscribe();
    const req = httpMock.expectOne(`${apiBaseUrl}/api/v1/content/banners`);
    expect(req.request.body).toEqual({
      Headline: banner.headline,
      ImageUrl: banner.imageUrl,
      SortOrder: 1,
    });
    req.flush(banner);
    expect(store.banners()).toEqual([banner]);
  });

  it('publishes and archives a banner under the same content.banner.publish gate', () => {
    store.loadBanners();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/content/banners`).flush([banner]);

    store.publishBanner('b-1', { Version: 1 }).subscribe();
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/content/banners/b-1/publish`)
      .flush({ ...banner, status: 'Published', version: 2 });
    expect(store.banners()[0].status).toBe('Published');

    store.archiveBanner('b-1', { Version: 2 }).subscribe();
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/content/banners/b-1/archive`)
      .flush({ ...banner, status: 'Archived', version: 3 });
    expect(store.banners()[0].status).toBe('Archived');
  });

  it('surfaces an error message when loading banners fails', () => {
    store.loadBanners();
    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/content/banners`)
      .flush(null, { status: 500, statusText: 'Server Error' });
    expect(store.error()).toBeTruthy();
  });
});
