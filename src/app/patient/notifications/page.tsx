"use client"

import { useState } from 'react'
import Header from '@/components/Header'
import Sidebar from '@/components/Sidebar'
import NotificationsPanel from '@/components/NotificationsPanel'

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
    <div className="min-h-screen bg-gray-100">
      <Header />
      <div className="flex h-screen pt-16">
        <div className="w-64 flex-shrink-0">
          <Sidebar />
        </div>
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 max-w-4xl mx-auto">
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
        </main>
      </div>
    </div>
  )
}