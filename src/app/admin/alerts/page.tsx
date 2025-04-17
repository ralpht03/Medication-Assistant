"use client"

import { useState, useEffect } from 'react'
import { AlertCircle, Check, Trash2, Filter, X } from 'lucide-react'
import PageLayout from '@/components/PageLayout'
import { Alerts } from '@/lib/types'

interface AlertFilters {
  priority?: 'high' | 'medium' | 'low'
  type?: 'overdose' | 'underdose' | 'verification_bypass'
  read?: boolean
}

interface AlertWithPatientInfo extends Alerts {
  patientName: string;
  patientEmail: string;
}

export default function AdminAlertsPage() {
  const [alerts, setAlerts] = useState<AlertWithPatientInfo[]>([])
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
      queryParams.append('adminId', user.id)
      if (filters.priority) queryParams.append('priority', filters.priority)
      if (filters.type) queryParams.append('type', filters.type)
      if (filters.read !== undefined) queryParams.append('read', String(filters.read))

      const response = await fetch(`/api/notifications?${queryParams.toString()}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Unable to load alerts. Please try again later.')
      }
      
      if (!data.data || data.data.length === 0) {
        setAlerts([])
        setError(null)
        return
      }
      
      setAlerts(data.data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load alerts. Please try again later.')
      setAlerts([])
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (alertId: string, userId: string) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, alertId })
      })
      
      if (!response.ok) throw new Error('Failed to mark alert as read')
      fetchAlerts()
    } catch (err) {
      console.error('Error marking alert as read:', err)
    }
  }

  const deleteAlert = async (alertId: string, partitionKey: string) => {
    try {
      const response = await fetch(`/api/notifications?partitionKey=${encodeURIComponent(partitionKey)}&rowKey=${encodeURIComponent(alertId)}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete alert');
      }

      // Update local state by filtering out the deleted alert
      setAlerts(prevAlerts => prevAlerts.filter(alert => alert.RowKey !== alertId));
      setError(null); // Clear any previous errors
    } catch (err) {
      console.error('Error deleting alert:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete alert');
    }
  };

  useEffect(() => {
    fetchAlerts()
  }, [filters])

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-orange-100 text-orange-800'
      case 'low': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

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
                  onChange={(e) => setFilters({ ...filters, priority: e.target.value as any })}
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
                  onChange={(e) => setFilters({ ...filters, type: e.target.value as any })}
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

      {loading ? (
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : error ? (
        <div className="text-red-500 p-4">{error}</div>
      ) : alerts.length === 0 ? (
        <div className="text-center p-8">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No alerts found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {Object.keys(filters).length > 0 
              ? "Try adjusting your filters or check back later for new alerts."
              : "There are currently no alerts to display. Check back later for updates."}
          </p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <ul className="divide-y divide-gray-200">
            {alerts.map((alert) => (
              <li 
                key={`${alert.PartitionKey}-${alert.RowKey}-${alert.Timestamp}`} 
                className="p-4 hover:bg-gray-50"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <AlertCircle className={`h-5 w-5 ${getPriorityColor(alert.priority || 'low')}`} />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-900">{alert.message}</p>
                      <p className="text-sm text-gray-500">
                        {alert.patientName} • {alert.patientEmail}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(alert.Timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {!alert.read && (
                      <button
                        onClick={() => markAsRead(alert.RowKey, alert.PartitionKey)}
                        className="p-2 text-green-600 hover:text-green-800"
                        title="Mark as read"
                      >
                        <Check className="h-5 w-5" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteAlert(alert.RowKey, alert.PartitionKey)}
                      className="p-2 text-red-600 hover:text-red-800"
                      title="Delete alert"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </PageLayout>
  )
} 