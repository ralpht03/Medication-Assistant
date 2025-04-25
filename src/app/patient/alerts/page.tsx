"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import PageLayout from '@/components/PageLayout'
import AlertsPanel from '@/components/AlertsPanel'
import { AlertCircle } from 'lucide-react'
import { Alerts } from '@/lib/types'

interface Alert extends Alerts {
  id: string;
  time: string;
}

export default function PatientAlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const userStr = localStorage.getItem('user')
        if (!userStr) {
          router.push('/login')
          return
        }

        const user = JSON.parse(userStr)
        const userId = user.id || user.rowKey || user.RowKey

        const response = await fetch(`/api/alerts?userId=${userId}&role=patient&status=all`)
        
        if (!response.ok) {
          throw new Error(`Error fetching alerts: ${response.status}`)
        }
        
        const data = await response.json()
        console.log('Raw alerts data:', data)
        // Transform the data to match our Alert interface
        const transformedAlerts = data.map((alert: Alerts) => {
          let timeString = 'Unknown time'
          try {
            // Try both timestamp and Timestamp properties
            const timestamp = alert.timestamp || alert.Timestamp
            if (timestamp) {
              console.log('Raw timestamp:', timestamp)
              // Azure Table Storage timestamps are in ISO format
              const date = new Date(timestamp)
              console.log('Parsed date:', date)
              if (!isNaN(date.getTime())) {
                timeString = date.toLocaleString([], { 
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit', 
                  minute: '2-digit',
                  hour12: true 
                })
                console.log('Formatted time:', timeString)
              } else {
                console.warn('Invalid date:', date)
              }
            } else {
              console.warn('No timestamp found in alert:', alert)
            }
          } catch (e) {
            console.warn('Error parsing timestamp:', e, alert)
          }
          
          return {
            ...alert,
            id: alert.RowKey || `alert-${Date.now()}-${Math.random()}`,
            time: timeString
          }
        })
        setAlerts(transformedAlerts)
      } catch (error) {
        console.error('Error fetching alerts:', error)
        setError('Failed to load alerts. Please try again later.')
      } finally {
        setLoading(false)
      }
    }

    fetchAlerts()
  }, [router])

  const handleAlertAction = async (alertId: string, action: 'acknowledge' | 'dismiss' | 'emergency') => {
    try {
      const userStr = localStorage.getItem('user')
      if (!userStr) return

      const user = JSON.parse(userStr)
      const userId = user.id || user.rowKey || user.RowKey

      if (action === 'acknowledge') {
        // Mark alert as read
        await fetch('/api/alerts', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ userId, alertId })
        })

        // Update local state
        setAlerts(alerts.map(alert => 
          alert.id === alertId ? { ...alert, read: true } : alert
        ))
      } else if (action === 'dismiss') {
        // Delete the alert
        await fetch(`/api/alerts?userId=${userId}&alertId=${alertId}`, {
          method: 'DELETE'
        })

        // Update local state
        setAlerts(alerts.filter(alert => alert.id !== alertId))
      } else if (action === 'emergency') {
        // For emergency contact, we could:
        // 1. Show emergency contact information
        // 2. Initiate a call if on mobile
        // 3. Send an emergency notification
        // For now, we'll just navigate to a help page
        router.push('/patient/emergency-contact')
      }
    } catch (error) {
      console.error('Error handling alert action:', error)
      setError('Failed to process your request. Please try again.')
    }
  }

  return (
    <PageLayout userType="patient" title="Alerts">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Medication Alerts</h1>
        <p className="mt-1 text-gray-600">
          View and manage alerts related to your medications
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <p>{error}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <AlertsPanel 
          alerts={alerts} 
          onAlertAction={handleAlertAction} 
          showPatientInfo={false}
        />
      )}
    </PageLayout>
  )
}