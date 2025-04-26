"use client"

import { useState, useEffect } from 'react'
import Calendar from '@/components/shared/Calendar'
import Timeline from '@/components/shared/Timeline'
import { format, addDays, subDays, parse } from 'date-fns'
import PageLayout from '@/components/PageLayout'
import { useRouter } from 'next/navigation'

interface Medication {
  rowKey: string
  name: string
  dosage: string
  frequency: string
  time?: string
  instructions?: string
  startDate?: string
  endDate?: string
  lastFilled?: string
}

interface MedicationEvent {
  id: string | number
  title: string
  start: Date
  end: Date
  status: 'taken' | 'missed' | 'upcoming'
  medication: {
    name: string
    dosage: string
    frequency: string
    instructions?: string
  }
}

export default function SchedulePage() {
  const [medications, setMedications] = useState<Medication[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<MedicationEvent | null>(null)
  const [dateRange, setDateRange] = useState({
    start: subDays(new Date(), 7),
    end: addDays(new Date(), 7)
  })
  const [statusFilter, setStatusFilter] = useState<'all' | 'taken' | 'missed' | 'upcoming'>('all')
  const router = useRouter()

  useEffect(() => {
    const fetchMedications = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Get the patient ID from localStorage
        const userStr = localStorage.getItem('user')
        if (!userStr) {
          router.push('/login')
          return
        }
        
        const user = JSON.parse(userStr)
        const patientId = user.id || user.rowKey
        
        if (!patientId) {
          throw new Error('Patient ID not found')
        }
        
        // Fetch medications
        const response = await fetch(`/api/medications?patientId=${patientId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch medications')
        }
        
        const data = await response.json()
        setMedications(data.medications || [])
      } catch (err) {
        console.error('Error fetching medications:', err)
        setError(err instanceof Error ? err.message : 'An unknown error occurred')
      } finally {
        setLoading(false)
      }
    }
    
    fetchMedications()
  }, [router])

  // Transform medications into calendar events
  const calendarEvents: MedicationEvent[] = medications.flatMap(medication => {
    const now = new Date()
    const [hours, minutes] = (medication.time || '08:00').split(':').map(Number)
    
    // Parse start and end dates
    const startDate = medication.startDate ? new Date(medication.startDate) : new Date()
    const endDate = medication.endDate ? new Date(medication.endDate) : addDays(new Date(), 30) // Default to 30 days if no end date
    
    // Generate events for each day in the range
    const events: MedicationEvent[] = []
    let currentDate = new Date(startDate)
    
    while (currentDate <= endDate) {
      // Create event for current date
      const eventDate = new Date(currentDate)
      eventDate.setHours(hours, minutes, 0, 0)
      
      // Determine status based on current time
      let status: 'taken' | 'missed' | 'upcoming' = 'upcoming'
      if (eventDate < now) {
        status = 'missed'
      }
      
      events.push({
        id: `${medication.rowKey}-${currentDate.toISOString()}`,
        title: `${medication.name} ${medication.dosage}`,
        start: eventDate,
        end: new Date(eventDate.getTime() + 15 * 60000), // 15 minutes duration
        status,
        medication: {
          name: medication.name,
          dosage: medication.dosage,
          frequency: medication.frequency,
          instructions: medication.instructions
        }
      })
      
      // Move to next day
      currentDate = addDays(currentDate, 1)
    }
    
    return events
  })

  const handleEventClick = (event: MedicationEvent) => {
    setSelectedEvent(event)
  }

  const filteredTimelineEvents = calendarEvents.map(event => ({
    id: event.id,
    medicationName: event.medication.name,
    dosage: event.medication.dosage,
    scheduledTime: event.start,
    status: event.status,
    notes: event.medication.instructions
  })).filter(event =>
    statusFilter === 'all' ? true : event.status === statusFilter
  )

  if (loading) {
    return (
      <PageLayout userType="patient" title="Medication Schedule">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </PageLayout>
    )
  }

  if (error) {
    return (
      <PageLayout userType="patient" title="Medication Schedule">
        <div className="flex items-center justify-center h-64">
          <div className="text-red-500">{error}</div>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout userType="patient" title="Medication Schedule">
      {/* Calendar Section */}
      <section className="mb-8">
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6">
            <Calendar
              events={calendarEvents}
              onEventClick={handleEventClick}
            />
          </div>
        </div>
      </section>

      {/* History Section */}
      <section>
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Medication History</h2>
              <div className="flex flex-wrap gap-4">
                <select
                  className="min-w-[150px] bg-white border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                >
                  <option value="all">All Status</option>
                  <option value="taken">Taken</option>
                  <option value="missed">Missed</option>
                  <option value="upcoming">Upcoming</option>
                </select>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    className="bg-white border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={format(dateRange.start, 'yyyy-MM-dd')}
                    onChange={(e) => {
                      const newStart = new Date(e.target.value)
                      setDateRange(prev => ({ ...prev, start: newStart }))
                    }}
                  />
                  <span className="text-gray-500">to</span>
                  <input
                    type="date"
                    className="bg-white border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={format(dateRange.end, 'yyyy-MM-dd')}
                    onChange={(e) => {
                      const newEnd = new Date(e.target.value)
                      setDateRange(prev => ({ ...prev, end: newEnd }))
                    }}
                  />
                </div>
              </div>
            </div>
            <Timeline events={filteredTimelineEvents} />
          </div>
        </div>
      </section>

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {selectedEvent.medication.name}
            </h3>
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Dosage:</span> {selectedEvent.medication.dosage}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Time:</span>{' '}
                {format(selectedEvent.start, 'h:mm a')}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Frequency:</span>{' '}
                {selectedEvent.medication.frequency}
              </p>
              {selectedEvent.medication.instructions && (
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Instructions:</span>{' '}
                  {selectedEvent.medication.instructions}
                </p>
              )}
              <p className="text-sm text-gray-600">
                <span className="font-medium">Status:</span>{' '}
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                    ${
                      selectedEvent.status === 'taken'
                        ? 'bg-green-100 text-green-800'
                        : selectedEvent.status === 'missed'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }
                  `}
                >
                  {selectedEvent.status}
                </span>
              </p>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  )
}