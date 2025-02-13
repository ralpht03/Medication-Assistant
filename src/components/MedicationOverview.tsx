import { useState } from 'react'
import { Filter, ChevronDown } from 'lucide-react'
import MedicationCard from './shared/MedicationCard'

interface Medication {
  id: string | number
  name: string
  dosage: string
  time: string
  status: 'taken' | 'missed' | 'upcoming'
  instructions?: string
}

interface MedicationOverviewProps {
  medications: Medication[]
  onMedicationAction?: (medicationId: string | number, action: 'take' | 'snooze') => void
}

const MedicationOverview = ({ medications, onMedicationAction }: MedicationOverviewProps) => {
  const [sortBy, setSortBy] = useState<'time' | 'name'>('time')
  const [filterStatus, setFilterStatus] = useState<'all' | 'taken' | 'missed' | 'upcoming'>('all')

  const filteredMedications = medications.filter(med => 
    filterStatus === 'all' ? true : med.status === filterStatus
  )

  const sortedMedications = [...filteredMedications].sort((a, b) => {
    if (sortBy === 'time') {
      return a.time.localeCompare(b.time)
    }
    return a.name.localeCompare(b.name)
  })

  const statusCounts = medications.reduce(
    (acc, med) => {
      acc[med.status]++
      return acc
    },
    { taken: 0, missed: 0, upcoming: 0 } as Record<string, number>
  )

  return (
    <div>
      <div className="flex items-center justify-end mb-6">
        <div className="flex space-x-4">
          <div className="relative">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="appearance-none bg-white border border-gray-300 rounded-md pl-3 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="taken">Taken</option>
              <option value="missed">Missed</option>
              <option value="upcoming">Upcoming</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          </div>
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'time' | 'name')}
              className="appearance-none bg-white border border-gray-300 rounded-md pl-3 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="time">Sort by Time</option>
              <option value="name">Sort by Name</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6 text-center">
        <div className="bg-green-100 rounded-lg p-3">
          <div className="text-2xl font-bold text-green-800">{statusCounts.taken}</div>
          <div className="text-sm text-green-600">Taken</div>
        </div>
        <div className="bg-red-100 rounded-lg p-3">
          <div className="text-2xl font-bold text-red-800">{statusCounts.missed}</div>
          <div className="text-sm text-red-600">Missed</div>
        </div>
        <div className="bg-yellow-100 rounded-lg p-3">
          <div className="text-2xl font-bold text-yellow-800">{statusCounts.upcoming}</div>
          <div className="text-sm text-yellow-600">Upcoming</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sortedMedications.map((medication) => (
          <MedicationCard
            key={medication.id}
            medication={medication}
            showActions={medication.status === 'upcoming'}
            onTake={() => onMedicationAction?.(medication.id, 'take')}
            onSnooze={() => onMedicationAction?.(medication.id, 'snooze')}
          />
        ))}
      </div>

      {sortedMedications.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No medications found for the selected filters.
        </div>
      )}
    </div>
  )
}

export default MedicationOverview