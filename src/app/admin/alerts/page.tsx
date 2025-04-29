"use client"

import { useState, useEffect } from 'react'
import { AlertCircle, Filter } from 'lucide-react'
import PageLayout from '@/components/PageLayout'
import AlertsPanel from '@/components/AlertsPanel'
import { Alerts } from '@/lib/types'

interface AlertFilters {
  priority?: 'high' | 'medium' | 'low'
  type?: 'overdose' | 'underdose' | 'verification_bypass'
  read?: boolean
}

interface Alert extends Alerts {
  id: string;
  time: string;
}

export default function AdminAlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<AlertFilters>({})
  const [showFilters, setShowFilters] = useState(false)

  const fetchAlerts = async () => {
    try {
      setLoading(true)
      const user = JSON.parse(localStorage.getItem('user') || 'null')
      
      if (!user?.id) {
        setError('Please log in to view alerts')
        setLoading(false)
        return
      }

      const queryParams = new URLSearchParams()
      queryParams.append('userId', user.id)
      queryParams.append('role', 'admin')
      if (filters.priority) queryParams.append('type', filters.priority)
      if (filters.type) queryParams.append('type', filters.type)
      if (filters.read !== undefined) queryParams.append('status', filters.read ? 'read' : 'unread')

      const response = await fetch(`/api/alerts?${queryParams.toString()}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Unable to load alerts. Please try again later.')
      }
      
      if (!data || data.length === 0) {
        setAlerts([])
        setError(null)
        return
      }
      
      // Transform the data to match our Alert interface
      const transformedAlerts = data.map((alert: Alerts) => {
        let timeString = 'Unknown time'
        try {
          const timestamp = alert.timestamp || alert.Timestamp
          if (timestamp) {
            const date = new Date(timestamp)
            if (!isNaN(date.getTime())) {
              timeString = date.toLocaleString([], { 
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true 
              })
            }
          }
        } catch (e) {
          console.warn('Error parsing timestamp:', e)
        }
        
        return {
          ...alert,
          id: alert.RowKey || `alert-${Date.now()}-${Math.random()}`,
          time: timeString
        }
      })
      
      setAlerts(transformedAlerts)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load alerts. Please try again later.')
      setAlerts([])
    } finally {
      setLoading(false)
    }
  }

  const handleAlertAction = async (alertId: string, action: 'acknowledge') => {
    try {
      const userStr = localStorage.getItem('user')
      if (!userStr) {
        throw new Error('User not found')
      }

      const user = JSON.parse(userStr)
      const response = await fetch('/api/alerts', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id || user.rowKey,
          alertId,
          role: 'admin'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to mark alert as read')
      }

      setAlerts(alerts.map(alert => 
        alert.id === alertId ? { ...alert, read: true } : alert
      ))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark alert as read')
    }
  }

  useEffect(() => {
    fetchAlerts()
  }, [filters])

  return (
    <PageLayout userType="admin" title="Alerts Management">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800">Alerts Dashboard</h2>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center px-4 py-2 bg-white border rounded-md hover:bg-gray-50"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 p-4 bg-white rounded-lg shadow">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Priority</label>
                <select
                  value={filters.priority || ''}
                  onChange={(e) => setFilters({ ...filters, priority: e.target.value as 'high' | 'medium' | 'low' || undefined })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                >
                  <option value="">All</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Type</label>
                <select
                  value={filters.type || ''}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value as 'overdose' | 'underdose' | 'verification_bypass' || undefined })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                >
                  <option value="">All</option>
                  <option value="overdose">Overdose</option>
                  <option value="underdose">Underdose</option>
                  <option value="verification_bypass">Verification Bypass</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  value={filters.read === undefined ? '' : String(filters.read)}
                  onChange={(e) => setFilters({ ...filters, read: e.target.value === '' ? undefined : e.target.value === 'true' })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                >
                  <option value="">All</option>
                  <option value="true">Read</option>
                  <option value="false">Unread</option>
                </select>
              </div>
            </div>
          </div>
        )}
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
          showPatientInfo={true}
        />
      )}
    </PageLayout>
  )
} 
