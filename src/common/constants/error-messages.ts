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
