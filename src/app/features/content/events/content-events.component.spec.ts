import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { UmsToastService } from '@ums/design-system';
import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../../../core/config/app-config';
import { ContentEventsComponent } from './content-events.component';

describe('ContentEventsComponent', () => {
  let httpMock: HttpTestingController;
  let toast: UmsToastService;
  const apiBaseUrl = 'http://localhost:8080';

  const event = {
    id: 'e-1',
    title: 'Orientation',
    body: 'Welcome',
    startAt: '2026-02-01T09:00:00Z',
    endAt: '2026-02-01T12:00:00Z',
    audience: ['Student'],
    organizationNodeId: null,
    version: 1,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContentEventsComponent],
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

  it('does not create an event without required fields', () => {
    const fixture = TestBed.createComponent(ContentEventsComponent);
    fixture.detectChanges();
    fixture.componentInstance['submitCreate']();
    httpMock.expectNone(`${apiBaseUrl}/api/v1/content/events`);
  });

  it('creates an event without an inline translation when none is provided', () => {
    const fixture = TestBed.createComponent(ContentEventsComponent);
    fixture.detectChanges();
    fixture.componentInstance['newTitle'].set(event.title);
    fixture.componentInstance['newBody'].set(event.body);
    fixture.componentInstance['newStartAt'].set(event.startAt);
    fixture.componentInstance['newEndAt'].set(event.endAt);
    fixture.componentInstance['submitCreate']();

    const req = httpMock.expectOne(`${apiBaseUrl}/api/v1/content/events`);
    expect(req.request.body.TranslationLanguageCode).toBeUndefined();
    req.flush(event);
  });

  it('surfaces a conflict banner on a 409 while adding a translation', () => {
    const fixture = TestBed.createComponent(ContentEventsComponent);
    fixture.detectChanges();
    fixture.componentInstance['loadForEdit']('e-1');
    httpMock.expectOne(`${apiBaseUrl}/api/v1/content/events/e-1`).flush(event);

    fixture.componentInstance['editTranslationLanguage'].set('bn');
    fixture.componentInstance['editTranslationTitle'].set('স্বাগতম');
    fixture.componentInstance['editTranslationBody'].set('বার্তা');
    fixture.componentInstance['submitTranslation']();

    httpMock
      .expectOne(`${apiBaseUrl}/api/v1/content/events/e-1/translations`)
      .flush({ code: 'version_conflict' }, { status: 409, statusText: 'Conflict' });
    expect(fixture.componentInstance['conflict']()).toBeTrue();
  });

  it('adds a translation successfully', () => {
    const fixture = TestBed.createComponent(ContentEventsComponent);
    fixture.detectChanges();
    fixture.componentInstance['loadForEdit']('e-1');
    httpMock.expectOne(`${apiBaseUrl}/api/v1/content/events/e-1`).flush(event);

    fixture.componentInstance['editTranslationLanguage'].set('bn');
    fixture.componentInstance['editTranslationTitle'].set('স্বাগতম');
    fixture.componentInstance['editTranslationBody'].set('বার্তা');
    fixture.componentInstance['submitTranslation']();

    httpMock.expectOne(`${apiBaseUrl}/api/v1/content/events/e-1/translations`).flush(event);
    expect(toast.toasts()[0].message).toBe('Translation added.');
  });
});
