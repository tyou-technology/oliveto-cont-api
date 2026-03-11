export const ARTICLES_ROUTES = {
  BASE: 'articles',
  PUBLISHED: 'published',
  SLUG: 'slug/:slug',
  PUBLISH: ':id/publish',
  ARCHIVE: ':id/archive',
  VIEW: ':id/view',
  BY_ID: ':id',
} as const;

export const ARTICLE_ACTIONS = {
  CREATE: 'create',
  UPDATE: 'update',
  PUBLISH: 'publish',
  ARCHIVE: 'archive',
  DELETE: 'delete',
  VIEW: 'view',
  TRACK_VIEW: 'track_view',
  LIST: 'list',
  LIST_PUBLISHED: 'list_published',
} as const;

export const ARTICLE_ERROR_MESSAGES = {
  ARTICLE_NOT_FOUND: 'Article not found',
} as const;
