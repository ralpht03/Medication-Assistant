"use client"

import { useEffect, useState } from 'react';
import PageLayout from '@/components/PageLayout';
import { toast } from 'react-hot-toast';
import { Search } from 'lucide-react';

interface Patient {
  id: string;
  name: string;
  email: string;
  lastMedication: {
    time: string;
    medication?: {
      name: string;
      dosage: string;
    };
  };
  nextScheduled: {
    time: string;
    medication?: {
      name: string;
      dosage: string;
    };
  };
  adherenceRate: number;
  status: 'normal' | 'missed' | 'overdose';
  medicationCount: number;
}

export default function AdminPatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      // Get admin ID from localStorage
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        throw new Error('User not found in localStorage');
      }

      const user = JSON.parse(userStr);
      if (!user || typeof user !== 'object') {
        throw new Error('Invalid user data in localStorage');
      }

      // Ensure we have a valid ID
      const adminId = user.rowKey || user.id;
      if (!adminId || typeof adminId !== 'string') {
        throw new Error('Invalid admin ID');
      }

      const response = await fetch(`/api/admin/patients?adminId=${encodeURIComponent(adminId)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch patients');
      }

      console.log('Received patients data:', data.patients);
      setPatients(data.patients || []);
    } catch (error) {
      console.error('Error fetching patients:', error);
      toast.error('Failed to load patients');
    } finally {
      setLoading(false);
    }
  };

  // Filter patients based on search term
  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get status badge styling
  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full";
    switch (status) {
      case 'missed':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'normal':
        return `${baseClasses} bg-green-100 text-green-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  return (
    <PageLayout userType="admin" title="Patient Lookup">
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search patients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-2 text-gray-500">Loading patients...</p>
          </div>
        )}

        {/* No Patients State */}
        {!loading && patients.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No patients found</p>
          </div>
        )}

        {/* Patients Table */}
        {!loading && patients.length > 0 && (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Patient
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Medications
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Taken
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Next Scheduled
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Adherence
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPatients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{patient.name}</div>
                      <div className="text-sm text-gray-500">{patient.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {patient.medicationCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {patient.lastMedication.time}
                      {patient.lastMedication.medication && (
                        <div className="text-xs text-gray-400 mt-1">
                          {patient.lastMedication.medication.name} ({patient.lastMedication.medication.dosage})
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {patient.nextScheduled.time}
                      {patient.nextScheduled.medication && (
                        <div className="text-xs text-gray-400 mt-1">
                          {patient.nextScheduled.medication.name} ({patient.nextScheduled.medication.dosage})
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${patient.adherenceRate}%` }}
                          />
                        </div>
                        <span className="ml-2 text-sm text-gray-500">
                          {patient.adherenceRate}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={getStatusBadge(patient.status)}>
                        {patient.status.charAt(0).toUpperCase() + patient.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
