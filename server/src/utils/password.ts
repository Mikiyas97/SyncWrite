/**
 * Strong password rules:
 * - Minimum 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 digit
 * - At least 1 special character (@$!%*?&)
 */
export const STRONG_PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export const STRONG_PASSWORD_MESSAGE =
  'Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character (@$!%*?&)';

export const isStrongPassword = (password: string): boolean =>
  STRONG_PASSWORD_REGEX.test(password);
