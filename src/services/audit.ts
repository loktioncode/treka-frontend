import api from './api';

export const auditAPI = {
  // Get audit trail with filtering
  getAuditTrail: async (params: {
    start_date?: string;
    end_date?: string;
    action?: string;
    severity?: string;
    user_id?: string;
    client_id?: string;
    resource_type?: string;
    resource_id?: string;
    search?: string;
    skip?: number;
    limit?: number;
  } = {}) => {
    const response = await api.get('/audit', { params });
    return response.data;
  },

  // Get audit summary statistics
  getAuditSummary: async (params: {
    start_date?: string;
    end_date?: string;
    client_id?: string;
  } = {}) => {
    const response = await api.get('/audit/summary', { params });
    return response.data;
  },

  // Export audit trail to CSV
  exportAuditCSV: async (params: {
    start_date?: string;
    end_date?: string;
    action?: string;
    severity?: string;
    user_id?: string;
    client_id?: string;
    resource_type?: string;
    resource_id?: string;
    search?: string;
  } = {}) => {
    const response = await api.get('/audit/export/csv', { 
      params,
      responseType: 'blob'
    });
    
    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `audit_trail_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    
    return response.data;
  },

  // Export audit report to PDF
  exportAuditPDF: async (params: {
    start_date?: string;
    end_date?: string;
    client_id?: string;
  } = {}) => {
    const response = await api.get('/audit/export/pdf', { 
      params,
      responseType: 'blob'
    });
    
    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `audit_report_${new Date().toISOString().split('T')[0]}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    
    return response.data;
  }
};

export default auditAPI;
