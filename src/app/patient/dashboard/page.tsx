"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import MedicationCard from '@/components/shared/MedicationCard'
import ProgressChart from '@/components/shared/ProgressChart'
import { Medications, Adherence, DashboardMedication } from '@/lib/types'
import { Camera, Check } from 'lucide-react'
import PageLayout from '@/components/PageLayout'

interface AdherenceData {
  percentage: number;
  streak: number;
  history: Array<{
    date: string;
    taken: number;
    total: number;
  }>;
}

interface AdherenceRecord {
  Timestamp: string
  status: 'taken' | 'missed' | 'skipped'
  medicationId: string
  patientId: string
}

// Default empty states
const emptyAdherenceData = {
  percentage: 0,
  streak: 0,
  history: [
    { date: "Mon", taken: 0, total: 0 },
    { date: "Tue", taken: 0, total: 0 },
    { date: "Wed", taken: 0, total: 0 },
    { date: "Thu", taken: 0, total: 0 },
    { date: "Fri", taken: 0, total: 0 },
    { date: "Sat", taken: 0, total: 0 },
    { date: "Sun", taken: 0, total: 0 }
  ]
}

export default function DashboardPage() {
  const [medications, setMedications] = useState<DashboardMedication[]>([])
  const [adherenceData, setAdherenceData] = useState<Adherence | typeof emptyAdherenceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const [isNavigating, setIsNavigating] = useState(false)

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        router.push('/login');
        return;
      }

      const user = JSON.parse(userStr);
      // Check for id in the correct location based on your login response
      const patientId = user.id || user.rowKey || user.RowKey; // Try all possible locations

      if (!patientId) {
        console.error('User data:', user); // Debug log
        // Instead of throwing error, set empty state
        setMedications([]);
        setAdherenceData(emptyAdherenceData);
        return;
      }

      // Fetch medications with patientId
      console.log('Fetching medications for patient ID:', patientId);
      const medResponse = await fetch(`/api/medications?patientId=${patientId}`);
      
      // Log the raw response for debugging
      const medResponseText = await medResponse.text();
      console.log('Raw medications API response:', medResponseText);
      
      // Parse the response text back to JSON
      let responseData;
      try {
        responseData = JSON.parse(medResponseText);
        console.log('Parsed medication data:', responseData);
      } catch (e) {
        console.error('Error parsing medications response JSON:', e);
        setMedications([]);
        return;
      }
      
      if (medResponse.ok) {
        const medicationsData = responseData.medications || [];
        console.log('Medications data from API:', medicationsData);
        
        const now = new Date();
        
        // Process medications to add status and time information
        const processedMedications = medicationsData.map((med: any) => {
          console.log('Processing medication:', med);
          
          // Default time if not provided
          const timeStr = med.time || '08:00';
          
          // Create a date object for the medication time
          const [hours, minutes] = timeStr.split(':').map(Number);
          const medTime = new Date();
          medTime.setHours(hours, minutes, 0, 0);
          
          // Determine status based on current time
          let status = "upcoming";
          if (medTime < now) {
            // If medication time is in the past, mark as taken or missed
            // This is simplified - in a real app, you'd check adherence records
            status = Math.random() > 0.3 ? "taken" : "missed"; // Random for demo
          }
          
          const processed = {
            ...med,
            id: med.rowKey || med.RowKey,
            time: timeStr,
            status,
            isOverdue: medTime < now && status !== "taken",
            isCurrent: Math.abs(medTime.getTime() - now.getTime()) < 1800000 // Within 30 minutes
          };
          
          console.log('Processed medication:', processed);
          return processed;
        }) as DashboardMedication[];
        
        setMedications(processedMedications);
        console.log('Final processed medications:', processedMedications);
      } else {
        console.error('Failed to fetch medications:', responseData);
        setMedications([]);
      }

      // Fetch adherence data with patientId
      console.log('Fetching adherence data for patient ID:', patientId);
      try {
        const adhResponse = await fetch(`/api/adherence?patientId=${patientId}`);
        
        // Log the raw response for debugging
        const adhResponseText = await adhResponse.text();
        console.log('Raw adherence API response:', adhResponseText);
        
        // Parse the response text back to JSON if possible
        let adherenceData;
        try {
          adherenceData = JSON.parse(adhResponseText);
          console.log('Parsed adherence data:', adherenceData);
        } catch (e) {
          console.error('Error parsing adherence response JSON:', e);
          setAdherenceData(emptyAdherenceData);
          return;
        }
        
        if (adhResponse.ok) {
          setAdherenceData(adherenceData);
        } else {
          console.error('Failed to fetch adherence data:', adherenceData);
          setAdherenceData(emptyAdherenceData);
        }
      } catch (adhError) {
        console.error('Error fetching adherence data:', adhError);
        setAdherenceData(emptyAdherenceData);
      }

    } catch (err) {
      console.error('Dashboard error:', err);
      // Set empty states instead of throwing
      setMedications([]);
      setAdherenceData(emptyAdherenceData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      router.push('/login');
      return;
    }
    fetchDashboardData();
  }, [router]);

  const handleMedicationAction = async (medicationId: string, action: 'take' | 'snooze') => {
    try {
      if (action === 'take') {
        await fetch('/api/adherence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            medicationId: String(medicationId),
            status: 'taken',
            notes: 'Taken via dashboard'
          })
        })
      }
      
      await fetchDashboardData()
    } catch (error) {
      console.error('Error handling medication action:', error)
    }
  }

  // Add navigation handler
  const handleCameraClick = () => {
    setIsNavigating(true);
    router.push('/patient/camera');
  };

  return (
    <PageLayout userType="patient" title="Dashboard">
      {/* Progress Chart Section */}
      <div className="mb-6 sm:mb-8">
        <ProgressChart
          data={adherenceData ? {
            percentage: 'adherencePercentage' in adherenceData
              ? Number(adherenceData.adherencePercentage)
              : adherenceData.percentage,
            streak: 'streak' in adherenceData ? adherenceData.streak : 0,
            total: 0,  // Add calculation if needed
            taken: 0,  // Add calculation if needed
            missed: 0  // Add calculation if needed
          } : undefined}
          loading={loading}
        />
      </div>

      {/* Pill Identification Section */}
      <div className="mb-6 sm:mb-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">Pill Identification</h2>
                <p className="text-gray-600 mt-1">Verify your medications using AI-powered recognition</p>
              </div>
              <div className="hidden sm:block">
                <Camera className="w-8 h-8 text-blue-500" />
              </div>
            </div>
          </div>
          
          <div className="p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-white">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex-1 w-full">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <Camera className="w-4 h-4 text-blue-600" />
                    </div>
                    <p className="text-sm text-gray-600">Take a clear photo of your medication</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                      <Check className="w-4 h-4 text-green-600" />
                    </div>
                    <p className="text-sm text-gray-600">Get instant verification results</p>
                  </div>
                </div>
              </div>
              
              <div className="w-full sm:w-auto">
                <button
                  onClick={handleCameraClick}
                  disabled={isNavigating}
                  className={`w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-lg transition-all transform hover:scale-105 ${
                    isNavigating
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl'
                  } text-white font-medium`}
                >
                  {isNavigating ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Opening Camera...</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-5 h-5" />
                      <span>Open Camera</span>
                    </>
                  )}
                </button>
                
                <p className="text-xs text-gray-500 mt-2 text-center sm:text-left">
                  Camera access required for identification
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Medications Section */}
      {medications.length > 0 && (
        <div className="mb-6 sm:mb-8">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-800">Today's Medications</h2>
                  <p className="text-gray-600 mt-1">Your scheduled medications for today</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 sm:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {medications.map((medication) => (
                  <MedicationCard
                    key={medication.id}
                    medication={medication}
                    showActions={true}
                    onTake={() => handleMedicationAction(medication.id, 'take')}
                    onSnooze={() => handleMedicationAction(medication.id, 'snooze')}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Empty Medications State */}
      {!loading && medications.length === 0 && (
        <div className="mb-6 sm:mb-8">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-800">Today's Medications</h2>
                  <p className="text-gray-600 mt-1">Your scheduled medications for today</p>
                </div>
              </div>
            </div>
            
            <div className="p-8 text-center">
              <div className="mx-auto h-12 w-12 text-gray-400 mb-4">💊</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Medications Found</h3>
              <p className="text-gray-600 max-w-md mx-auto">
                You don't have any medications scheduled for today. Check your medications page for a complete list.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => router.push('/patient/medications')}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  View All Medications
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  )
}

// Helper functions for calculating adherence statistics
function calculateAdherencePercentage(records: AdherenceRecord[]): number {
  if (records.length === 0) return 0
  const takenCount = records.filter(r => r.status === 'taken').length
  return (takenCount / records.length) * 100
}

function calculateStreak(records: AdherenceRecord[]): number {
  let streak = 0
  const sortedRecords = records.sort((a, b) =>
    new Date(b.Timestamp).getTime() - new Date(a.Timestamp).getTime()
  )

  for (const record of sortedRecords) {
    if (record.status === 'taken') {
      streak++
    } else {
      break
    }
  }
  return streak
}

function calculateDailyHistory(records: AdherenceRecord[]): Array<{date: string; taken: number; total: number}> {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const history = []

  for (let i = 6; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dayRecords = records.filter(r =>
      new Date(r.Timestamp).toDateString() === date.toDateString()
    )

    history.push({
      date: days[date.getDay()],
      taken: dayRecords.filter(r => r.status === 'taken').length,
      total: dayRecords.length
    })
  }

  return history
}
