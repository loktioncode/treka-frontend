export type AuditAction =
  | 'user_login' | 'user_logout' | 'user_created' | 'user_updated' | 'user_deactivated'
  | 'client_created' | 'client_updated' | 'client_deactivated'
  | 'asset_created' | 'asset_updated' | 'asset_deleted'
  | 'component_created' | 'component_updated' | 'component_deleted'
  | 'maintenance_log_created' | 'maintenance_log_updated' | 'maintenance_scheduled'
  | 'notification_created' | 'notification_sent' | 'notification_escalated' | 'notification_failed'
  | 'system_config_changed' | 'database_backup' | 'scheduled_task_run';

export type AuditSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface AuditHistoryEntry {
  timestamp: string;
  action: string;
  recipients_count?: number;
  recipient?: string;
  error?: string;
  // Escalation properties
  from_urgency?: string;
  to_urgency?: string;
  reason?: string;
  days_until_maintenance?: number;
}


export interface AuditEntry {
  id: string;
  timestamp: string;
  action: AuditAction;
  severity: AuditSeverity;
  user_id?: string;
  user_email?: string;
  user_role?: string;
  client_id?: string;
  resource_type?: string;
  resource_id?: string;
  resource_name?: string;
  description: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  changes_summary?: string;
  escalation_from?: string;
  escalation_to?: string;
  escalation_reason?: string;
  session_id?: string;
  request_id?: string;
  tags: string[];
}

export interface AuditFilters {
  start_date?: string;
  end_date?: string;
  action?: AuditAction;
  severity?: AuditSeverity;
  user_id?: string;
  client_id?: string;
  resource_type?: string;
  resource_id?: string;
  tags?: string[];
  search?: string;
  skip?: number;
  limit?: number;
}

export interface AuditSummary {
  total_entries: number;
  entries_by_action: Record<string, number>;
  entries_by_severity: Record<string, number>;
  entries_by_user: Record<string, number>;
  entries_by_client: Record<string, number>;
  entries_by_resource: Record<string, number>;
  escalation_count: number;
  critical_actions_count: number;
  date_range: {
    start: string;
    end: string;
  };
}

export interface AuditExportOptions {
  start_date?: string;
  end_date?: string;
  action?: AuditAction;
  severity?: AuditSeverity;
  user_id?: string;
  client_id?: string;
  resource_type?: string;
  resource_id?: string;
  search?: string;
}
