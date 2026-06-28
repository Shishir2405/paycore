import { api } from './client';

export type AuditLogEntry = {
  id: string;
  timestamp: string;
  actorId: string | null;
  actorName: string;
  action: string;
  module: string;
  entityId?: string;
  summary: string;
  changeCount: number;
  ip?: string;
  userAgent?: string;
};

export type AuditListParams = {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  module?: string;
  action?: string;
  actorId?: string;
  from?: string;
  to?: string;
};

export const auditApi = {
  list: (params: AuditListParams) => api.list<AuditLogEntry>('/audit', params),
  modules: () => api.get<string[]>('/audit', { facet: 'modules' }),
  exportUrl: (params?: Omit<AuditListParams, 'page' | 'limit'>) => api.downloadUrl('/audit/export', params),
};
