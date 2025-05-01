"use client";

import { useState, useEffect } from 'react';
import PageLayout from '@/components/PageLayout';
import AvailablePatientsList from '@/components/AvailablePatientsList';
import { Mail, Users } from 'lucide-react';
import { Invitation } from '@/lib/azure/invitation-service';

export default function AdminInvitationsPage() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvitations = async () => {
      try {
        const response = await fetch('/api/admin/sent-invitations');
        if (!response.ok) {
          throw new Error('Failed to fetch invitations');
        }
        const data = await response.json();
        setInvitations(data.invitations || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch invitations');
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvitations();
  }, []);

  const handleRemove = async (invitationId: string) => {
    try {
      const response = await fetch('/api/admin/sent-invitations', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ invitationId }),
      });

      if (!response.ok) {
        throw new Error('Failed to remove invitation');
      }

      setInvitations(invitations.filter(inv => inv.RowKey !== invitationId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove invitation');
    }
  };

  return (
    <PageLayout userType="admin" title="Manage Patient Invitations">
      <p className="text-gray-600 mb-6">
        Invite patients to join your care network. Track and manage your sent invitations.
      </p>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Available Patients Section */}
        <div>
          <div className="flex items-center mb-4">
            <Users className="h-5 w-5 text-gray-500 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Available Patients</h2>
          </div>
          <AvailablePatientsList />
        </div>
        
        {/* Sent Invitations Section */}
        <div>
          <div className="flex items-center mb-4">
            <Mail className="h-5 w-5 text-gray-500 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Sent Invitations</h2>
          </div>
          
          {error && (
            <div className="bg-red-50 text-red-500 p-3 rounded-md mb-4">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              <p className="mt-2 text-gray-500">Loading invitations...</p>
            </div>
          ) : invitations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No invitations found
            </div>
          ) : (
            <div className="space-y-4">
              {invitations.map((invitation) => (
                <div
                  key={invitation.RowKey || invitation.inviteeEmail}
                  className="bg-white p-4 rounded-lg border border-gray-200 hover:border-blue-500 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {invitation.inviteeName}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {invitation.inviteeEmail}
                      </p>
                      <p className="text-sm text-gray-500">
                        Status: {invitation.status}
                      </p>
                      <p className="text-sm text-gray-500">
                        Role: {invitation.inviteeRole}
                      </p>
                      <p className="text-sm text-gray-500">
                        Expires: {new Date(invitation.expiresAt).toLocaleDateString()}

                      </p>
                    </div>
                    <button
                      onClick={() => handleRemove(invitation.RowKey)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}