export const ARTICLES_ROUTES = {
  BASE: 'articles',
  SLUG: 'slug/:slug',
  PUBLISH: ':id/publish',
  ARCHIVE: ':id/archive',
  BY_ID: ':id',
} as const;

export const ARTICLE_ACTIONS = {
  CREATE: 'create',
  UPDATE: 'update',
  PUBLISH: 'publish',
  ARCHIVE: 'archive',
  DELETE: 'delete',
  VIEW: 'view',
  LIST: 'list',
} as const;

export const ARTICLE_ERROR_MESSAGES = {
  ARTICLE_NOT_FOUND: 'Article not found',
} as const;
