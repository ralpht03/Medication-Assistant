import { Check, Clock, X, Bell } from "lucide-react"

interface MedicationCardProps {
  medication: {
    id: string | number
    name: string
    dosage: string
    time: string
    status: 'taken' | 'missed' | 'upcoming'
    instructions?: string
  }
  showActions?: boolean
  onTake?: () => void
  onSnooze?: () => void
}

const statusConfig = {
  taken: { icon: Check, className: "bg-green-100 text-green-800", text: "Taken" },
  missed: { icon: X, className: "bg-red-100 text-red-800", text: "Missed" },
  upcoming: { icon: Clock, className: "bg-yellow-100 text-yellow-800", text: "Upcoming" }
}

const MedicationCard = ({ medication, showActions = false, onTake, onSnooze }: MedicationCardProps) => {
  const StatusIcon = statusConfig[medication.status].icon

  return (
    <div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-medium text-gray-900">{medication.name}</h3>
          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusConfig[medication.status].className}`}>
            <StatusIcon className="h-4 w-4 mr-1" />
            {statusConfig[medication.status].text}
          </span>
        </div>
      </div>
      
      <div className="mt-2 grid grid-cols-2 gap-4">
        <div className="text-sm text-gray-500">
          <span className="font-medium">Dosage:</span> {medication.dosage}
        </div>
        <div className="text-sm text-gray-500">
          <span className="font-medium">Time:</span> {medication.time}
        </div>
      </div>

      {medication.instructions && (
        <div className="mt-2 text-sm text-gray-500">
          <span className="font-medium">Instructions:</span> {medication.instructions}
        </div>
      )}

      {showActions && medication.status === 'upcoming' && (
        <div className="mt-4 flex space-x-3">
          <button
            onClick={onTake}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Take Now
          </button>
          <button
            onClick={onSnooze}
            className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
          >
            <Bell className="inline-block h-4 w-4 mr-1" />
            Remind Later
          </button>
        </div>
      )}
    </div>
  )
}

export default MedicationCard