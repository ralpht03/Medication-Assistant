"use client";

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

interface Invitation {
  id: string;
  adminId: string;
  adminName: string;
  message: string;
  createdAt: string;
  expiresAt: string;
  token: string;
}

export default function PatientInvitationsList() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/patient/invitations');
      const data = await response.json();
      
      if (response.ok) {
        if (data.invitations) {
          // Sort invitations by createdAt and filter to get the latest from each admin
          const latestInvitations = data.invitations
            .sort((a: Invitation, b: Invitation) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .filter((invitation: Invitation, index: number, self: Invitation[]) =>
              index === self.findIndex((i: Invitation) => i.adminId === invitation.adminId)
            );

          setInvitations(latestInvitations);
        } else {
          setError('No invitations found');
        }
      } else {
        toast.error(data.message || 'Failed to load invitations');
      }
    } catch (error) {
      console.error('Error fetching invitations:', error);
      toast.error('Failed to load invitations');
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async (invitationRowKey: string, action: 'accept' | 'decline') => {
    try {
      setResponding(invitationRowKey);
      
      console.log('Sending invitation response:', { invitationId: invitationRowKey, action });
      
      const response = await fetch('/api/patient/invitations/respond', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          invitationId: invitationRowKey,
          action: action
        }),
      });
      
      const data = await response.json();
      console.log('Response received:', { status: response.status, data });
      
      if (response.ok) {
        toast.success(`Invitation ${action === 'accept' ? 'accepted' : 'declined'} successfully`);
        // Remove the invitation from the list
        setInvitations(invitations.filter(inv => inv.id !== invitationRowKey));
      } else {
        toast.error(data.message || `Failed to ${action} invitation`);
      }
    } catch (error) {
      console.error(`Error ${action}ing invitation:`, error);
      toast.error(`Failed to ${action} invitation`);
    } finally {
      setResponding(null);
    }
  };
  if (loading) {
    return <p>Loading...</p>;
  }

  if (invitations.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Admin Invitations</h2>
        <p className="text-gray-500">You don't have any pending invitations.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-semibold p-4 border-b">Admin Invitations</h2>
      
      <div className="divide-y divide-gray-200">
        {invitations.map((invitation) => (
          <div key={`${invitation.id}-${invitation.createdAt}`} className="p-4">
            <div className="mb-3">
              <div className="font-medium">{invitation.adminName}</div>
              <div className="text-sm text-gray-500">
                Sent {new Date(invitation.createdAt).toLocaleDateString()}
              </div>
              {invitation.message && (
                <div className="mt-2 p-3 bg-gray-50 rounded-md text-sm">
                  "{invitation.message}"
                </div>
              )}
            </div>
            
            <div className="flex space-x-3 mt-4">
              <button
                onClick={() => handleResponse(invitation.id, 'accept')}
                disabled={responding === invitation.id}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
              >
                {responding === invitation.id ? 'Processing...' : 'Accept'}
              </button>
              
              <button
                onClick={() => handleResponse(invitation.id, 'decline')}
                disabled={responding === invitation.id}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:opacity-50"
              >
                {responding === invitation.id ? 'Processing...' : 'Decline'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}