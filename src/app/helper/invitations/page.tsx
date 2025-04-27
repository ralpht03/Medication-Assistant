"use client"

import { useState, useEffect } from 'react'
import PageLayout from '@/components/PageLayout'
import { Check, X, XCircle } from 'lucide-react'

interface Invitation {
  partitionKey: string
  rowKey: string
  inviterUserId: string
  inviterRole: string
  inviterEmail: string
  inviterName: string
  inviteeEmail: string
  inviteeRole: string
  token: string
  status: string
  message: string
  createdAt: string
  expiresAt: string
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
        const helperEmail = user.email

        const response = await fetch(`/api/helper/invitations`)
        if (!response.ok) {
          throw new Error('Failed to fetch invitations')
        }

        const data = await response.json()
        console.log('Received invitations data:', data);
        // Ensure data is an array
        const invitationsArray = Array.isArray(data) ? data : []
        setInvitations(invitationsArray)
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
      console.log('Accepting invitation with ID:', invitationId);
      const requestBody = { 
        invitationId: invitationId,
        action: 'accept'
      };
      console.log('Request body:', requestBody);
      
      const response = await fetch(`/api/helper/invitations/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        throw new Error(errorData.message || 'Failed to accept invitation');
      }

      // Update local state
      setInvitations(invitations.map(inv => 
        inv.rowKey === invitationId ? { ...inv, status: 'accepted' } : inv
      ));
    } catch (err) {
      console.error('Error in handleAccept:', err);
      setError(err instanceof Error ? err.message : 'Failed to accept invitation');
    }
  }

  const handleReject = async (invitationId: string) => {
    try {
      const response = await fetch(`/api/helper/invitations/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          invitationId: invitationId,
          action: 'decline'
        }),
      })

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to reject invitation');
      }

      // Update local state
      setInvitations(invitations.map(inv => 
        inv.rowKey === invitationId ? { ...inv, status: 'rejected' } : inv
      ));
    } catch (err) {
      console.error('Error rejecting invitation:', err);
      setError(err instanceof Error ? err.message : 'Failed to reject invitation');
    }
  }

  return (
    <PageLayout userType="helper" title="Patient Invitations">
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <XCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
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
              {invitations.map((invitation) => {
                console.log('Invitation data:', invitation);
                return (
                  <tr key={invitation.rowKey}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{invitation.inviterName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{invitation.inviterEmail}</div>
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
                        <>
                          <button
                            onClick={() => handleAccept(invitation.rowKey)}
                            className="inline-flex items-center justify-center p-2 rounded-full text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 mr-2"
                            title="Accept invitation"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleReject(invitation.rowKey)}
                            className="inline-flex items-center justify-center p-2 rounded-full text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            title="Reject invitation"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      {invitation.status !== 'pending' && (
                        <span className="text-gray-500">
                          {invitation.status === 'accepted' ? 'Accepted' : 'Declined'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </PageLayout>
  )
}