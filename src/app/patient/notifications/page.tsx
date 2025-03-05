"use client"

import { useState } from 'react'
import NotificationsPanel from '@/components/NotificationsPanel'
import PageLayout from '@/components/PageLayout'

interface Notification {
  id: string | number
  type: 'info' | 'warning' | 'error'
  message: string
  timestamp: string
  read: boolean
}

const mockNotifications: Notification[] = [
  {
    id: 1,
    type: "info",
    message: "Your medication schedule has been updated",
    timestamp: "10 minutes ago",
    read: false
  },
  {
    id: 2,
    type: "warning",
    message: "Remember to take your evening medication",
    timestamp: "1 hour ago",
    read: false
  },
  {
    id: 3,
    type: "error",
    message: "Missed dose: Lisinopril at 12:00 PM",
    timestamp: "2 hours ago",
    read: true
  }
]

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications)

  const handleNotificationClick = (notificationId: string | number) => {
    setNotifications(notifications =>
      notifications.map(notif =>
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    )
  }

  return (
    <PageLayout userType="patient">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md">
          <NotificationsPanel
            notifications={notifications}
            onNotificationClick={handleNotificationClick}
            onDismiss={(id) =>
              setNotifications(notifications =>
                notifications.filter(n => n.id !== id)
              )
            }
          />
        </div>
      </div>
    </PageLayout>
  )
}