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

// Mock data
const mockMedications = [
  {
    partitionKey: 'medications',
    rowKey: '1',
    name: "Aspirin",
    dosage: "100mg",
    time: "8:00 AM",
    status: "taken",
    instructions: "Take with food",
    timestamp: new Date().toISOString()
  },
  {
    partitionKey: 'medications',
    rowKey: '2',
    name: "Lisinopril",
    dosage: "10mg",
    time: "12:00 PM",
    status: "upcoming",
    instructions: "Take with water",
    timestamp: new Date().toISOString()
  },
  {
    partitionKey: 'medications',
    rowKey: '3',
    name: "Metformin",
    dosage: "500mg",
    time: "6:00 PM",
    status: "upcoming",
    instructions: "Take with evening meal",
    timestamp: new Date().toISOString()
  }
]

const mockAdherenceData = {
  percentage: 85,
  streak: 7,
  history: [
    { date: "Mon", taken: 3, total: 3 },
    { date: "Tue", taken: 3, total: 3 },
    { date: "Wed", taken: 2, total: 3 },
    { date: "Thu", taken: 3, total: 3 },
    { date: "Fri", taken: 3, total: 3 },
    { date: "Sat", taken: 2, total: 3 },
    { date: "Sun", taken: 3, total: 3 }
  ]
}

export default function DashboardPage() {
  const [medications, setMedications] = useState<DashboardMedication[]>([])
  const [adherenceData, setAdherenceData] = useState<Adherence | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const [isNavigating, setIsNavigating] = useState(false)

  const fetchDashboardData = async () => {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        router.push('/login');
        return;
      }

      const user = JSON.parse(userStr);
      // Check for id in the correct location based on your login response
      const patientId = user.id || user.RowKey; // Try both possible locations

      if (!patientId) {
        console.error('User data:', user); // Debug log
        // Instead of throwing error, set empty state
        setMedications([]);
        setAdherenceData(null);
        return;
      }

      // Fetch medications with patientId
      const medResponse = await fetch(`/api/medications?patientId=${patientId}`);
      if (medResponse.ok) {
        const responseData = await medResponse.json();
        const medicationsData = responseData.medications || [];
        const now = new Date();
        const processedMedications = medicationsData.map((med: Medications & { time: string; status: string }) => ({
          ...med,
          id: med.RowKey,
          isOverdue: new Date(med.time) < now,
          isCurrent: Math.abs(new Date(med.time).getTime() - now.getTime()) < 1800000
        })) as DashboardMedication[];
        setMedications(processedMedications);
      }

      // Fetch adherence data with patientId
      const adhResponse = await fetch(`/api/adherence?patientId=${patientId}`);
      if (adhResponse.ok) {
        const adherenceData = await adhResponse.json();
        setAdherenceData(adherenceData);
      }

    } catch (err) {
      console.error('Dashboard error:', err);
      // Set empty states instead of throwing
      setMedications([]);
      setAdherenceData(null);
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
            percentage: Number(adherenceData.adherencePercentage),
            streak: 0, // Add calculation if needed
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

      {/* Removed Today's Medications section as requested */}
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
