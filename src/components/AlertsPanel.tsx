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
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalPages, setTotalPages] = useState(1);

  const processAlertData = (data: Alerts[]): Alert[] => {
    return data.map((alert: Alerts) => ({
      ...alert,
      id: alert.RowKey,
      time: new Date(alert.Timestamp).toLocaleTimeString(),
      patient: alert.PartitionKey
    }));
  };

  const fetchAlerts = useCallback(async () => {
    if (!isMounted.current) return;

    try {
      setRefreshing(true);
      const response = await fetch(`/api/notifications?page=${page}&limit=10`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch alerts');
      }
      
      const { data, pagination } = await response.json();
      const processedAlerts = processAlertData(data);

      // Only update if data has changed
      if (JSON.stringify(processedAlerts) !== JSON.stringify(alerts)) {
        setAlerts(processedAlerts);
      }

      setTotalPages(pagination.totalPages);
      setHasMore(page < pagination.totalPages);
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
  }, [alerts, retryCount, page]);

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

  const handleNextPage = () => {
    if (hasMore) {
      setPage(prev => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (page > 1) {
      setPage(prev => prev - 1);
    }
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
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Recent Alerts</h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrevPage}
            disabled={page === 1}
            className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50"
          >
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </button>
          <span className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={handleNextPage}
            disabled={!hasMore}
            className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50"
          >
            <ChevronRight className="h-5 w-5 text-gray-600" />
          </button>
          <button
            onClick={fetchAlerts}
            disabled={refreshing}
            className={`p-2 rounded-full hover:bg-gray-100 ${refreshing ? 'animate-spin' : ''}`}
            title="Refresh alerts"
          >
            <RefreshCw className={`h-5 w-5 ${refreshing ? 'text-gray-400' : 'text-gray-600'}`} />
          </button>
        </div>
      </div>
      <div className="space-y-4">
        {alerts.map((alert) => (
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
        ))}
      </div>
    </div>
  );
};

export default AlertsPanel;