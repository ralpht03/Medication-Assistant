"use client";

import { useState, useEffect } from 'react';

interface Invitation {
  RowKey: string;
  inviteeEmail: string;
  inviteeRole: string;
  inviteeName: string;
  status: string;
  createdAt: string;
  expiresAt: string;
}

interface InvitationListProps {
  invitations: Invitation[];
  onInvitationClick: (invitation: Invitation) => void;
  onRefresh: () => void;
}

export default function InvitationList({ invitations, onInvitationClick, onRefresh }: InvitationListProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const handleRemove = async (invitationId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/admin/sent-invitations', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ invitationId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to remove invitation');
      }

      // Refresh the list after successful removal
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove invitation');
    } finally {
      setIsLoading(false);
    }
  };

  // Safely filter invitations - avoid using properties that might be undefined
  const filteredInvitations = searchTerm 
    ? invitations.filter(invitation => {
        // Safely check if email-related properties exist before using toLowerCase()
        const email = invitation?.inviteeEmail || '';
        const inviteeEmail = invitation?.inviteeEmail || '';
        const searchTermLower = searchTerm.toLowerCase();
        
        return email.toLowerCase().includes(searchTermLower) || 
               inviteeEmail.toLowerCase().includes(searchTermLower);
      })
    : invitations;

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold mb-4">Sent Invitations</h2>
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-2 text-gray-500">Loading invitations...</p>
        </div>
      </div>
    );
  }

  // Add search input
  const searchInput = (
    <div className="mb-4">
      <input
        type="text"
        placeholder="Search by email..."
        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
    </div>
  );

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold mb-4">Sent Invitations</h2>
        {searchInput}
        <div className="bg-red-100 text-red-700 p-4 rounded">
          {error}
        </div>
      </div>
    );
  }

  if (invitations.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold mb-4">Sent Invitations</h2>
        {searchInput}
        <p className="text-gray-500 py-4">No invitations sent yet</p>
      </div>
    );
  }

  const getStatusColor = (status: string = '') => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'expired':
        return 'bg-gray-100 text-gray-800';
      case 'declined':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Helper function to safely get email
  const getEmail = (invitation: any) => invitation?.email || invitation?.inviteeEmail || 'N/A';
  
  // Helper function to safely get role
  const getRole = (invitation: any) => {
    if (invitation?.inviteeRole) {
      return invitation.inviteeRole === 'patient' ? 'Patient' : 'Helper';
    }
    return 'N/A';
  };
  
  // Helper function to safely format date
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (e) {
      return 'Invalid date';
    }
  };

  // Generate a unique key for each invitation
  const getUniqueKey = (invitation: any, index: number) => {
    return invitation?.id || `invitation-${index}`;
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 text-red-500 p-3 rounded-md">
          {error}
        </div>
      )}
      {invitations.map((invitation) => (
        <div
          key={invitation.RowKey}
          className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:border-blue-500 transition-colors"
        >
          <div className="flex justify-between items-start">
            <div 
              className="flex-1 cursor-pointer"
              onClick={() => onInvitationClick(invitation)}
            >
              <h3 className="font-medium text-gray-900">
                {invitation.inviteeName || 'Unnamed Patient'}
              </h3>
              <p className="text-sm text-gray-500">
                {invitation.inviteeEmail}
              </p>
              <p className="text-sm text-gray-500">
                Status: {invitation.status}
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRemove(invitation.RowKey);
              }}
              disabled={isLoading}
              className="text-red-500 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}