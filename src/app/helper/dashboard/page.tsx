"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import PatientCard from '@/components/shared/PatientCard'
import { toast } from 'react-hot-toast'
import { Search, LogOut } from 'lucide-react'

interface Patient {
  id: string;
  name: string;
  email: string;
  profilePictureUrl?: string;
  adherencePercentage: number;
}

const PatientListPage = () => {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/helper/patients');
        if (!response.ok) {
          throw new Error('Failed to fetch patients');
        }
        const data = await response.json();
        setPatients(data.patients || []);
      } catch (error) {
        console.error('Error fetching patients:', error);
        toast.error('Failed to load patients');
      } finally {
        setLoading(false);
      }
    };

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.role !== 'helper') {
      router.push('/login');
    } else {
      fetchPatients();
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/login');
  };

  // Filter patients based on search term
  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-gray-50 min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Your Patients</h1>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
        
        {/* Search Bar */}
        <div className="relative mb-6">
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
            <p className="text-gray-500">No patients found. You can accept patient invitations to get started.</p>
          </div>
        )}

        {/* Patients Grid */}
        {!loading && patients.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPatients.map((patient) => (
              <PatientCard
                key={patient.id}
                patient={patient}
                onClick={() => router.push(`/helper/patient/${patient.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientListPage;