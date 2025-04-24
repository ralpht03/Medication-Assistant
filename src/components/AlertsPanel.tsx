import { AlertCircle, Clock, User, PillIcon, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react"
import { useEffect, useState, useCallback, useRef } from "react"
import { Alerts } from "@/lib/types"

interface Alert extends Alerts {
  id: string;
  time: string;
  patient: string;
}

const POLLING_INTERVAL = {
  normal: 30000,    // 30 seconds for normal operation
  error: 60000,     // 1 minute after an error
  critical: 10000   // 10 seconds for critical alerts
};

const AlertsPanel = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [pollingInterval, setPollingInterval] = useState(POLLING_INTERVAL.normal);
  const isMounted = useRef(true);
  const timeoutId = useRef<NodeJS.Timeout | undefined>(undefined);

  const processAlertData = (data: any[]): Alert[] => {
    return data.map((alert: any) => ({
      ...alert,
      id: alert.id,
      time: new Date(alert.timestamp).toLocaleTimeString(),
      patient: alert.patientId
    }));
  };

  const fetchAlerts = useCallback(async () => {
    if (!isMounted.current) return;

    try {
      setRefreshing(true);
      
      // Get the current user from localStorage
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        throw new Error('User not found');
      }
      
      const user = JSON.parse(userStr);
      const userId = user.id || user.rowKey;
      const role = user.role;

      // Build query parameters based on user role
      const params = new URLSearchParams({
        userId,
        role
      });

      const response = await fetch(`/api/alerts?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch alerts');
      }
      
      const data = await response.json();
      const processedAlerts = processAlertData(data);

      // Only update if data has changed
      if (JSON.stringify(processedAlerts) !== JSON.stringify(alerts)) {
        setAlerts(processedAlerts);
      }

      setError(null);
      setRetryCount(0);
      setPollingInterval(POLLING_INTERVAL.normal);
    } catch (err) {
      console.error('Error fetching alerts:', err);
      setRetryCount(prev => prev + 1);
      setPollingInterval(POLLING_INTERVAL.error);
      
      if (retryCount >= 3) {
        setError('Failed to load alerts after multiple attempts. Please try again later.');
      } else {
        setError('Failed to load alerts. Retrying...');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [alerts, retryCount]);

  useEffect(() => {
    isMounted.current = true;

    const poll = async () => {
      if (!isMounted.current) return;
      await fetchAlerts();
      timeoutId.current = setTimeout(poll, pollingInterval);
    };

    poll();

    return () => {
      isMounted.current = false;
      if (timeoutId.current) {
        clearTimeout(timeoutId.current);
      }
    };
  }, [fetchAlerts, pollingInterval]);

  const handleRetry = () => {
    setRetryCount(0);
    setPollingInterval(POLLING_INTERVAL.normal);
    fetchAlerts();
  };

  const getPriorityColor = (priority: Alert["priority"]) => {
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

  const getAlertIcon = (type: Alert["type"]) => {
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
        <button 
          onClick={handleRetry}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
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
              className={`p-4 ${getPriorityColor(alert.priority)} border-l-4 ${
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
                  <div className="mt-1">
                    <span className="text-xs text-gray-500">Patient ID: </span>
                    <span className="ml-1 text-sm text-gray-500">{alert.patient}</span>
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
