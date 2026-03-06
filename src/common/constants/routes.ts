export const ROUTES = {
  AUTH: {
    BASE: 'auth',
    LOGIN: 'login',
    REGISTER: 'register',
    REFRESH: 'refresh',
    LOGOUT: 'logout',
  },
  USERS: {
    BASE: 'users',
    ME: 'me',
    ROLE: ':id/role',
  },
  ARTICLES: {
    BASE: 'articles',
    SLUG: 'slug/:slug',
    PUBLISH: ':id/publish',
    ARCHIVE: ':id/archive',
    BY_ID: ':id',
  },
  LEADS: {
    BASE: 'leads',
    BY_ID: ':id',
    STATUS: ':id/status',
    NOTES: ':id/notes',
    READ: ':id/read',
  },
  TAGS: {
    BASE: 'tags',
    BY_ID: ':id',
  },
} as const;
