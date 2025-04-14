"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import PatientCard from '@/components/shared/PatientCard'




interface Patient {
  id: string;
  name: string;
  profilePictureUrl?: string;
  adherencePercentage: number;
}

const fetchPatients = async (helperId: string): Promise<Patient[]> => {
  const response = await fetch(`/api/patients?helperId=${helperId}`);
  const patients = await response.json();
  return patients;
};

const PatientListPage = () => {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);

  useEffect(() => {
    const helper = JSON.parse(localStorage.getItem('user') || '{}');
    if (helper.accountType !== 'helper') {
      router.push('/login');
    } else {
      fetchPatients(helper.id).then(setPatients);
    }
  }, [router]);

  return (
    <div className="bg-gray-50 min-h-screen p-6">
      <h1 className="text-2xl font-bold mb-6">Patient List</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {patients.map((patient) => (
          <PatientCard
            key={patient.id}
            patient={patient}
            onClick={() => router.push(`/helper/${patient.id}`)} // Navigate to patient's dashboard
          />
        ))}
      </div>
    </div>
  );
};

export default PatientListPage;