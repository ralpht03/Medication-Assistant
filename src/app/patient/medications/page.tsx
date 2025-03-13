"use client";

import { useState, useEffect } from 'react';
import { Pill, Clock, Calendar, AlertCircle, Loader2 } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import { useRouter } from 'next/navigation';

interface Medication {
  rowKey: string;
  name: string;
  dosage: string;
  frequency: string;
  route: string;
  startDate: string;
  endDate: string;
  time?: string;
  instructions?: string;
  prescribingDoctor?: string;
  pharmacy?: string;
  notes?: string;
  refillsRemaining?: number;
  lastFilled?: string;
  verificationMethod?: string;
}

export default function MedicationsPage() {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchMedications = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get the patient ID from localStorage
        const userStr = localStorage.getItem('user');
        if (!userStr) {
          router.push('/login');
          return;
        }
        
        const user = JSON.parse(userStr);
        const patientId = user.id || user.rowKey;
        
        if (!patientId) {
          throw new Error('Patient ID not found');
        }
        
        // Fetch medications
        console.log('Fetching medications for patient ID:', patientId);
        const response = await fetch(`/api/medications?patientId=${patientId}`);
        
        // Log the raw response for debugging
        const responseText = await response.text();
        console.log('Raw API response:', responseText);
        
        // Parse the response text back to JSON
        let data;
        try {
          data = JSON.parse(responseText);
        } catch (e) {
          console.error('Error parsing response JSON:', e);
          throw new Error('Invalid JSON response from API');
        }
        
        if (!response.ok) {
          console.error('API error response:', data);
          throw new Error(data.error || 'Failed to fetch medications');
        }
        
        console.log('Parsed medication data:', data);
        setMedications(data.medications || []);
        
        if (data.medications && data.medications.length > 0) {
          console.log(`Found ${data.medications.length} medications`);
        } else {
          console.log('No medications found');
        }
      } catch (err) {
        console.error('Error fetching medications:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    fetchMedications();
  }, [router]);

  // Format date for display
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Get frequency display text
  const getFrequencyText = (frequency: string) => {
    if (frequency.startsWith('custom:')) {
      return frequency.substring(7); // Remove 'custom:' prefix
    }
    
    const frequencyMap: Record<string, string> = {
      'daily': 'Once daily',
      'twice-daily': 'Twice daily',
      'three-times-daily': 'Three times daily',
      'four-times-daily': 'Four times daily',
      'every-other-day': 'Every other day',
      'weekly': 'Once weekly',
      'biweekly': 'Twice weekly',
      'monthly': 'Once monthly',
      'as-needed': 'As needed'
    };
    
    return frequencyMap[frequency] || frequency;
  };

  return (
    <PageLayout userType="patient" title="My Medications">
      {/* Loading state */}
      {loading && (
        <div className="flex justify-center items-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <span className="ml-2 text-gray-600">Loading medications...</span>
        </div>
      )}
      
      {/* Error state */}
      {error && !loading && (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">Error Loading Medications</h3>
          <p className="mt-2 text-sm text-gray-500">{error}</p>
          <div className="mt-6">
            <button
              type="button"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              onClick={() => window.location.reload()}
            >
              Try Again
            </button>
          </div>
        </div>
      )}
      
      {/* Empty state */}
      {!loading && !error && medications.length === 0 && (
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center py-12">
            <Pill className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No Medications Found</h3>
            <p className="mt-2 text-sm text-gray-500">
              Your prescribed medications will appear here once they are added by your healthcare provider.
            </p>
            <div className="mt-6">
              <button
                type="button"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                onClick={() => alert('This feature will be available soon!')}
              >
                Contact Provider
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Medications list */}
      {!loading && !error && medications.length > 0 && (
        <div className="space-y-4">
          {medications.map((medication) => (
            <div key={medication.rowKey} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-800">{medication.name}</h2>
                    <p className="text-gray-600 mt-1">{medication.dosage} - {getFrequencyText(medication.frequency)}</p>
                  </div>
                  <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                    {medication.route}
                  </div>
                </div>
              </div>
              
              <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start space-x-3">
                  <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Duration</p>
                    <p className="text-sm text-gray-900">
                      {formatDate(medication.startDate)} - {formatDate(medication.endDate)}
                    </p>
                  </div>
                </div>
                
                {medication.time && (
                  <div className="flex items-start space-x-3">
                    <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Time</p>
                      <p className="text-sm text-gray-900">{medication.time}</p>
                    </div>
                  </div>
                )}
                
                {medication.prescribingDoctor && (
                  <div className="flex items-start space-x-3">
                    <div className="h-5 w-5 text-gray-400 mt-0.5">👨‍⚕️</div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Prescribed By</p>
                      <p className="text-sm text-gray-900">{medication.prescribingDoctor}</p>
                    </div>
                  </div>
                )}
                
                {medication.pharmacy && (
                  <div className="flex items-start space-x-3">
                    <div className="h-5 w-5 text-gray-400 mt-0.5">💊</div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Pharmacy</p>
                      <p className="text-sm text-gray-900">{medication.pharmacy}</p>
                    </div>
                  </div>
                )}
                
                {medication.refillsRemaining !== undefined && (
                  <div className="flex items-start space-x-3">
                    <div className="h-5 w-5 text-gray-400 mt-0.5">🔄</div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Refills Remaining</p>
                      <p className="text-sm text-gray-900">{medication.refillsRemaining}</p>
                    </div>
                  </div>
                )}
                
                {medication.lastFilled && (
                  <div className="flex items-start space-x-3">
                    <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Last Filled</p>
                      <p className="text-sm text-gray-900">{formatDate(medication.lastFilled)}</p>
                    </div>
                  </div>
                )}
              </div>
              
              {medication.notes && (
                <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-0">
                  <div className="mt-2 p-3 bg-gray-50 rounded-md">
                    <p className="text-sm font-medium text-gray-500 mb-1">Notes</p>
                    <p className="text-sm text-gray-900">{medication.notes}</p>
                  </div>
                </div>
              )}
              
              <div className="px-4 sm:px-6 py-3 bg-gray-50 border-t border-gray-100 flex justify-between">
                <div className="text-sm text-gray-500">
                  Verification: {medication.verificationMethod?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </div>
                <button
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  onClick={() => alert('Medication details feature coming soon!')}
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageLayout>
  );
}
