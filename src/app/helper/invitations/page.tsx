"use client"

import { useState, useEffect } from 'react'
import PageLayout from '@/components/PageLayout'
import { Check, X } from 'lucide-react'

interface Invitation {
  rowKey: string
  patientName: string
  patientEmail: string
  status: 'pending' | 'accepted' | 'rejected'
  createdAt: string
}

export default function HelperInvitationsPage() {
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchInvitations = async () => {
      try {
        setLoading(true)
        const userStr = localStorage.getItem('user')
        if (!userStr) {
          throw new Error('User not found')
        }

        const user = JSON.parse(userStr)
        const helperId = user.id || user.rowKey

        const response = await fetch(`/api/helper/invitations?helperId=${helperId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch invitations')
        }

        const data = await response.json()
        setInvitations(data.invitations || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch invitations')
        console.error('Error fetching invitations:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchInvitations()
  }, [])

  const handleAccept = async (invitationId: string) => {
    try {
      const response = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ invitationId }),
      })

      if (!response.ok) {
        throw new Error('Failed to accept invitation')
      }

      // Update local state
      setInvitations(invitations.map(inv => 
        inv.rowKey === invitationId ? { ...inv, status: 'accepted' } : inv
      ))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept invitation')
    }
  }

  const handleReject = async (invitationId: string) => {
    try {
      const response = await fetch('/api/invitations/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ invitationId }),
      })

      if (!response.ok) {
        throw new Error('Failed to reject invitation')
      }

      // Update local state
      setInvitations(invitations.map(inv => 
        inv.rowKey === invitationId ? { ...inv, status: 'rejected' } : inv
      ))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject invitation')
    }
  }

  return (
    <PageLayout userType="helper" title="Patient Invitations">
      {error && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
          <div className="flex">
            <p>{error}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : invitations.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No pending invitations</p>
          <p className="text-sm text-gray-400 mt-1">You'll see invitations here when patients request your assistance</p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Patient
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invitations.map((invitation) => (
                <tr key={invitation.rowKey}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{invitation.patientName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{invitation.patientEmail}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      invitation.status === 'accepted' 
                        ? 'bg-green-100 text-green-800'
                        : invitation.status === 'rejected'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {invitation.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {new Date(invitation.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {invitation.status === 'pending' && (
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleAccept(invitation.rowKey)}
                          className="text-green-600 hover:text-green-900"
                          title="Accept"
                        >
                          <Check className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleReject(invitation.rowKey)}
                          className="text-red-600 hover:text-red-900"
                          title="Reject"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageLayout>
  )
} 