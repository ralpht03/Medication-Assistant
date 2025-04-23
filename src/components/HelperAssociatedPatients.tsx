"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PatientCard from '@/components/shared/PatientCard';

interface Patient {
  id: string;
  name: string;
  email: string;
  profilePictureUrl?: string;
  adherencePercentage: number;
}

const HelperAssociatedPatients: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/helper/invitations');
        if (!response.ok) {
          throw new Error(`Failed to fetch patients: ${response.statusText}`);
        }
        const data = await response.json();
        console.log('Fetched Patients:', data.linkedPatients); // Debugging log
        setPatients(data.linkedPatients || []);
      } catch (err) {
        console.error(err);
        setError('Failed to load patients.');
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, []);

  if (loading) {
    return <p className="text-gray-600">Loading associated patients...</p>;
  }

  if (error) {
    return <p className="text-red-500">{error}</p>;
  }

  if (patients.length === 0) {
    return <p className="text-gray-600">No associated patients found.</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {patients.map((patient) => (
        <PatientCard
          key={patient.id}
          patient={{
            id: patient.id,
            name: patient.name,
            adherencePercentage: 0, // This should be fetched from a separate API
          }}
          onClick={() => router.push(`/helper/dashboard/${patient.id}`)}
        />
      ))}
    </div>
  );
};

export default HelperAssociatedPatients;    