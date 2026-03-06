export const BCRYPT_SALT_ROUNDS = 10;

export const USERS_ROUTES = {
  BASE: 'users',
  ME: 'me',
  ROLE: ':id/role',
} as const;

export const USER_ACTIONS = {
  PROFILE_VIEW: 'profile_view',
  PROFILE_UPDATE: 'profile_update',
  LIST: 'list',
  ROLE_CHANGE: 'role_change',
} as const;

export const USER_ERROR_MESSAGES = {
  USER_NOT_FOUND: 'User not found',
  EMAIL_ALREADY_EXISTS: 'Email already exists',
  ADMIN_CANNOT_CHANGE_OWN_ROLE: 'Admins cannot change their own role',
} as const;
