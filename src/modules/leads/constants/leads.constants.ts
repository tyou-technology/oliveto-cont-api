export const LEADS_ROUTES = {
  BASE: 'leads',
  UNREAD_COUNT: 'unread/count',
  BY_ID: ':id',
  STATUS: ':id/status',
  NOTES: ':id/notes',
  READ: ':id/read',
} as const;

export const LEAD_ACTIONS = {
  CREATE: 'create',
  VIEW: 'view',
  LIST: 'list',
  COUNT_UNREAD: 'count_unread',
  UPDATE_STATUS: 'update_status',
  ADD_NOTES: 'add_notes',
  MARK_AS_READ: 'mark_as_read',
} as const;

export const LEAD_ERROR_MESSAGES = {
  LEAD_NOT_FOUND: 'Lead not found',
} as const;
