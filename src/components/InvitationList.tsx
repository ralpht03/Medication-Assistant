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

  useEffect(() => {
    const fetchInvitations = async () => {
      try {
        const response = await fetch('/api/invitations');
        
        if (!response.ok) {
          throw new Error('Failed to fetch invitations');
        }
        
        const data = await response.json();
        setInvitations(data.invitations || []);
      } catch (err: any) {
        setError(err.message || 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchInvitations();
  }, []);

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

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold mb-4">Sent Invitations</h2>
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
        <p className="text-gray-500 py-4">No invitations sent yet</p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
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

  return (
    <div className="bg-white rounded-lg shadow-md">
      <h2 className="text-lg sm:text-xl font-semibold p-4 border-b">Sent Invitations</h2>
      
      {/* Mobile view - cards */}
      <div className="md:hidden">
        {invitations.map((invitation) => (
          <div key={invitation.id} className="p-4 border-b">
            <div className="flex justify-between items-center mb-2">
              <div className="font-medium">{invitation.inviteeEmail}</div>
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invitation.status)}`}>
                {invitation.status.charAt(0).toUpperCase() + invitation.status.slice(1)}
              </span>
            </div>
            <div className="text-sm text-gray-500 mb-1">
              Role: {invitation.inviteeRole === 'patient' ? 'Patient' : 'Helper'}
            </div>
            <div className="text-sm text-gray-500 mb-1">
              Sent: {new Date(invitation.createdAt).toLocaleDateString()}
            </div>
            <div className="text-sm text-gray-500">
              Expires: {new Date(invitation.expiresAt).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>
      
      {/* Desktop view - table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Sent
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Expires
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {invitations.map((invitation) => (
              <tr key={invitation.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {invitation.inviteeEmail}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">
                    {invitation.inviteeRole === 'patient' ? 'Patient' : 'Helper'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(invitation.status)}`}>
                    {invitation.status.charAt(0).toUpperCase() + invitation.status.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">
                    {new Date(invitation.createdAt).toLocaleDateString()}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">
                    {new Date(invitation.expiresAt).toLocaleDateString()}
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