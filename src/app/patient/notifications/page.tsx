"use client"

import { useState, useEffect } from 'react'
import NotificationsPanel from '@/components/NotificationsPanel'
import PageLayout from '@/components/PageLayout'
import { getSession } from '@/lib/auth'

interface AzureNotification {
  PartitionKey: string
  rowKey: string
  type: 'info' | 'warning' | 'error'
  message: string
  createdAt: string
  read: boolean
  isAdminInvite: boolean
  helperName: string
  status: string
}

interface DisplayNotification {
  id: string
  type: 'info' | 'warning' | 'error'
  message: string
  timestamp: string
  read: boolean
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<DisplayNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchNotifications = async () => {
    try {
      // Check if user is logged in
      const userStr = localStorage.getItem('user');
      console.log('User from localStorage:', userStr);
      
      if (!userStr) {
        throw new Error('User not logged in');
      }

      const user = JSON.parse(userStr);
      console.log('Parsed user:', user);
      
      if (!user.id) {
        throw new Error('User ID not found');
      }

      console.log('Fetching notifications...');
      const response = await fetch('/api/patient/notifications', {
        credentials: 'include' // Ensure cookies are sent with the request
      });
      console.log('API Response status:', response.status);
      
      const data = await response.json();
      console.log('API Response data:', data);
      
      if (!response.ok) {
        console.error('API Error Response:', data);
        throw new Error(data.error || 'Failed to fetch notifications');
      }
      
      // Handle the case where data might be an array directly
      const notificationsData = Array.isArray(data) ? data : data.value || []
      console.log('Processed notifications data:', notificationsData) // Debug log
      
      // Filter out any invalid notifications and convert Azure Table entities to our notification format
      const formattedNotifications = notificationsData
        .filter((notif: unknown) => {
          if (!notif || typeof notif !== 'object') {
            console.warn('Invalid notification object:', notif)
            return false
          }
          return true
        })
        .map((notif: AzureNotification) => {
          console.log('Processing raw notification:', notif); // Debug log
          
          if (!notif.rowKey) {
            console.warn('Notification missing rowKey:', notif)
            return null
          }
          
          const formatted = {
            id: notif.rowKey,
            type: notif.type,
            message: notif.message,
            timestamp: new Date(notif.createdAt).toLocaleString(),
            read: notif.read,
            isAdminInvite: notif.isAdminInvite,
            helperName: notif.helperName,
            status: notif.status
          }
          
          console.log('Formatted notification:', formatted)
          return formatted
        })
        .filter((notif: DisplayNotification | null): notif is DisplayNotification => notif !== null)
      
      console.log('All formatted notifications:', formattedNotifications); // Debug log
      setNotifications(formattedNotifications)
      setError(null)
    } catch (err) {
      console.error('Error fetching notifications:', err)
      setError(err instanceof Error ? err.message : 'Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
  }, [])

  const handleNotificationClick = async (notificationId: string) => {
    try {
      const response = await fetch('/api/patient/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notificationId,
          read: true,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update notification')
      }

      setNotifications(notifications =>
        notifications.map(notif =>
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      )
    } catch (err) {
      console.error('Error updating notification:', err)
    }
  }

  const handleDismiss = async (notificationId: string) => {
    try {
      console.log('Dismissing notification with ID:', notificationId)
      
      if (!notificationId || typeof notificationId !== 'string') {
        console.error('Invalid notification ID:', notificationId)
        throw new Error('Invalid notification ID')
      }
      
      const response = await fetch('/api/patient/notifications', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notificationId: notificationId
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Delete notification error:', errorData)
        throw new Error(errorData.error || 'Failed to delete notification')
      }

      setNotifications(notifications =>
        notifications.filter(n => n.id !== notificationId)
      )
    } catch (err) {
      console.error('Error deleting notification:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete notification')
    }
  }

  return (
    <PageLayout userType="patient">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md">
          {loading ? (
            <div className="p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading notifications...</p>
            </div>
          ) : error ? (
            <div className="p-6 text-center text-red-500">
              {error}
            </div>
          ) : (
            <NotificationsPanel
              notifications={notifications}
              onNotificationClick={handleNotificationClick}
              onDismiss={handleDismiss}
            />
          )}
        </div>
      </div>
    </PageLayout>
  )
}