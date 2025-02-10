"use client"

import { useState } from 'react'
import Header from '@/components/Header'
import Sidebar from '@/components/Sidebar'
import MedicationOverview from '@/components/MedicationOverview'
import ProgressChart from '@/components/shared/ProgressChart'

interface Medication {
  id: string | number
  name: string
  dosage: string
  time: string
  status: 'taken' | 'missed' | 'upcoming'
  instructions?: string
}

// Mock data
const mockMedications: Medication[] = [
  {
    id: 1,
    name: "Aspirin",
    dosage: "100mg",
    time: "8:00 AM",
    status: "taken",
    instructions: "Take with food"
  },
  {
    id: 2,
    name: "Lisinopril",
    dosage: "10mg",
    time: "12:00 PM",
    status: "upcoming",
    instructions: "Take with water"
  },
  {
    id: 3,
    name: "Metformin",
    dosage: "500mg",
    time: "6:00 PM",
    status: "upcoming",
    instructions: "Take with evening meal"
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

export default function PatientDashboard() {
  const [medications, setMedications] = useState<Medication[]>(mockMedications)

  const handleMedicationAction = (medicationId: string | number, action: 'take' | 'snooze') => {
    if (action === 'take') {
      setMedications(meds =>
        meds.map(med =>
          med.id === medicationId ? { ...med, status: 'taken' as const } : med
        )
      )
    }
    // Handle snooze action
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <div className="flex h-screen pt-16"> {/* Add pt-16 to account for fixed header */}
        <div className="w-64 flex-shrink-0">
          <Sidebar />
        </div>
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Current Medications - Spans 8 columns on large screens */}
              <div className="lg:col-span-8">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Current Medications</h2>
                  <MedicationOverview
                    medications={medications}
                    onMedicationAction={handleMedicationAction}
                  />
                </div>
              </div>

              {/* Medical Adherence - Spans 4 columns on large screens */}
              <div className="lg:col-span-4">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <ProgressChart
                    data={mockAdherenceData}
                    period="weekly"
                  />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
