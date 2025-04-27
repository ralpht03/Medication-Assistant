"use client"

import { useState, useEffect } from 'react'
import PageLayout from '@/components/PageLayout'
import { Bell, Users, AlertTriangle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { TableClient } from '@azure/data-tables'

export default function HelperDashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState({
    totalPatients: 0,
    unreadAlerts: 0,
    pendingInvitations: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)
        const userStr = localStorage.getItem('user')
        if (!userStr) {
          throw new Error('User not found')
        }

        const user = JSON.parse(userStr)
        const helperId = user.id || user.rowKey

        // Fetch data from existing APIs
        const [patientsResponse, alertsResponse, invitationsResponse] = await Promise.all([
          fetch(`/api/helper/patients`),
          fetch(`/api/alerts?userId=${helperId}&role=helper&status=unread`),
          fetch(`/api/helper/invitations`)
        ])

        if (!patientsResponse.ok) {
          throw new Error(`Failed to fetch patients: ${patientsResponse.status} ${patientsResponse.statusText}`)
        }
        if (!alertsResponse.ok) {
          throw new Error(`Failed to fetch alerts: ${alertsResponse.status} ${alertsResponse.statusText}`)
        }
        if (!invitationsResponse.ok) {
          throw new Error(`Failed to fetch invitations: ${invitationsResponse.status} ${invitationsResponse.statusText}`)
        }

        const [patients, alerts, invitations] = await Promise.all([
          patientsResponse.json(),
          alertsResponse.json(),
          invitationsResponse.json()
        ])

        setStats({
          totalPatients: patients.patients?.length || 0,
          unreadAlerts: alerts.length,
          pendingInvitations: invitations.length
        })
      } catch (err) {
        console.error('Error fetching stats:', err)
        // Don't show error message, just keep the counts at 0
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  return (
    <PageLayout userType="helper" title="Helper Dashboard">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div 
          className="p-6 bg-white rounded-lg shadow hover:bg-gray-50 cursor-pointer" 
          onClick={() => router.push('/helper/patients')}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-500">Total Patients</h3>
            <Users className="h-4 w-4 text-gray-500" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold">{loading ? '...' : stats.totalPatients}</div>
            <p className="text-xs text-gray-500">Patients you are assisting</p>
          </div>
        </div>

        <div 
          className="p-6 bg-white rounded-lg shadow hover:bg-gray-50 cursor-pointer" 
          onClick={() => router.push('/helper/alerts')}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-500">Unread Alerts</h3>
            <AlertTriangle className="h-4 w-4 text-gray-500" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold">{loading ? '...' : stats.unreadAlerts}</div>
            <p className="text-xs text-gray-500">Alerts requiring attention</p>
          </div>
        </div>

        <div 
          className="p-6 bg-white rounded-lg shadow hover:bg-gray-50 cursor-pointer" 
          onClick={() => router.push('/helper/invitations')}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-500">Pending Invitations</h3>
            <Bell className="h-4 w-4 text-gray-500" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold">{loading ? '...' : stats.pendingInvitations}</div>
            <p className="text-xs text-gray-500">Invitations to review</p>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <button
            onClick={() => router.push('/helper/patients')}
            className="p-4 bg-white border rounded-lg hover:bg-gray-50 text-left"
          >
            <h3 className="font-medium">View All Patients</h3>
            <p className="text-sm text-gray-500">Manage your patient list and view their details</p>
          </button>
          <button
            onClick={() => router.push('/helper/alerts')}
            className="p-4 bg-white border rounded-lg hover:bg-gray-50 text-left"
          >
            <h3 className="font-medium">Check Alerts</h3>
            <p className="text-sm text-gray-500">Review and respond to patient alerts</p>
          </button>
        </div>
      </div>
    </PageLayout>
  )
}