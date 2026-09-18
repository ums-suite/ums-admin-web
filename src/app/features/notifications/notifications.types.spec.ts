import { validateNotificationTranslation } from './notifications.types';

describe('validateNotificationTranslation', () => {
  it('requires a Subject for Email', () => {
    expect(validateNotificationTranslation('Email', { Body: 'Hi' })).toContain('Subject');
    expect(validateNotificationTranslation('Email', { Body: 'Hi', Subject: 'Hello' })).toBeNull();
  });

  it('requires a PushTitle for Push', () => {
    expect(validateNotificationTranslation('Push', { Body: 'Hi' })).toContain('PushTitle');
    expect(validateNotificationTranslation('Push', { Body: 'Hi', PushTitle: 'Alert' })).toBeNull();
  });

  it('caps SMS/WhatsApp bodies at 480 characters', () => {
    const longBody = 'a'.repeat(481);
    expect(validateNotificationTranslation('Sms', { Body: longBody })).toContain('480');
    expect(validateNotificationTranslation('WhatsApp', { Body: longBody })).toContain('480');
    expect(validateNotificationTranslation('Sms', { Body: 'a'.repeat(480) })).toBeNull();
  });

  it('has no special validation for InApp', () => {
    expect(validateNotificationTranslation('InApp', { Body: 'a'.repeat(1000) })).toBeNull();
  });
});
