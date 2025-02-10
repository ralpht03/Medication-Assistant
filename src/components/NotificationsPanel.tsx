import { useState } from 'react'
import { Bell, X } from 'lucide-react'
import NotificationBadge from './shared/NotificationBadge'

interface Notification {
  id: string | number
  type: 'info' | 'warning' | 'error'
  message: string
  timestamp: string
  read: boolean
}

interface NotificationsPanelProps {
  notifications: Notification[]
  onNotificationClick?: (notificationId: string | number) => void
  onDismiss?: (notificationId: string | number) => void
  className?: string
}

const NotificationsPanel = ({
  notifications,
  onNotificationClick,
  onDismiss,
  className = ''
}: NotificationsPanelProps) => {
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  const filteredNotifications = notifications.filter(
    notification => filter === 'all' || !notification.read
  )

  const unreadCount = notifications.filter(n => !n.read).length

  const groupedNotifications = filteredNotifications.reduce((groups, notification) => {
    const group = groups.find(g => g.type === notification.type)
    if (group) {
      group.notifications.push(notification)
    } else {
      groups.push({
        type: notification.type,
        notifications: [notification]
      })
    }
    return groups
  }, [] as { type: 'info' | 'warning' | 'error'; notifications: Notification[] }[])

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <h2 className="text-2xl font-bold text-gray-900">Notifications</h2>
          {unreadCount > 0 && (
            <span className="ml-2 px-2 py-1 text-sm font-medium bg-red-100 text-red-800 rounded-full">
              {unreadCount} unread
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as 'all' | 'unread')}
            className="bg-white border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All</option>
            <option value="unread">Unread</option>
          </select>
        </div>
      </div>

      {groupedNotifications.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
          No notifications to display.
        </div>
      ) : (
        <div className="space-y-6">
          {groupedNotifications.map(group => (
            <div key={group.type}>
              <h3 className="text-sm font-medium text-gray-500 mb-3 uppercase">
                {group.type.charAt(0).toUpperCase() + group.type.slice(1)}
              </h3>
              <div className="space-y-3">
                {group.notifications.map(notification => (
                  <div key={notification.id} className="relative">
                    <NotificationBadge
                      type={notification.type}
                      message={notification.message}
                      timestamp={notification.timestamp}
                      onClick={() => onNotificationClick?.(notification.id)}
                    />
                    {onDismiss && (
                      <button
                        onClick={() => onDismiss(notification.id)}
                        className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                      >
                        <X className="h-4 w-4 text-gray-500" />
                        <span className="sr-only">Dismiss</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default NotificationsPanel