import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../../../core/config/app-config';
import { ContentEventsStore } from './content-events.store';

describe('ContentEventsStore', () => {
  let store: InstanceType<typeof ContentEventsStore>;
  let httpMock: HttpTestingController;
  const apiBaseUrl = 'http://localhost:8080';

  const event = {
    id: 'e-1',
    title: 'Orientation Day',
    body: 'Welcome new students.',
    startAt: '2026-02-01T09:00:00Z',
    endAt: '2026-02-01T12:00:00Z',
    audience: ['Student'],
    organizationNodeId: null,
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
    store = TestBed.inject(ContentEventsStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('loads events within a date range', () => {
    store.loadEvents({ from: '2026-02-01', to: '2026-02-28' });
    const req = httpMock.expectOne((r) => r.url === `${apiBaseUrl}/api/v1/content/events`);
    expect(req.request.params.get('from')).toBe('2026-02-01');
    req.flush([event]);
    expect(store.events()).toEqual([event]);
  });

  it('creates an event with an optional inline translation, no schedule step', () => {
    store
      .createEvent({
        Title: event.title,
        Body: event.body,
        StartAt: event.startAt,
        EndAt: event.endAt,
        Audience: ['Student'],
        TranslationLanguageCode: 'bn',
        TranslationTitle: 'স্বাগতম',
        TranslationBody: 'নতুন শিক্ষার্থীদের স্বাগতম',
      })
      .subscribe();
    const req = httpMock.expectOne(`${apiBaseUrl}/api/v1/content/events`);
    expect(req.request.body.TranslationLanguageCode).toBe('bn');
    req.flush(event);
    expect(store.currentEvent()).toEqual(event);
  });

  it('surfaces an error message when loading events fails', () => {
    store.loadEvents({});
    httpMock
      .expectOne((r) => r.url === `${apiBaseUrl}/api/v1/content/events`)
      .flush(null, { status: 500, statusText: 'Server Error' });
    expect(store.error()).toBeTruthy();
  });
});
