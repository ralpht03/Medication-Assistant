import { AlertCircle, Clock, User, PillIcon, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react"
import { useEffect, useState, useCallback, useRef } from "react"
import { Alerts } from "@/lib/types"

interface Alert extends Alerts {
  id: string;
  time: string;
  dismissed?: boolean;
}

interface AlertsPanelProps {
  alerts: Alert[];
  onAlertAction: (alertId: string, action: 'acknowledge' | 'refresh') => Promise<void>;
  showPatientInfo: boolean;
}

const AlertsPanel = ({ alerts, onAlertAction, showPatientInfo}: AlertsPanelProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localAlerts, setLocalAlerts] = useState<Alert[]>(alerts);

  // Update local alerts when props change
  useEffect(() => {
    setLocalAlerts(alerts);
  }, [alerts]);

  const handleAcknowledge = async (alertId: string) => {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        throw new Error('User not found');
      }

      const user = JSON.parse(userStr);
      const alert = localAlerts.find(a => a.id === alertId);
      if (!alert) {
        throw new Error('Alert not found');
      }

      const response = await fetch(`/api/alerts`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          alertId,
          userId: ['helper', 'admin'].includes(user.role) ? alert.patientId : user.id || user.rowKey || user.RowKey,
          role: user.role,
          action: 'acknowledge'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to acknowledge alert');
      }

      // Update local state
      setLocalAlerts(prevAlerts => 
        prevAlerts.map(alert => 
          alert.id === alertId 
            ? { 
                ...alert, 
                [`${user.role}Ack`]: true,
                read: true
              } 
            : alert
        )
      );
    } catch (err) {
      console.error('Error acknowledging alert:', err);
      setError(err instanceof Error ? err.message : 'Failed to acknowledge alert');
    }
  };

  const handleDismiss = (alertId: string) => {
    setLocalAlerts(prevAlerts => 
      prevAlerts.filter(alert => alert.id !== alertId)
    );
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-50 border-red-500";
      case "medium":
        return "bg-orange-50 border-orange-500";
      case "low":
        return "bg-yellow-50 border-yellow-500";
      default:
        return "bg-gray-50 border-gray-500";
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "overdose":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case "underdose":
        return <AlertCircle className="h-5 w-5 text-orange-500" />;
      case "verification_bypass":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case "pill_identification_failed":
        return <AlertCircle className="h-5 w-5 text-purple-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const isAlertAcknowledged = (alert: Alert) => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      throw new Error('User not found');
    }

    const user = JSON.parse(userStr);
    switch (user.role) {
      case 'admin':
        return alert.adminAck;
      case 'patient':
        return alert.patientAck;
      case 'helper':
        return alert.helperAck;
      default:
        return false;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 p-4">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="space-y-4">
        {localAlerts.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No alerts to display</p>
            <p className="text-sm text-gray-400 mt-1">You'll be notified when new alerts come in</p>
          </div>
        ) : (
          localAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 ${getPriorityColor(alert.priority || 'medium')} border-l-4 ${
                alert.priority === "high"
                  ? "border-red-500"
                  : alert.priority === "medium"
                  ? "border-orange-500"
                  : "border-yellow-500"
              } rounded-r`}
            >
              <div className="flex items-start">
                <div className="flex-shrink-0">{getAlertIcon(alert.type)}</div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-gray-900">{alert.message}</p>
                  <span className="text-xs text-gray-500">{alert.time}</span>
                  {showPatientInfo && (
                    <div className="mt-1">
                      <span className="text-xs text-gray-500">Patient: </span>
                      <span className="ml-1 text-sm text-gray-500">{alert.patientName || 'Unknown Patient'}</span>
                    </div>
                  )}
                  <div className="mt-2 flex space-x-2">
                    {!isAlertAcknowledged(alert) && (
                      <button
                        onClick={() => handleAcknowledge(alert.id)}
                        className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Acknowledge
                      </button>
                    )}
                    <button
                      onClick={() => handleDismiss(alert.id)}
                      className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AlertsPanel;
