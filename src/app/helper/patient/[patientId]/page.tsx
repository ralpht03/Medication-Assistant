"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import PageLayout from '@/components/PageLayout'
import MedicationVerification from '@/components/MedicationVerification'
import { format } from 'date-fns'
import { use } from 'react'

interface Patient {
  id: string
  name: string
  email: string
  profilePictureUrl?: string
  emergencyContact?: {
    name: string
    phone: string
  }
}

interface Medication {
  id: string
  name: string
  dosage: string
  schedule: {
    time: string
    days: string[]
  }
  lastTaken?: string
  nextDose?: string
}

export default function HelperPatientDashboard({ params }: { params: Promise<{ patientId: string }> }) {
  const router = useRouter()
  const [patient, setPatient] = useState<Patient | null>(null)
  const [medications, setMedications] = useState<Medication[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedMedication, setSelectedMedication] = useState<Medication | null>(null)
  const [showVerification, setShowVerification] = useState(false)
  
  // Unwrap the params Promise
  const { patientId } = use(params)

  useEffect(() => {
    const fetchPatientData = async () => {
      try {
        setLoading(true)
        const userStr = localStorage.getItem('user')
        if (!userStr) {
          throw new Error('User not found in localStorage')
        }

        const user = JSON.parse(userStr)
        console.log('User from localStorage:', user)
        
        // Get the helper ID from the correct field
        const helperId = user.rowKey || user.id
        if (!helperId) {
          throw new Error('Helper ID not found in user data')
        }
        console.log('Using helper ID:', helperId)

        // Fetch patient details
        const patientResponse = await fetch(`/api/helper/patient/${patientId}?helperId=${helperId}`)
        if (!patientResponse.ok) {
          const errorData = await patientResponse.json().catch(() => ({}))
          console.error('Patient fetch failed:', {
            status: patientResponse.status,
            statusText: patientResponse.statusText,
            error: errorData
          })
          throw new Error(`Failed to fetch patient details: ${patientResponse.status} ${patientResponse.statusText}`)
        }
        const patientData = await patientResponse.json()
        console.log('Patient data received:', patientData)
        setPatient(patientData)

        // Fetch patient's medications
        const medsResponse = await fetch(`/api/helper/patient/${patientId}/medications?helperId=${helperId}`)
        if (!medsResponse.ok) {
          const errorData = await medsResponse.json().catch(() => ({}))
          console.error('Medications fetch failed:', {
            status: medsResponse.status,
            statusText: medsResponse.statusText,
            error: errorData
          })
          throw new Error(`Failed to fetch medications: ${medsResponse.status} ${medsResponse.statusText}`)
        }
        const medsData = await medsResponse.json()
        console.log('Medications data received:', medsData)
        setMedications(medsData.medications)
      } catch (err) {
        console.error('Error in fetchPatientData:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch patient data')
      } finally {
        setLoading(false)
      }
    }

    fetchPatientData()
  }, [patientId])

  const handleMedicationClick = (medication: Medication) => {
    setSelectedMedication(medication)
    setShowVerification(true)
  }

  const handleVerificationComplete = async (notes: string) => {
    try {
      const userStr = localStorage.getItem('user')
      if (!userStr || !selectedMedication) return

      const user = JSON.parse(userStr)
      // Get the helper ID from the correct field, matching fetchPatientData
      const helperId = user.rowKey || user.id
      if (!helperId) {
        throw new Error('Helper ID not found in user data')
      }
      console.log('Using helper ID for verification:', helperId)
      console.log('Selected medication:', selectedMedication)

      const response = await fetch('/api/helper/medication/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          medicationId: selectedMedication.id,
          patientId,
          helperId,
          notes,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Verification failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        })
        throw new Error(`Failed to verify medication: ${response.status} ${response.statusText}`)
      }

      // Refresh medications list
      const medsResponse = await fetch(`/api/helper/patient/${patientId}/medications?helperId=${helperId}`)
      if (medsResponse.ok) {
        const medsData = await medsResponse.json()
        setMedications(medsData.medications)
      }

      setShowVerification(false)
      setSelectedMedication(null)
    } catch (err) {
      console.error('Error in handleVerificationComplete:', err)
      setError(err instanceof Error ? err.message : 'Failed to verify medication')
    }
  }

  if (loading) {
    return (
      <PageLayout userType="helper" title="Patient Dashboard">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </PageLayout>
    )
  }

  if (error || !patient) {
    return (
      <PageLayout userType="helper" title="Patient Dashboard">
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
          <div className="flex">
            <p>{error || 'Patient not found'}</p>
          </div>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout userType="helper" title={`${patient.name}'s Dashboard`}>
      <div className="space-y-6">
        {/* Patient Info */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {patient.profilePictureUrl && (
                <img
                  src={patient.profilePictureUrl}
                  alt={patient.name}
                  className="h-16 w-16 rounded-full"
                />
              )}
              <div>
                <h2 className="text-xl font-semibold">{patient.name}</h2>
                <p className="text-gray-500">{patient.email}</p>
                {patient.emergencyContact && (
                  <p className="text-sm text-gray-500 mt-1">
                    Emergency Contact: {patient.emergencyContact.name} ({patient.emergencyContact.phone})
                  </p>
                )}
              </div>
            </div>
            <a
              href={`/helper/patient/${patientId}/ai-assistant`}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors duration-150"
            >
              AI Assistant
            </a>
          </div>
        </div>

        {/* Medications */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium mb-4">Today's Medications</h3>
          <div className="space-y-4">
            {medications.map((medication) => (
              <div
                key={medication.id}
                className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors duration-150"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium">{medication.name}</h4>
                    <p className="text-sm text-gray-500">{medication.dosage}</p>
                    <p className="text-sm text-gray-500">
                      Schedule: {medication.schedule.time} on {medication.schedule.days.join(', ')}
                    </p>
                  </div>
                  <div className="text-right">
                    {medication.lastTaken && (
                      <p className="text-sm text-gray-500">
                        Last taken: {format(new Date(medication.lastTaken), 'MMM d, h:mm a')}
                      </p>
                    )}
                    {medication.nextDose && (
                      <p className="text-sm text-gray-500">
                        Next dose: {format(new Date(medication.nextDose), 'MMM d, h:mm a')}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleMedicationClick(medication)
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Verify
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Medication Verification Modal */}
      {showVerification && selectedMedication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium mb-4">Verify Medication</h3>
            <MedicationVerification
              medication={selectedMedication}
              onComplete={handleVerificationComplete}
              onCancel={() => {
                setShowVerification(false)
                setSelectedMedication(null)
              }}
              isHelper={true}
            />
          </div>
        </div>
      )}
    </PageLayout>
  )
} 