import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../../../core/config/app-config';
import { ContentNoticesStore } from './content-notices.store';

describe('ContentNoticesStore', () => {
  let store: InstanceType<typeof ContentNoticesStore>;
  let httpMock: HttpTestingController;
  const apiBaseUrl = 'http://localhost:8080';

  const notice = {
    id: 'n-1',
    title: 'Campus closed',
    body: 'Due to weather.',
    audience: ['Public'],
    organizationNodeId: null,
    isUrgent: true,
    status: 'Draft',
    publishAt: null,
    expireAt: null,
    version: 1,
    createdAt: '2026-01-01T00:00:00Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { ...DEFAULT_APP_CONFIG, apiBaseUrl } },
      ],
    });
    store = TestBed.inject(ContentNoticesStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('loads the notice feed', () => {
    store.loadFeed({ audience: 'Public' });
    const req = httpMock.expectOne((r) => r.url === `${apiBaseUrl}/api/v1/content/notices/feed`);
    expect(req.request.params.get('audience')).toBe('Public');
    req.flush([notice]);
    expect(store.feed()).toEqual([notice]);
  });

  it('creates a notice with the PascalCase body', () => {
    store
      .createNotice({
        Title: notice.title,
        Body: notice.body,
        Audience: ['Public'],
        IsUrgent: true,
      })
      .subscribe();
    const req = httpMock.expectOne(`${apiBaseUrl}/api/v1/content/notices`);
    expect(req.request.body).toEqual({
      Title: notice.title,
      Body: notice.body,
      Audience: ['Public'],
      IsUrgent: true,
    });
    req.flush(notice);
    expect(store.currentNotice()).toEqual(notice);
  });

  it('adds a translation via the real NoticeTranslation table', () => {
    store
      .addTranslation('n-1', {
        LanguageCode: 'bn',
        Title: 'শিরোনাম',
        Body: 'বিষয়বস্তু',
        Version: 1,
      })
      .subscribe();
    const req = httpMock.expectOne(`${apiBaseUrl}/api/v1/content/notices/n-1/translations`);
    expect(req.request.body.LanguageCode).toBe('bn');
    req.flush({ languageCode: 'bn', title: 'শিরোনাম', body: 'বিষয়বস্তু' });
  });

  it('publishes a notice, requiring the current Version', () => {
    store.publishNotice('n-1', { Version: 2 }).subscribe();
    const req = httpMock.expectOne(`${apiBaseUrl}/api/v1/content/notices/n-1/publish`);
    expect(req.request.body).toEqual({ Version: 2 });
    req.flush({ ...notice, status: 'Published', version: 3 });
    expect(store.currentNotice()?.status).toBe('Published');
  });

  it('surfaces an error message when the feed fails to load', () => {
    store.loadFeed({});
    httpMock
      .expectOne((r) => r.url === `${apiBaseUrl}/api/v1/content/notices/feed`)
      .flush(null, { status: 500, statusText: 'Server Error' });
    expect(store.error()).toBeTruthy();
  });
});
