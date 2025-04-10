"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import PageLayout from '@/components/PageLayout'
import AlertsPanel from '@/components/AlertsPanel'
import { AlertCircle } from 'lucide-react'

interface Alert {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  read: boolean;
  priority: 'critical' | 'high' | 'medium' | 'low';
  medicationId?: string;
  medicationName?: string;
}
// Sample mock alerts for demonstration
const mockAlerts: Alert[] = [
  {
    id: "overdose-123456",
    type: "overdose",
    message: "You took 2 pills instead of the recommended 1 for One_A_Day_Women. This is an overdose. Please contact your healthcare provider immediately.",
    timestamp: new Date(Date.now() - 30 * 60000).toISOString(), // 30 minutes ago
    read: false,
    priority: "critical",
    medicationId: "med-one-a-day-women",
    medicationName: "One_A_Day_Women"
  },
  {
    id: "underdose-234567",
    type: "underdose",
    message: "You took 0 pills instead of the recommended 1 for One_A_Day_Women. This is less than prescribed.",
    timestamp: new Date(Date.now() - 3 * 3600000).toISOString(), // 3 hours ago
    read: false,
    priority: "high",
    medicationId: "med-one-a-day-women",
    medicationName: "One_A_Day_Women"
  },
  {
    id: "missed-dose-345678",
    type: "missed_dose",
    message: "You missed your scheduled dose of One_A_Day_Women at 08:00. Please take it as soon as possible.",
    timestamp: new Date(Date.now() - 8 * 3600000).toISOString(), // 8 hours ago
    read: true,
    priority: "high",
    medicationId: "med-one-a-day-women",
    medicationName: "One_A_Day_Women"
  },
  {
    id: "verification-456789",
    type: "verification_bypassed",
    message: "You bypassed verification for One_A_Day_Women. Please ensure you're taking the correct medication.",
    timestamp: new Date(Date.now() - 24 * 3600000).toISOString(), // 1 day ago
    read: false,
    priority: "medium",
    medicationId: "med-one-a-day-women",
    medicationName: "One_A_Day_Women"
  },
  {
    id: "pill-id-567890",
    type: "pill_identification_failed",
    message: "Pill identification failed for One_A_Day_Women. The pill you scanned doesn't match your prescribed medication.",
    timestamp: new Date(Date.now() - 2 * 24 * 3600000).toISOString(), // 2 days ago
    read: true,
    priority: "high",
    medicationId: "med-one-a-day-women",
    medicationName: "One_A_Day_Women"
  }
];

export default function PatientAlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>(mockAlerts)
  const [loading, setLoading] = useState(false) // Set to false to show mock data immediately
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    // In a real implementation, this would fetch actual alerts from the API
    const fetchAlerts = async () => {
      try {
        // Comment out the API call for now to use mock data
        /*
        setLoading(true)
        setError(null)
        */
        
        // This code is commented out to use mock data instead
        /*
        const userStr = localStorage.getItem('user')
        if (!userStr) {
          router.push('/login')
          return
        }

        const user = JSON.parse(userStr)
        const userId = user.id || user.rowKey || user.RowKey

        const response = await fetch(`/api/alerts?userId=${userId}&status=all`)
        
        if (!response.ok) {
          throw new Error(`Error fetching alerts: ${response.status}`)
        }
        
        const data = await response.json()
        setAlerts(data)
        */
      } catch (error) {
        console.error('Error fetching alerts:', error)
        setError('Failed to load alerts. Please try again later.')
      } finally {
        // setLoading(false) // Commented out since we're using mock data
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