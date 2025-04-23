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
  rowKey: string
  patientName: string
  patientEmail: string
  message: string
  type: string
  priority: string
  read: boolean
  timestamp: string
}

export default function HelperAlertsPage() {
  const [alerts, setAlerts] = useState<AlertWithPatientInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<AlertFilters>({})
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    fetchAlerts()
  }, [filters])

  const fetchAlerts = async () => {
    try {
      setLoading(true)
      const userStr = localStorage.getItem('user')
      if (!userStr) {
        throw new Error('User not found')
      }

      const user = JSON.parse(userStr)
      const helperId = user.id || user.rowKey

      const params = new URLSearchParams({
        helperId: helperId
      })

      if (filters.priority) params.append('priority', filters.priority)
      if (filters.type) params.append('type', filters.type)
      if (filters.read !== undefined) params.append('read', String(filters.read))

      const response = await fetch(`/api/notifications?${params.toString()}`)
      if (!response.ok) {
        throw new Error('Failed to fetch alerts')
      }

      const data = await response.json()
      setAlerts(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch alerts')
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (alertId: string) => {
    try {
      const userStr = localStorage.getItem('user')
      if (!userStr) {
        throw new Error('User not found')
      }

      const user = JSON.parse(userStr)
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          helperId: user.id || user.rowKey,
          alertId
        })
      })

      if (!response.ok) {
        throw new Error('Failed to mark alert as read')
      }

      setAlerts(alerts.map(alert => 
        alert.rowKey === alertId ? { ...alert, read: true } : alert
      ))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark alert as read')
    }
  }

  const deleteAlert = async (alertId: string) => {
    try {
      const userStr = localStorage.getItem('user')
      if (!userStr) {
        throw new Error('User not found')
      }

      const user = JSON.parse(userStr)
      const response = await fetch(`/api/notifications?helperId=${user.id || user.rowKey}&alertId=${alertId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete alert')
      }

      setAlerts(alerts.filter(alert => alert.rowKey !== alertId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete alert')
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600'
      case 'medium':
        return 'text-yellow-600'
      case 'low':
        return 'text-green-600'
      default:
        return 'text-gray-600'
    }
  }

  return (
    <PageLayout userType="helper" title="Alerts">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Patient Alerts</h1>
        <p className="mt-1 text-gray-600">
          View and manage alerts from your assigned patients
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

      <div className="mb-6">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <Filter className="h-4 w-4 mr-2" />
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </button>

        {showFilters && (
          <div className="mt-4 p-4 bg-white rounded-lg shadow">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Priority</label>
                <select
                  value={filters.priority || ''}
                  onChange={(e) => setFilters({ ...filters, priority: e.target.value as 'high' | 'medium' | 'low' || undefined })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
                  value={filters.read === undefined ? '' : filters.read ? 'read' : 'unread'}
                  onChange={(e) => setFilters({ ...filters, read: e.target.value === 'read' ? true : e.target.value === 'unread' ? false : undefined })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">All</option>
                  <option value="read">Read</option>
                  <option value="unread">Unread</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No alerts to display</p>
          <p className="text-sm text-gray-400 mt-1">You'll be notified when new alerts come in</p>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <div
              key={alert.rowKey}
              className={`p-4 bg-white rounded-lg shadow ${
                alert.read ? 'border-l-4 border-gray-300' : 'border-l-4 border-blue-500'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center">
                    <AlertCircle className={`h-5 w-5 ${getPriorityColor(alert.priority || '')} mr-2`} />
                    <h3 className="text-lg font-medium text-gray-900">{alert.message}</h3>
                  </div>
                  <div className="mt-2 text-sm text-gray-500">
                    <p>Patient: {alert.patientName}</p>
                    <p>Type: {alert.type}</p>
                    <p>Priority: {alert.priority}</p>
                    <p>Date: {new Date(alert.timestamp).toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  {!alert.read && (
                    <button
                      onClick={() => markAsRead(alert.rowKey)}
                      className="p-2 text-gray-400 hover:text-green-600"
                      title="Mark as read"
                    >
                      <Check className="h-5 w-5" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteAlert(alert.rowKey)}
                    className="p-2 text-gray-400 hover:text-red-600"
                    title="Delete alert"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageLayout>
  )
} 