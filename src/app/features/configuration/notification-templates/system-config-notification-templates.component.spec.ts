import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../../../core/config/app-config';
import { SystemConfigNotificationTemplatesComponent } from './system-config-notification-templates.component';

describe('SystemConfigNotificationTemplatesComponent', () => {
  let httpMock: HttpTestingController;
  const apiBaseUrl = 'http://localhost:8080';

  const emailTemplate = {
    id: 'tmpl-1',
    eventType: 'PaymentReceived',
    channel: 'Email',
    version: 1,
    translations: [],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SystemConfigNotificationTemplatesComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { ...DEFAULT_APP_CONFIG, apiBaseUrl } },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('does not get-or-create without an event type', () => {
    const fixture = TestBed.createComponent(SystemConfigNotificationTemplatesComponent);
    fixture.detectChanges();
    fixture.componentInstance['submitGetOrCreate']();
    httpMock.expectNone(`${apiBaseUrl}/api/v1/notifications/templates`);
  });

  it('blocks an Email translation missing a Subject client-side, never calling the API', () => {
    const fixture = TestBed.createComponent(SystemConfigNotificationTemplatesComponent);
    fixture.detectChanges();
    fixture.componentInstance['editTranslationFor'](emailTemplate);
    fixture.componentInstance['editBody'].set('Thanks for your payment.');
    fixture.componentInstance['submitTranslation']();

    httpMock.expectNone(`${apiBaseUrl}/api/v1/notifications/templates/tmpl-1`);
    expect(fixture.componentInstance['editValidationError']()).toContain('Subject');
  });

  it('upserts a valid Email translation', () => {
    const fixture = TestBed.createComponent(SystemConfigNotificationTemplatesComponent);
    fixture.detectChanges();
    fixture.componentInstance['editTranslationFor'](emailTemplate);
    fixture.componentInstance['editSubject'].set('Payment received');
    fixture.componentInstance['editBody'].set('Thanks for your payment.');
    fixture.componentInstance['submitTranslation']();

    const req = httpMock.expectOne(`${apiBaseUrl}/api/v1/notifications/templates/tmpl-1`);
    expect(req.request.body.Subject).toBe('Payment received');
    req.flush({
      ...emailTemplate,
      version: 2,
      translations: [
        {
          languageCode: 'en',
          subject: 'Payment received',
          body: 'Thanks for your payment.',
          pushTitle: null,
          deepLink: null,
        },
      ],
    });
  });
});
