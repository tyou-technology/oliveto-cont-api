export const BCRYPT_SALT_ROUNDS = 10;

export const AUTH_ROUTES = {
  BASE: 'auth',
  REGISTER: 'register',
  LOGIN: 'login',
  REFRESH: 'refresh',
  LOGOUT: 'logout',
} as const;

export const AUTH_ACTIONS = {
  REGISTER: 'register',
  LOGIN: 'login',
  REFRESH: 'refresh',
  LOGOUT: 'logout',
} as const;

export const AUTH_ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Invalid credentials',
  INVALID_REFRESH_TOKEN: 'Invalid refresh token',
} as const;
