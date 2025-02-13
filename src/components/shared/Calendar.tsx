"use client"

import { useState } from 'react'
import { Calendar as BigCalendar, dateFnsLocalizer, View } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import 'react-big-calendar/lib/css/react-big-calendar.css'

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

interface CalendarProps {
  events: MedicationEvent[]
  onEventClick?: (event: MedicationEvent) => void
  className?: string
}

const locales = {
  'en-US': require('date-fns/locale/en-US')
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales
})

const eventStyleGetter = (event: MedicationEvent) => {
  let style: React.CSSProperties = {
    borderRadius: '4px',
    opacity: 0.8,
    border: 'none',
    color: 'white',
    display: 'block',
    padding: '4px'
  }

  switch (event.status) {
    case 'taken':
      style.backgroundColor = '#10B981' // green-500
      break
    case 'missed':
      style.backgroundColor = '#EF4444' // red-500
      break
    case 'upcoming':
      style.backgroundColor = '#F59E0B' // amber-500
      break
    default:
      style.backgroundColor = '#6B7280' // gray-500
  }

  return {
    style
  }
}

const Calendar = ({ events, onEventClick, className = '' }: CalendarProps) => {
  const [view, setView] = useState<View>('week')
  const [date, setDate] = useState(new Date())

  const handleNavigate = (newDate: Date) => {
    setDate(newDate)
  }

  const handleViewChange = (newView: View) => {
    setView(newView)
  }

  return (
    <div className={`h-[600px] ${className}`}>
      <BigCalendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: '100%' }}
        eventPropGetter={eventStyleGetter}
        onSelectEvent={onEventClick}
        tooltipAccessor={(event: MedicationEvent) => `
          ${event.medication.name} - ${event.medication.dosage}
          ${event.medication.instructions ? `\n${event.medication.instructions}` : ''}
        `}
        views={['month', 'week', 'day']}
        view={view}
        date={date}
        onView={handleViewChange}
        onNavigate={handleNavigate}
        defaultView="week"
        popup
        selectable={false}
        className="rounded-lg shadow-sm"
      />
    </div>
  )
}

export default Calendar