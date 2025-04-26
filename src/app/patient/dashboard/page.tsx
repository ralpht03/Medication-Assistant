"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import MedicationCard from '@/components/shared/MedicationCard'
import ProgressChart from '@/components/shared/ProgressChart'
import { Medications, DashboardMedication } from '@/lib/types'
import { Camera, Check } from 'lucide-react'
import PageLayout from '@/components/PageLayout'
import handlePrescriptionUpload from '@/components/handlePrescriptionUpload'

interface AdherenceData {
  percentage: number;
  streak: number;
  dailyHistory: Array<{
    date: string;
    taken: number;
    total: number;
  }>;
  totalVerifications: number;
  successfulVerifications: number;
  correctDoseVerifications: number;
  incorrectDoseVerifications: number;
}

interface AdherenceRecord {
  Timestamp: string
  status: 'taken' | 'missed' | 'skipped'
  medicationId: string
  patientId: string
}

interface DashboardStats {
  medications: DashboardMedication[];
  adherenceData: AdherenceData;
  unreadAlerts: number;
}

// Default empty states
const emptyAdherenceData: AdherenceData = {
  percentage: 0,
  streak: 0,
  dailyHistory: [],
  totalVerifications: 0,
  successfulVerifications: 0,
  correctDoseVerifications: 0,
  incorrectDoseVerifications: 0
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    medications: [],
    adherenceData: emptyAdherenceData,
    unreadAlerts: 0
  });
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
      const patientId = user.id || user.rowKey || user.RowKey;

      if (!patientId) {
        console.error('User data:', user);
        setStats(prev => ({ ...prev, medications: [], adherenceData: emptyAdherenceData }));
        return;
      }

      // Fetch all required data in parallel
      const [medResponse, alertsResponse, adherenceResponse] = await Promise.all([
        fetch(`/api/medications?patientId=${patientId}`),
        fetch(`/api/alerts?userId=${patientId}&role=patient&status=unread`),
        fetch(`/api/adherence?patientId=${patientId}`)
      ]);

      if (!medResponse.ok || !adherenceResponse.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const medResponseText = await medResponse.text();
      const alertsData = await alertsResponse.json();
      const adherenceData = await adherenceResponse.json();
      
      let responseData;
      try {
        responseData = JSON.parse(medResponseText);
      } catch (e) {
        console.error('Error parsing medications response JSON:', e);
        setStats(prev => ({ ...prev, medications: [] }));
        return;
      }
      
      const medicationsData = responseData.medications || [];
      const now = new Date();
      const processedMedications = medicationsData.map((med: any) => {
        const timeStr = med.time || '08:00';
        const [hours, minutes] = timeStr.split(':').map(Number);
        const medTime = new Date();
        medTime.setHours(hours, minutes, 0, 0);
        
        let status: 'taken' | 'missed' | 'upcoming' = "upcoming";
        if (medTime < now) {
          status = "missed";
        }
        
        return {
          ...med,
          patientId: patientId,
          status,
          time: timeStr,
          isOverdue: medTime < now && status === "missed",
          isCurrent: Math.abs(medTime.getTime() - now.getTime()) < 1800000,
          RowKey: med.RowKey || med.rowKey || med.id
        };
      });

      setStats({
        medications: processedMedications,
        adherenceData: {
          percentage: parseInt(adherenceData.adherencePercentage),
          streak: parseInt(adherenceData.streak),
          dailyHistory: adherenceData.dailyAdherence.map((day: any) => ({
            date: day.date,
            taken: parseInt(day.taken),
            total: parseInt(day.total)
          })),
          totalVerifications: parseInt(adherenceData.totalVerifications),
          successfulVerifications: parseInt(adherenceData.successfulVerifications),
          correctDoseVerifications: parseInt(adherenceData.correctDoseVerifications),
          incorrectDoseVerifications: parseInt(adherenceData.incorrectDoseVerifications)
        },
        unreadAlerts: alertsData.length
      });
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data');
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
      if (action === 'snooze') {
        // Handle snooze action if needed
        console.log('Medication snoozed:', medicationId);
      }
      
      // For 'take' action, we don't need to do anything here
      // The CameraModal component will handle the API call with pill verification data
      
      // Refresh dashboard data after action
      await fetchDashboardData();
      
      // Add a small delay to ensure the API has processed the verification
      setTimeout(async () => {
        await fetchDashboardData();
      }, 1000);
    } catch (error) {
      console.error('Error handling medication action:', error);
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
          data={{
            percentage: stats.adherenceData.percentage,
            streak: stats.adherenceData.streak,
            total: stats.adherenceData.totalVerifications,
            taken: stats.adherenceData.correctDoseVerifications,
            incorrect: stats.adherenceData.incorrectDoseVerifications,
            missed: stats.adherenceData.totalVerifications - stats.adherenceData.successfulVerifications
          }}
          loading={loading}
        />
      </div>

      {/* Pill Identification section removed - now accessible from sidebar */}

      {/* Today's Medications Section */}
      {stats.medications.length > 0 && (
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
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Today's Medications</h2>
                {stats.unreadAlerts > 0 && (
                  <button
                    onClick={() => router.push('/patient/alerts')}
                    className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700"
                  >
                    <span className="flex items-center justify-center w-5 h-5 bg-red-100 rounded-full">
                      {stats.unreadAlerts}
                    </span>
                    Unread Alerts
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stats.medications.map((medication) => (
                  <MedicationCard
                    key={medication.RowKey}
                    medication={medication}
                    showActions={true}
                    onTake={() => handleMedicationAction(medication.RowKey, 'take')}
                    onSnooze={() => handleMedicationAction(medication.RowKey, 'snooze')}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Empty Medications State */}
      {!loading && stats.medications.length === 0 && (
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
      {/* Prescription Upload Section */}
<div className="mb-6 sm:mb-8">
  <div className="bg-white rounded-lg shadow-lg overflow-hidden">
    <div className="p-4 sm:p-6 border-b border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Prescription Upload</h2>
          <p className="text-gray-600 mt-1">Submit your prescription forms for medication updates</p>
        </div>
      </div>
    </div>
    
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="flex-1 w-full">
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Upload a clear image or PDF of your prescription form to have your medications updated automatically.
            </p>
            <ul className="space-y-2">
              <li className="flex items-center gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                  <Check className="w-3 h-3 text-blue-600" />
                </div>
                <p className="text-sm text-gray-600">Supports PNG and PDF formats</p>
              </li>
              <li className="flex items-center gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                  <Check className="w-3 h-3 text-blue-600" />
                </div>
                <p className="text-sm text-gray-600">Files should be clear and legible</p>
              </li>
              <li className="flex items-center gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                  <Check className="w-3 h-3 text-blue-600" />
                </div>
                <p className="text-sm text-gray-600">Your medications will automatically be updated</p>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="w-full sm:w-auto sm:min-w-[250px]">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-500 transition-colors bg-gray-50">
            <input
              type="file"
              id="prescription-upload"
              className="hidden"
              accept=".png,.pdf"
              onChange={(e) => handlePrescriptionUpload(e)}
            />
            <label
              htmlFor="prescription-upload"
              className="cursor-pointer block w-full"
            >
              <div className="mx-auto w-12 h-12 flex items-center justify-center rounded-full bg-blue-100 mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <p className="text-sm font-medium text-blue-600">Click to select file</p>
              <p className="text-xs text-gray-500 mt-1">or drag and drop</p>
              <p className="text-xs text-gray-400 mt-2">PNG or PDF up to 10MB</p>
            </label>
          </div>
          
          <button
            className="mt-4 w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
            onClick={() => document.getElementById('prescription-upload')?.click()}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12" />
            </svg>
            Upload Prescription
          </button>
        </div>
      </div>
      
      {/* Upload Progress and Status */}
      <div id="upload-status" className="mt-6 hidden">
        <div className="flex items-center gap-3">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: '45%' }}></div>
          </div>
          <span className="text-sm text-gray-600">45%</span>
        </div>
        <p className="text-sm text-blue-600 mt-2">Uploading prescription...</p>
      </div>
      
      {/* Success Message (hidden by default) */}
      <div id="upload-success" className="mt-6 hidden">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">
                Prescription successfully uploaded!
              </p>
              <p className="mt-1 text-sm text-green-700">
                We'll process your prescription and update your medications within 24 hours.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Error Message (hidden by default) */}
      <div id="upload-error" className="mt-6 hidden">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">
                Upload failed!
              </p>
              <p className="mt-1 text-sm text-red-700">
                Please check your file format and try again. Only PNG and PDF formats are supported.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
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
