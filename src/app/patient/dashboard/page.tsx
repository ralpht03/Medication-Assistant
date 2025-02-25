"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import Sidebar from '@/components/Sidebar'
import MedicationOverview from '@/components/MedicationOverview'
import ProgressChart from '@/components/shared/ProgressChart'
import { AzureTableService } from '@/lib/azure/table-service'
import UpcomingDoses from '@/components/UpcomingDoses'
import PillIdentification from '@/components/PillIdentification'
import { Medications, Adherence } from '@/lib/types'

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

interface DashboardMedication extends Medications {
  id: string;
  time: string;
  status: 'taken' | 'missed' | 'upcoming';
  isOverdue: boolean;
  isCurrent: boolean;
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
        const medicationsData = await medResponse.json();
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

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8 ml-64">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold mb-8">Patient Dashboard</h1>
            
            {/* Pill Identification Section */}
            <div className="mb-8">
              <PillIdentification />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              {/* Medication Overview with Empty State */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Medication Overview</h2>
                {medications.length > 0 ? (
                  <MedicationOverview medications={medications} />
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>No medications scheduled</p>
                    <p className="text-sm mt-2">Medications will appear here once prescribed</p>
                  </div>
                )}
              </div>

              {/* Progress Chart with Empty State */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Adherence Progress</h2>
                {adherenceData ? (
                  <ProgressChart 
                    percentage={Number(adherenceData.adherencePercentage) || 0}
                    history={typeof adherenceData.dailyAdherence === 'string' ? JSON.parse(adherenceData.dailyAdherence) : []}
                  />
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>No adherence data available</p>
                    <p className="text-sm mt-2">Data will appear as you take medications</p>
                  </div>
                )}
              </div>
            </div>

            {/* Upcoming Doses with Empty State */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Upcoming Doses</h2>
              {medications.length > 0 ? (
                <UpcomingDoses 
                  medications={medications.filter(med => !med.isOverdue)}
                  onMedicationAction={handleMedicationAction}
                />
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No upcoming doses</p>
                  <p className="text-sm mt-2">Your scheduled medications will appear here</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
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
