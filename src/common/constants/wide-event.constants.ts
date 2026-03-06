export const WIDE_EVENT = {
  SERVICE_NAME: 'oliveto-api',
  LOGGER_CONTEXT: 'WideEvent',
  UNKNOWN_ERROR: 'UnknownError',
  DEFAULT_VERSION: '0.0.0',
} as const;

export const USER_ACTIONS = {
  PROFILE_VIEW: 'profile_view',
  PROFILE_UPDATE: 'profile_update',
  LIST: 'list',
  ROLE_CHANGE: 'role_change',
} as const;

export const AUTH_ACTIONS = {
  REGISTER: 'register',
  LOGIN: 'login',
  REFRESH: 'refresh',
  LOGOUT: 'logout',
} as const;
