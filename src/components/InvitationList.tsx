"use client";

import { useState, useEffect } from 'react';

interface Invitation {
  id: string;
  inviteeEmail: string;
  inviteeRole: string;
  status: string;
  createdAt: string;
  expiresAt: string;
}

export default function InvitationList() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchInvitations = async () => {
      try {
        const response = await fetch('/api/admin/sent-invitations');
        
        if (!response.ok) {
          throw new Error('Failed to fetch invitations');
        }
        
        const data = await response.json();
        console.log("Received invitations data:", data); // Debug log
        
        if (data.invitations) {
          setInvitations(data.invitations);
        } else {
          setInvitations([]);
        }
      } catch (err: any) {
        console.error("Error fetching invitations:", err); // Debug log
        setError(err.message || 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchInvitations();
  }, []);

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
    <div className="bg-white rounded-lg shadow-md">
      <h2 className="text-lg sm:text-xl font-semibold p-4 border-b">Sent Invitations</h2>
      
      {/* Search bar */}
      <div className="p-4 border-b">
        {searchInput}
      </div>
      
      {/* No results message */}
      {filteredInvitations.length === 0 && searchTerm && (
        <div className="p-4 text-center text-gray-500">
          No invitations match your search
        </div>
      )}
      
      {/* Mobile view - cards */}
      <div className="md:hidden">
        {filteredInvitations.map((invitation, index) => (
          <div key={getUniqueKey(invitation, index)} className="p-4 border-b">
            <div className="flex justify-between items-center mb-2">
              <div className="font-medium">{getEmail(invitation)}</div>
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invitation.status)}`}>
                {(invitation.status || 'Unknown').charAt(0).toUpperCase() + (invitation.status || 'Unknown').slice(1)}
              </span>
            </div>
            <div className="text-sm text-gray-500 mb-1">
              Role: {getRole(invitation)}
            </div>
            <div className="text-sm text-gray-500 mb-1">
              Sent: {formatDate(invitation.createdAt)}
            </div>
            <div className="text-sm text-gray-500">
              Expires: {formatDate(invitation.expiresAt)}
            </div>
          </div>
        ))}
      </div>
      
      {/* Desktop view - table */}
      <div className="hidden md:block">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Sent Date
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Expires
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredInvitations.map((invitation, index) => (
              <tr key={getUniqueKey(invitation, index)}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {getEmail(invitation)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">
                    {getRole(invitation)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(invitation.status)}`}>
                    {(invitation.status || 'Unknown').charAt(0).toUpperCase() + (invitation.status || 'Unknown').slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">
                    {formatDate(invitation.createdAt)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">
                    {formatDate(invitation.expiresAt)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}