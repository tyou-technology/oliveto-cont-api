export const TAGS_ROUTES = {
  BASE: 'tags',
  BY_ID: ':id',
} as const;

export const TAG_ACTIONS = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  VIEW: 'view',
  LIST: 'list',
} as const;

export const TAG_ERROR_MESSAGES = {
  TAG_NOT_FOUND: 'Tag not found',
  TAG_NAME_ALREADY_EXISTS: 'Tag name already exists',
} as const;
