import { Clock } from 'lucide-react'
import MedicationCard from './shared/MedicationCard'

interface Medication {
  id: string | number
  name: string
  dosage: string
  time: string
  status: 'taken' | 'missed' | 'upcoming'
  instructions?: string
}

interface TimeSlot {
  time: string
  medications: Medication[]
}

interface UpcomingDosesProps {
  medications: Medication[]
  onMedicationAction?: (medicationId: string | number, action: 'take' | 'snooze') => void
}

const UpcomingDoses = ({ medications, onMedicationAction }: UpcomingDosesProps) => {
  // Group medications by time slot
  const timeSlots: TimeSlot[] = medications
    .filter(med => med.status === 'upcoming')
    .reduce((slots, med) => {
      const existingSlot = slots.find(slot => slot.time === med.time)
      if (existingSlot) {
        existingSlot.medications.push(med)
      } else {
        slots.push({ time: med.time, medications: [med] })
      }
      return slots
    }, [] as TimeSlot[])
    .sort((a, b) => a.time.localeCompare(b.time))

  if (timeSlots.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Upcoming Doses</h2>
        <div className="text-center py-8 text-gray-500">
          No upcoming doses in the next 24 hours.
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Upcoming Doses</h2>
      
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

        {timeSlots.map((slot, index) => (
          <div key={slot.time} className="relative mb-8 last:mb-0">
            {/* Time indicator */}
            <div className="flex items-center mb-4">
              <div className="absolute left-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <Clock className="h-4 w-4 text-blue-600" />
              </div>
              <div className="ml-12 text-lg font-medium text-gray-900">{slot.time}</div>
            </div>

            {/* Medications for this time slot */}
            <div className="ml-12 space-y-4">
              {slot.medications.map((medication) => (
                <MedicationCard
                  key={medication.id}
                  medication={medication}
                  showActions
                  onTake={() => onMedicationAction?.(medication.id, 'take')}
                  onSnooze={() => onMedicationAction?.(medication.id, 'snooze')}
                />
              ))}
            </div>

            {/* Connector line to next time slot */}
            {index < timeSlots.length - 1 && (
              <div className="absolute left-4 bottom-0 w-0.5 h-8 bg-gray-200" />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default UpcomingDoses