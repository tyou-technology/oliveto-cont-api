export const BCRYPT_SALT_ROUNDS = 12;

export const REFRESH_TOKEN_COOKIE = 'refresh_token';

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
  MISSING_REFRESH_TOKEN: 'Refresh token cookie is missing',
} as const;
