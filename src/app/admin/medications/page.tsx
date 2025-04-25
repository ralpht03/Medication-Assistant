"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Pill, Clock, Calendar, AlertCircle, Loader2, Search } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import { Medication } from '@/lib/azure-tables-types';
import { format } from 'date-fns';

interface PatientMedications {
  patientId: string;
  patientName: string;
  medications: Medication[];
}

export default function AdminMedicationsPage() {
  const [patientMedications, setPatientMedications] = useState<PatientMedications[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedPatients, setExpandedPatients] = useState<Set<string>>(new Set());
  const router = useRouter();

  useEffect(() => {
    const fetchAllMedications = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get the admin ID from localStorage
        const userStr = localStorage.getItem('user');
        if (!userStr) {
          router.push('/login');
          return;
        }
        
        let user;
        try {
          user = JSON.parse(userStr);
        } catch (e) {
          console.error('Error parsing user from localStorage:', e);
          router.push('/login');
          return;
        }
        
        if (user.role !== 'admin') {
          router.push('/login');
          return;
        }

        // Fetch all medications for all patients
        const response = await fetch('/api/admin/medications', {
          headers: {
            'user': userStr
          }
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.details || errorData.error || 'Failed to fetch medications');
        }
        
        const data = await response.json();
        setPatientMedications(data || []);
      } catch (err) {
        console.error('Error in fetchAllMedications:', err);
        setError(err instanceof Error ? err.message : 'An error occurred while fetching medications');
      } finally {
        setLoading(false);
      }
    };

    fetchAllMedications();
  }, [router]);

  const filteredMedications = patientMedications.map(patient => ({
    ...patient,
    medications: patient.medications.filter(med => 
      med.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      med.dosage.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.patientName.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(patient => patient.medications.length > 0);

  const togglePatient = (patientId: string) => {
    setExpandedPatients(prev => {
      const newSet = new Set(prev);
      if (newSet.has(patientId)) {
        newSet.delete(patientId);
      } else {
        newSet.add(patientId);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <PageLayout title="Medications" userType="admin">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout title="Medications" userType="admin">
        <div className="flex items-center justify-center h-64">
          <div className="text-red-500">{error}</div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Patient Medications" userType="admin">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Patient Medications</h1>
        
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search medications or patients..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {filteredMedications.length === 0 ? (
          <div className="text-center text-gray-500">No medications found</div>
        ) : (
          <div className="space-y-4">
            {filteredMedications.map((patientMed) => (
              <div key={patientMed.patientId} className="border rounded-lg overflow-hidden">
                <button
                  onClick={() => togglePatient(patientMed.patientId)}
                  className="w-full p-4 bg-gray-50 hover:bg-gray-100 flex justify-between items-center"
                >
                  <span className="font-semibold">{patientMed.patientName}</span>
                  <span className="text-sm text-gray-500">
                    {expandedPatients.has(patientMed.patientId) ? '▼' : '▶'}
                  </span>
                </button>
                
                {expandedPatients.has(patientMed.patientId) && (
                  <div className="p-4 bg-white">
                    {patientMed.medications.length === 0 ? (
                      <div className="text-gray-500">No medications assigned</div>
                    ) : (
                      <div className="space-y-4">
                        {patientMed.medications.map((medication) => (
                          <div key={medication.rowKey} className="border rounded p-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="font-semibold">Medication Name:</p>
                                <p>{medication.name}</p>
                              </div>
                              <div>
                                <p className="font-semibold">Dosage:</p>
                                <p>{medication.dosage}</p>
                              </div>
                              <div>
                                <p className="font-semibold">Frequency:</p>
                                <p>{medication.frequency}</p>
                              </div>
                              <div>
                                <p className="font-semibold">Start Date:</p>
                                <p>{medication.startDate ? format(new Date(medication.startDate), 'MM/dd/yyyy') : 'Not specified'}</p>
                              </div>
                              {medication.endDate && (
                                <div>
                                  <p className="font-semibold">End Date:</p>
                                  <p>{format(new Date(medication.endDate), 'MM/dd/yyyy')}</p>
                                </div>
                              )}
                              <div>
                                <p className="font-semibold">Instructions:</p>
                                <p>{medication.instructions || 'No instructions provided'}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
} 