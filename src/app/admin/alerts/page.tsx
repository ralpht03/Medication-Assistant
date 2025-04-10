"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import PageLayout from '@/components/PageLayout'
import AlertsPanel from '@/components/AlertsPanel'
import { AlertCircle, Filter } from 'lucide-react'

interface Alert {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  read: boolean;
  priority: 'critical' | 'high' | 'medium' | 'low';
  medicationId?: string;
  medicationName?: string;
  patientId?: string;
  patientName?: string;
}

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
}

// Sample mock patients
const mockPatients: Patient[] = [
  { id: "patient-123", firstName: "John", lastName: "Doe" },
  { id: "patient-456", firstName: "Jane", lastName: "Smith" },
  { id: "patient-789", firstName: "Robert", lastName: "Johnson" }
];

// Sample mock alerts for demonstration
const mockAlerts: Alert[] = [
  // Critical alerts
  {
    id: "patient-overdose-123456",
    type: "patient_overdose",
    message: "URGENT: Patient John Doe took 2 pills instead of the recommended 1 for One_A_Day_Men (OVERDOSE).",
    timestamp: new Date(Date.now() - 30 * 60000).toISOString(), // 30 minutes ago
    read: false,
    priority: "critical",
    medicationId: "med-one-a-day-men",
    medicationName: "One_A_Day_Men",
    patientId: "patient-123",
    patientName: "John Doe"
  },
  {
    id: "patient-overdose-234567",
    type: "patient_overdose",
    message: "URGENT: Patient Jane Smith took 2 pills instead of the recommended 1 for One_A_Day_Women (OVERDOSE).",
    timestamp: new Date(Date.now() - 2 * 3600000).toISOString(), // 2 hours ago
    read: false,
    priority: "critical",
    medicationId: "med-one-a-day-women",
    medicationName: "One_A_Day_Women",
    patientId: "patient-456",
    patientName: "Jane Smith"
  },
  
  // High priority alerts
  {
    id: "patient-underdose-345678",
    type: "patient_underdose",
    message: "Patient Robert Johnson took 0 pills instead of the recommended 1 for One_A_Day_Men (underdose).",
    timestamp: new Date(Date.now() - 5 * 3600000).toISOString(), // 5 hours ago
    read: false,
    priority: "high",
    medicationId: "med-one-a-day-men",
    medicationName: "One_A_Day_Men",
    patientId: "patient-789",
    patientName: "Robert Johnson"
  },
  {
    id: "patient-missed-dose-456789",
    type: "patient_missed_dose",
    message: "Patient John Doe missed their scheduled dose of One_A_Day_Men at 08:00.",
    timestamp: new Date(Date.now() - 8 * 3600000).toISOString(), // 8 hours ago
    read: true,
    priority: "high",
    medicationId: "med-one-a-day-men",
    medicationName: "One_A_Day_Men",
    patientId: "patient-123",
    patientName: "John Doe"
  },
  
  // Medium priority alerts
  {
    id: "patient-verification-567890",
    type: "patient_verification_bypassed",
    message: "Patient Jane Smith bypassed verification for One_A_Day_Women. Please follow up.",
    timestamp: new Date(Date.now() - 24 * 3600000).toISOString(), // 1 day ago
    read: false,
    priority: "medium",
    medicationId: "med-one-a-day-women",
    medicationName: "One_A_Day_Women",
    patientId: "patient-456",
    patientName: "Jane Smith"
  },
  {
    id: "patient-pill-id-678901",
    type: "patient_pill_identification_failed",
    message: "Pill identification failed for Robert Johnson's One_A_Day_Men. The scanned pill doesn't match the prescribed medication.",
    timestamp: new Date(Date.now() - 2 * 24 * 3600000).toISOString(), // 2 days ago
    read: true,
    priority: "medium",
    medicationId: "med-one-a-day-men",
    medicationName: "One_A_Day_Men",
    patientId: "patient-789",
    patientName: "Robert Johnson"
  }
];

export default function AdminAlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>(mockAlerts)
  const [patients, setPatients] = useState<Patient[]>(mockPatients)
  const [loading, setLoading] = useState(false) // Set to false to show mock data immediately
  const [error, setError] = useState<string | null>(null)
  const [patientFilter, setPatientFilter] = useState<string>('all')
  const router = useRouter()

  // Filter alerts based on selected patient
  useEffect(() => {
    if (patientFilter === 'all') {
      setAlerts(mockAlerts);
    } else {
      setAlerts(mockAlerts.filter(alert => alert.patientId === patientFilter));
    }
  }, [patientFilter]);

  // In a real implementation, this would fetch actual data from the API
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Comment out the API call for now to use mock data
        /*
        setLoading(true)
        setError(null)
        */
        
        // This code is commented out to use mock data instead
        /*
        const userStr = localStorage.getItem('user')
        if (!userStr) {
          router.push('/login')
          return
        }

        const user = JSON.parse(userStr)
        const adminId = user.id || user.rowKey || user.RowKey
        
        // Fetch patients linked to this admin
        const patientsResponse = await fetch('/api/admin/patients')
        
        if (!patientsResponse.ok) {
          throw new Error(`Error fetching patients: ${patientsResponse.status}`)
        }
        
        const patientsData = await patientsResponse.json()
        setPatients(patientsData.map((patient: any) => ({
          id: patient.id || patient.rowKey || patient.RowKey,
          firstName: patient.firstName,
          lastName: patient.lastName
        })))
        
        // Fetch alerts for admin
        const alertsUrl = patientFilter === 'all'
          ? `/api/alerts?adminId=${adminId}`
          : `/api/alerts?adminId=${adminId}&patientId=${patientFilter}`
        
        const alertsResponse = await fetch(alertsUrl)
        
        if (!alertsResponse.ok) {
          throw new Error(`Error fetching alerts: ${alertsResponse.status}`)
        }
        
        const alertsData = await alertsResponse.json()
        setAlerts(alertsData)
        */
      } catch (error) {
        console.error('Error fetching data:', error)
        setError('Failed to load data. Please try again later.')
      } finally {
        // setLoading(false) // Commented out since we're using mock data
      }
    }

    fetchData()
  }, [router, patientFilter])

  const handleAlertAction = async (alertId: string, action: 'acknowledge' | 'dismiss' | 'emergency') => {
    try {
      const userStr = localStorage.getItem('user')
      if (!userStr) return

      const user = JSON.parse(userStr)
      const userId = user.id || user.rowKey || user.RowKey

      if (action === 'acknowledge') {
        // Mark alert as read
        await fetch('/api/alerts', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ userId, alertId })
        })

        // Update local state
        setAlerts(alerts.map(alert => 
          alert.id === alertId ? { ...alert, read: true } : alert
        ))
      } else if (action === 'dismiss') {
        // Delete the alert
        await fetch(`/api/alerts?userId=${userId}&alertId=${alertId}`, {
          method: 'DELETE'
        })

        // Update local state
        setAlerts(alerts.filter(alert => alert.id !== alertId))
      } else if (action === 'emergency') {
        // For emergency contact, we could:
        // 1. Show patient's emergency contact information
        // 2. Initiate a call if on mobile
        // 3. Send an emergency notification
        
        // Find the alert to get the patient ID
        const alert = alerts.find(a => a.id === alertId)
        if (alert && alert.patientId) {
          router.push(`/admin/patients/${alert.patientId}/emergency-contact`)
        }
      }
    } catch (error) {
      console.error('Error handling alert action:', error)
      setError('Failed to process your request. Please try again.')
    }
  }

  return (
    <PageLayout userType="admin" title="Alerts">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patient Medication Alerts</h1>
          <p className="mt-1 text-gray-600">
            Monitor and respond to patient medication alerts
          </p>
        </div>
        
        <div className="mt-4 sm:mt-0">
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={patientFilter}
              onChange={(e) => setPatientFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Patients</option>
              {patients.map(patient => (
                <option key={patient.id} value={patient.id}>
                  {patient.firstName} {patient.lastName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <p>{error}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <AlertsPanel 
          alerts={alerts} 
          onAlertAction={handleAlertAction} 
          showPatientInfo={true}
        />
      )}
    </PageLayout>
  )
}