import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../../../core/config/app-config';
import { NotificationsStore } from './notifications.store';

describe('NotificationsStore', () => {
  let store: InstanceType<typeof NotificationsStore>;
  let httpMock: HttpTestingController;
  const apiBaseUrl = 'http://localhost:8080';

  const template = {
    id: 'tmpl-1',
    eventType: 'PaymentReceived',
    channel: 'Email',
    version: 1,
    translations: [],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { ...DEFAULT_APP_CONFIG, apiBaseUrl } },
      ],
    });
    store = TestBed.inject(NotificationsStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('loads templates with default skip=0/take=50', () => {
    store.loadTemplates();
    const req = httpMock.expectOne((r) => r.url === `${apiBaseUrl}/api/v1/notifications/templates`);
    expect(req.request.params.get('skip')).toBe('0');
    expect(req.request.params.get('take')).toBe('50');
    req.flush({ items: [template], totalCount: 1, skip: 0, take: 50 });
    expect(store.templates()).toEqual([template]);
  });

  it('get-or-creates a template idempotently and prepends a genuinely new one', () => {
    store.getOrCreateTemplate({ EventType: 'PaymentReceived', Channel: 'Email' }).subscribe();
    const req = httpMock.expectOne(`${apiBaseUrl}/api/v1/notifications/templates`);
    expect(req.request.body).toEqual({ EventType: 'PaymentReceived', Channel: 'Email' });
    req.flush(template);
    expect(store.templates()).toEqual([template]);
  });

  it('does not duplicate an already-known template on a repeat get-or-create call', () => {
    store.getOrCreateTemplate({ EventType: 'PaymentReceived', Channel: 'Email' }).subscribe();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/notifications/templates`).flush(template);

    store.getOrCreateTemplate({ EventType: 'PaymentReceived', Channel: 'Email' }).subscribe();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/notifications/templates`).flush(template);
    expect(store.templates().length).toBe(1);
  });

  it('upserts one language translation, bumping Version', () => {
    store.getOrCreateTemplate({ EventType: 'PaymentReceived', Channel: 'Email' }).subscribe();
    httpMock.expectOne(`${apiBaseUrl}/api/v1/notifications/templates`).flush(template);

    store
      .updateTranslation('tmpl-1', {
        LanguageCode: 'en',
        Subject: 'Payment received',
        Body: 'Thanks!',
      })
      .subscribe();
    const req = httpMock.expectOne(`${apiBaseUrl}/api/v1/notifications/templates/tmpl-1`);
    expect(req.request.method).toBe('PUT');
    req.flush({
      ...template,
      version: 2,
      translations: [
        {
          languageCode: 'en',
          subject: 'Payment received',
          body: 'Thanks!',
          pushTitle: null,
          deepLink: null,
        },
      ],
    });
    expect(store.templates()[0].version).toBe(2);
  });

  it('surfaces an error message when loading fails', () => {
    store.loadTemplates();
    httpMock
      .expectOne((r) => r.url === `${apiBaseUrl}/api/v1/notifications/templates`)
      .flush(null, { status: 500, statusText: 'Server Error' });
    expect(store.error()).toBeTruthy();
  });
});
