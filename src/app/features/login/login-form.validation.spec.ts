import { isLoginFormValid, validateLoginForm } from './login-form.validation';

describe('validateLoginForm', () => {
  it('requires a non-blank identifier', () => {
    const errors = validateLoginForm({ identifier: '   ', password: 'x' });
    expect(errors.identifier).toBeDefined();
  });

  it('requires a non-empty password', () => {
    const errors = validateLoginForm({ identifier: 'jdoe', password: '' });
    expect(errors.password).toBeDefined();
  });

  it('returns no errors for valid input', () => {
    const errors = validateLoginForm({ identifier: 'jdoe', password: 'secret' });
    expect(isLoginFormValid(errors)).toBeTrue();
  });

  it('isLoginFormValid is false when any error is present', () => {
    expect(isLoginFormValid({ identifier: 'required' })).toBeFalse();
  });
});
