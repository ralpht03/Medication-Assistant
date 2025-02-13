"use client"

import { useState } from 'react'
import Header from '@/components/Header'
import Sidebar from '@/components/Sidebar'
import Calendar from '@/components/shared/Calendar'
import Timeline from '@/components/shared/Timeline'
import { format, addDays, subDays } from 'date-fns'

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

// Mock data for calendar events
const mockCalendarEvents: MedicationEvent[] = [
  {
    id: 1,
    title: "Aspirin 100mg",
    start: new Date(2025, 1, 7, 8, 0),
    end: new Date(2025, 1, 7, 8, 15),
    status: "taken",
    medication: {
      name: "Aspirin",
      dosage: "100mg",
      frequency: "Daily",
      instructions: "Take with food"
    }
  },
  {
    id: 2,
    title: "Lisinopril 10mg",
    start: new Date(2025, 1, 7, 12, 0),
    end: new Date(2025, 1, 7, 12, 15),
    status: "missed",
    medication: {
      name: "Lisinopril",
      dosage: "10mg",
      frequency: "Daily",
      instructions: "Take with water"
    }
  },
  {
    id: 3,
    title: "Metformin 500mg",
    start: new Date(2025, 1, 7, 18, 0),
    end: new Date(2025, 1, 7, 18, 15),
    status: "upcoming",
    medication: {
      name: "Metformin",
      dosage: "500mg",
      frequency: "Daily",
      instructions: "Take with evening meal"
    }
  }
]

// Mock data for timeline events
const mockTimelineEvents = mockCalendarEvents.map(event => ({
  id: event.id,
  medicationName: event.medication.name,
  dosage: event.medication.dosage,
  scheduledTime: event.start,
  status: event.status,
  notes: event.medication.instructions
}))

export default function SchedulePage() {
  const [selectedEvent, setSelectedEvent] = useState<MedicationEvent | null>(null)
  const [dateRange, setDateRange] = useState({
    start: subDays(new Date(), 7),
    end: addDays(new Date(), 7)
  })
  const [statusFilter, setStatusFilter] = useState<'all' | 'taken' | 'missed' | 'upcoming'>('all')

  const handleEventClick = (event: MedicationEvent) => {
    setSelectedEvent(event)
  }

  const filteredTimelineEvents = mockTimelineEvents.filter(event => 
    statusFilter === 'all' ? true : event.status === statusFilter
  )

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <div className="flex min-h-screen pt-16">
        <div className="w-64 flex-shrink-0">
          <Sidebar />
        </div>
        <div className="flex-1">
          <div className="px-8 py-6">
            {/* Calendar Section */}
            <section className="mb-8">
              <div className="bg-white rounded-lg shadow-md">
                <div className="p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Medication Schedule</h2>
                  <Calendar
                    events={mockCalendarEvents}
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
                  <Timeline
                    events={filteredTimelineEvents}
                    onEventClick={(event) => {
                      const calendarEvent = mockCalendarEvents.find(e => e.id === event.id)
                      if (calendarEvent) {
                        handleEventClick(calendarEvent)
                      }
                    }}
                  />
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

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
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}