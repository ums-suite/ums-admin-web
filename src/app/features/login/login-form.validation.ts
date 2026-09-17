export interface LoginFormValues {
  readonly identifier: string;
  readonly password: string;
}

export interface LoginFormErrors {
  readonly identifier?: string;
  readonly password?: string;
}

export function validateLoginForm(values: LoginFormValues): LoginFormErrors {
  const errors: { identifier?: string; password?: string } = {};
  if (!values.identifier.trim()) {
    errors.identifier = 'Enter your username or email.';
  }
  if (!values.password) {
    errors.password = 'Enter your password.';
  }
  return errors;
}

export function isLoginFormValid(errors: LoginFormErrors): boolean {
  return Object.keys(errors).length === 0;
}
