"use client"

import { useState } from 'react'
import { format } from 'date-fns'
import { Check, X, Clock } from 'lucide-react'

interface TimelineEvent {
  id: string | number
  medicationName: string
  dosage: string
  scheduledTime: Date
  status: 'taken' | 'missed' | 'upcoming'
  notes?: string
}

interface TimelineProps {
  events: TimelineEvent[]
  onEventClick?: (event: TimelineEvent) => void
}

const Timeline = ({ events, onEventClick }: TimelineProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const groupedEvents = events.reduce((groups, event) => {
    const date = format(event.scheduledTime, 'yyyy-MM-dd')
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(event)
    return groups
  }, {} as Record<string, TimelineEvent[]>)

  const getStatusIcon = (status: TimelineEvent['status']) => {
    switch (status) {
      case 'taken':
        return <Check className="h-5 w-5 text-green-500" />
      case 'missed':
        return <X className="h-5 w-5 text-red-500" />
      case 'upcoming':
        return <Clock className="h-5 w-5 text-yellow-500" />
    }
  }

  return (
    <div className="flow-root">
      <div className="overflow-hidden">
        {Object.entries(groupedEvents).map(([date, dayEvents]) => (
          <div key={date} className="relative pb-8">
            {/* Date header */}
            <div className="sticky top-0 bg-white z-10 py-2">
              <h3 className="text-lg font-semibold text-gray-900">
                {format(new Date(date), 'EEEE, MMMM d, yyyy')}
              </h3>
            </div>

            <ul role="list" className="-mb-8">
              {dayEvents.map((event, eventIdx) => (
                <li key={event.id}>
                  <div className="relative pb-8">
                    {eventIdx !== dayEvents.length - 1 && (
                      <span
                        className="absolute left-5 top-5 -ml-px h-full w-0.5 bg-gray-200"
                        aria-hidden="true"
                      />
                    )}
                    <div className="relative flex items-start space-x-3">
                      <div className="relative">
                        <div className={`
                          h-10 w-10 rounded-full flex items-center justify-center ring-8 ring-white
                          ${
                            event.status === 'taken'
                              ? 'bg-green-100'
                              : event.status === 'missed'
                              ? 'bg-red-100'
                              : 'bg-yellow-100'
                          }
                        `}>
                          {getStatusIcon(event.status)}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div
                          className="relative text-sm cursor-pointer hover:bg-gray-50 rounded-lg p-3"
                          onClick={() => onEventClick?.(event)}
                        >
                          <div className="font-medium text-gray-900">
                            {event.medicationName}
                          </div>
                          <div className="mt-1 text-gray-500">
                            <span className="font-medium">{event.dosage}</span>
                            <span className="mx-2">•</span>
                            <span>{format(event.scheduledTime, 'h:mm a')}</span>
                          </div>
                          {event.notes && (
                            <div className="mt-2 text-sm text-gray-600">
                              {event.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Timeline