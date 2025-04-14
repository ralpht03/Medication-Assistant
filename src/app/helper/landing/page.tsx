"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PatientCard from '@/components/shared/PatientCard';

export default function PatientListPage() {
  interface Patient {
    id: string;
    name: string;
    profilePictureUrl?: string; // Optional profile picture
    adherencePercentage: number; // Adherence tracking
  }

  const fetchPatients = async (helperId: string): Promise<Patient[]> => {
    const response = await fetch(`/api/patients?helperId=${helperId}`);
    const patients = await response.json();
    return patients;
  };

  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const validateUser = async () => {
      try {
        const userStr = localStorage.getItem('user');
        if (!userStr) {
          console.error('No user found in localStorage');
          router.push('/login');
          return;
        }

        const user = JSON.parse(userStr);
        console.log('User object from localStorage:', user);
        console.log('Account Type:', user.accountType);
        console.log('Helper ID:', user.id || user.rowKey || user.RowKey);

        // Extract the user ID from multiple possible keys
        const helperId = user.id || user.rowKey || user.RowKey;
        if (!helperId) {
          console.error('Helper ID is missing in user object:', user);
          router.push('/login');
          return;
        }

        // Normalize accountType comparison
        if (user.role.toLowerCase() !== 'helper') {
          console.error('Invalid account type:', user.accountType);
          router.push('/login');
          return;
        }

        //console.log('Fetching patients for helper ID:', helperId);
        //const patientsData = await fetchPatients(helperId);
        //setPatients(patientsData);
      } catch (error) {
        console.error('Error validating user or fetching patients:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    validateUser();
  }, [router]);

  if (loading) {
    return (
      <div className="bg-gray-50 min-h-screen flex items-center justify-center">
        <p className="text-lg text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen p-6">
      <h1 className="text-2xl font-bold mb-6">Patient List</h1>
      {patients.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
         
        </div>
      ) : (
        <div className="flex flex-col items-center mt-10">
          <img
            src="/no-patients-placeholder.png" // Placeholder image for empty state
            alt="No patients linked"
            className="w-40 h-40 mb-4"
          />
          <p className="text-lg text-gray-600">No patients linked to this account yet.</p>
          <p className="text-sm text-gray-500 mt-2">
            Once patients are linked, they will appear here.
          </p>
        </div>
      )}
    </div>
  );
}
//Fetch patients using one of the components that should catch if there are no patients linked to the helper
// and then add the patient card back in where it used to be