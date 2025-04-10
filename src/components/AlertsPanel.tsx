import { useState } from 'react';
import { AlertCircle, Clock, PillIcon, User, X, Check, AlertTriangle } from 'lucide-react';

interface Alert {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  read: boolean;
  priority: 'critical' | 'high' | 'medium' | 'low';
  medicationId?: string;
  medicationName?: string;
  patientId?: string;
  patientName?: string;
}

interface AlertsPanelProps {
  alerts: Alert[];
  onAlertAction?: (alertId: string, action: 'acknowledge' | 'dismiss' | 'emergency') => void;
  showPatientInfo?: boolean;
  className?: string;
}

const AlertsPanel = ({
  alerts,
  onAlertAction,
  showPatientInfo = false,
  className = ''
}: AlertsPanelProps) => {
  const [filter, setFilter] = useState<'all' | 'unread' | 'critical'>('all');

  // Filter alerts based on the selected filter
  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'unread') return !alert.read;
    if (filter === 'critical') return alert.priority === 'critical';
    return true;
  });

  // Group alerts by type
  const groupedAlerts = filteredAlerts.reduce((groups, alert) => {
    // Simplify the type for grouping
    let groupType = alert.type;
    
    // Group patient-specific alerts with their counterparts
    if (groupType.startsWith('patient_')) {
      groupType = groupType.substring(8); // Remove 'patient_' prefix
    }
    
    const group = groups.find(g => g.type === groupType);
    if (group) {
      group.alerts.push(alert);
    } else {
      groups.push({
        type: groupType,
        alerts: [alert]
      });
    }
    return groups;
  }, [] as { type: string; alerts: Alert[] }[]);

  // Get alert icon based on type
  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'overdose':
      case 'patient_overdose':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'underdose':
      case 'patient_underdose':
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case 'missed_dose':
      case 'patient_missed_dose':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'verification_bypassed':
      case 'patient_verification_bypassed':
        return <PillIcon className="h-5 w-5 text-blue-500" />;
      case 'pill_identification_failed':
      case 'patient_pill_identification_failed':
        return <X className="h-5 w-5 text-purple-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  // Format alert type for display
  const formatAlertType = (type: string) => {
    // Convert snake_case to Title Case
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    }).format(date);
  };

  // Get priority-based styling
  const getPriorityStyles = (priority: Alert['priority']) => {
    switch (priority) {
      case 'critical':
        return 'border-l-red-500 bg-red-50';
      case 'high':
        return 'border-l-orange-500 bg-orange-50';
      case 'medium':
        return 'border-l-yellow-500 bg-yellow-50';
      case 'low':
        return 'border-l-blue-500 bg-blue-50';
      default:
        return 'border-l-gray-500 bg-gray-50';
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-md ${className}`}>
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Alerts</h2>
        <div className="flex space-x-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as 'all' | 'unread' | 'critical')}
            className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Alerts</option>
            <option value="unread">Unread</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>

      {groupedAlerts.length === 0 ? (
        <div className="p-6 text-center text-gray-500">
          <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No alerts to display.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {groupedAlerts.map((group) => (
            <div key={group.type} className="divide-y divide-gray-100">
              <h3 className="p-3 bg-gray-50 text-sm font-medium text-gray-700">
                {formatAlertType(group.type)}
              </h3>
              {group.alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 border-l-4 ${getPriorityStyles(alert.priority)} ${
                    alert.read ? 'opacity-70' : ''
                  }`}
                >
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      {getAlertIcon(alert.type)}
                    </div>
                    <div className="ml-3 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">{alert.message}</p>
                        <span className="text-xs text-gray-500">{formatTimestamp(alert.timestamp)}</span>
                      </div>
                      {showPatientInfo && alert.patientName && (
                        <div className="mt-1 flex items-center">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="ml-1 text-sm text-gray-500">{alert.patientName}</span>
                        </div>
                      )}
                      {alert.medicationName && (
                        <div className="mt-1 flex items-center">
                          <PillIcon className="h-4 w-4 text-gray-400" />
                          <span className="ml-1 text-sm text-gray-500">{alert.medicationName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {onAlertAction && (
                    <div className="mt-3 flex justify-end space-x-3">
                      {!alert.read && (
                        <button
                          onClick={() => onAlertAction(alert.id, 'acknowledge')}
                          className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Acknowledge
                        </button>
                      )}
                      <button
                        onClick={() => onAlertAction(alert.id, 'dismiss')}
                        className="text-sm text-gray-600 hover:text-gray-800 flex items-center"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Dismiss
                      </button>
                      {alert.priority === 'critical' && (
                        <button
                          onClick={() => onAlertAction(alert.id, 'emergency')}
                          className="text-sm text-red-600 hover:text-red-800 flex items-center"
                        >
                          <AlertCircle className="h-4 w-4 mr-1" />
                          Emergency Contact
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AlertsPanel;