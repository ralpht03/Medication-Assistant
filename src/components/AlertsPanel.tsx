import { AlertCircle, Clock, User, PillIcon, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react"
import { useEffect, useState, useCallback, useRef } from "react"
import { Alerts } from "@/lib/types"

interface Alert extends Alerts {
  id: string;
  time: string;
}

interface AlertsPanelProps {
  alerts: Alert[];
  onAlertAction: (alertId: string, action: 'acknowledge' | 'dismiss' | 'emergency') => Promise<void>;
  showPatientInfo: boolean;
}

const POLLING_INTERVAL = {
  normal: 30000,    // 30 seconds for normal operation
  error: 60000,     // 1 minute after an error
  critical: 10000   // 10 seconds for critical alerts
};

const AlertsPanel = ({ alerts, onAlertAction, showPatientInfo }: AlertsPanelProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

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
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  if (loading && !refreshing) {
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
        {alerts.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No alerts to display</p>
            <p className="text-sm text-gray-400 mt-1">You'll be notified when new alerts come in</p>
          </div>
        ) : (
          alerts.map((alert) => (
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
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">{alert.message}</p>
                  <span className="text-xs text-gray-500">{alert.time}</span>
                  {showPatientInfo && (
                    <div className="mt-1">
                      <span className="text-xs text-gray-500">Patient ID: </span>
                      <span className="ml-1 text-sm text-gray-500">{alert.patientId}</span>
                    </div>
                  )}
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
