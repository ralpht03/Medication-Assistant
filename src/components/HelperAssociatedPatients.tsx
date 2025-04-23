"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PatientCard from '@/components/shared/PatientCard';

interface Invitation {
  id: string;
  patientId: string;
  patientName: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

interface Patient {
  id: string;
  name: string;
  profilePictureUrl?: string; // Optional profile picture
  adherencePercentage: number; // Adherence data
}

const HelperAssociatedPatients: React.FC = () => {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchInvitations = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/helper/invitations'); 
        if (!response.ok) {
          throw new Error(`Failed to fetch invitations: ${response.statusText}`);
        }
        const data = await response.json();
        console.log('Fetched Invitations:', data.invitations); // Debugging log
        setInvitations(data.invitations || []);
      } catch (err) {
        console.error(err);
        setError('Failed to load invitations.');
      } finally {
        setLoading(false);
      }
    };

    fetchInvitations();
  }, []);

  const acceptedInvitations = invitations.filter((invitation) => invitation.status === 'accepted');

  if (loading) {
    return <p className="text-gray-600">Loading associated patients...</p>;
  }

  if (error) {
    return <p className="text-red-500">{error}</p>;
  }

  if (acceptedInvitations.length === 0) {
    return <p className="text-gray-600">No associated patients found.</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {acceptedInvitations.map((invitation) => (
        <PatientCard
          key={invitation.patientId}
          patient={{
            id: invitation.patientId,
            name: invitation.patientName,
            adherencePercentage: 0, // Replace with actual adherence data if available
          }}
          onClick={() => router.push(`/helper/dashboard/${invitation.patientId}`)} // Navigate to the helper dashboard
        />
      ))}
    </div>
  );
};

export default HelperAssociatedPatients;    