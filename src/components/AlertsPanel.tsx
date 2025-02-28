import { AlertCircle, Clock, User, PillIcon } from "lucide-react"

interface Alert {
  id: string
  type: "missed" | "overdose" | "expiring" | "verification"
  patient: string
  message: string
  time: string
  priority: "high" | "medium" | "low"
}

const mockAlerts: Alert[] = [
  {
    id: "1",
    type: "missed",
    patient: "John Doe",
    message: "Missed evening medication dose",
    time: "10 minutes ago",
    priority: "high"
  },
  {
    id: "2",
    type: "expiring",
    patient: "Sarah Johnson",
    message: "Medication expires in 3 days",
    time: "1 hour ago",
    priority: "medium"
  },
  {
    id: "3",
    type: "verification",
    patient: "Mike Brown",
    message: "Needs medication verification",
    time: "2 hours ago",
    priority: "low"
  }
]

const AlertsPanel = () => {
  const getPriorityColor = (priority: Alert["priority"]) => {
    switch (priority) {
      case "high":
        return "bg-red-50 border-red-200"
      case "medium":
        return "bg-yellow-50 border-yellow-200"
      case "low":
        return "bg-blue-50 border-blue-200"
      default:
        return "bg-gray-50 border-gray-200"
    }
  }

  const getAlertIcon = (type: Alert["type"]) => {
    switch (type) {
      case "missed":
        return <AlertCircle className="h-5 w-5 text-red-500" />
      case "overdose":
        return <AlertCircle className="h-5 w-5 text-orange-500" />
      case "expiring":
        return <Clock className="h-5 w-5 text-yellow-500" />
      case "verification":
        return <PillIcon className="h-5 w-5 text-blue-500" />
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800">Recent Alerts</h2>
      </div>

      <div className="divide-y divide-gray-200">
        {mockAlerts.map((alert) => (
          <div
            key={alert.id}
            className={`p-4 ${getPriorityColor(alert.priority)} border-l-4 ${
              alert.priority === "high"
                ? "border-l-red-500"
                : alert.priority === "medium"
                ? "border-l-yellow-500"
                : "border-l-blue-500"
            }`}
          >
            <div className="flex items-start">
              <div className="flex-shrink-0">{getAlertIcon(alert.type)}</div>
              <div className="ml-3 flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">{alert.message}</p>
                  <span className="text-xs text-gray-500">{alert.time}</span>
                </div>
                <div className="mt-1 flex items-center">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="ml-1 text-sm text-gray-500">{alert.patient}</span>
                </div>
              </div>
            </div>
            <div className="mt-3 flex justify-end space-x-3">
              <button className="text-sm text-blue-600 hover:text-blue-800">
                View Details
              </button>
              <button className="text-sm text-gray-600 hover:text-gray-800">
                Dismiss
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 bg-gray-50 border-t border-gray-200">
        <button className="w-full text-center text-sm text-blue-600 hover:text-blue-800">
          View All Alerts
        </button>
      </div>
    </div>
  )
}

export default AlertsPanel