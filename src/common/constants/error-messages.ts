export const ERROR_MESSAGES = {
  USER_NOT_FOUND: 'User not found',
  EMAIL_ALREADY_EXISTS: 'Email already exists',
  ADMIN_CANNOT_CHANGE_OWN_ROLE: 'Admins cannot change their own role',
  INVALID_CREDENTIALS: 'Invalid credentials',
  INVALID_REFRESH_TOKEN: 'Invalid refresh token',
  ARTICLE_NOT_FOUND: 'Article not found',
  TAG_NOT_FOUND: 'Tag not found',
  TAG_NAME_ALREADY_EXISTS: 'Tag name already exists',
  LEAD_NOT_FOUND: 'Lead not found',
} as const;

export const DB_ERROR_MESSAGES = {
  UNEXPECTED: 'An unexpected database error occurred',
  UNIQUE_CONSTRAINT: 'A record with this value already exists',
  RECORD_NOT_FOUND: 'The requested record was not found',
  FOREIGN_KEY_VIOLATION: 'Related record does not exist',
} as const;

export const DB_ERROR_CODES = {
  DATABASE_ERROR: 'DATABASE_ERROR',
  UNIQUE_CONSTRAINT_VIOLATION: 'UNIQUE_CONSTRAINT_VIOLATION',
  RECORD_NOT_FOUND: 'RECORD_NOT_FOUND',
  FOREIGN_KEY_VIOLATION: 'FOREIGN_KEY_VIOLATION',
} as const;
