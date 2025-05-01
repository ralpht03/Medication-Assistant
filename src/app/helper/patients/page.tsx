"use client"

import { useState, useEffect } from 'react'
import PageLayout from '@/components/PageLayout'
import { useRouter } from 'next/navigation'

interface Patient {
  id: string
  name: string
  email: string
  adherencePercentage: number
  profilePictureUrl?: string
}

export default function HelperPatientsPage() {
  const router = useRouter()
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setLoading(true)
        const userStr = localStorage.getItem('user')
        if (!userStr) {
          throw new Error('User not found')
        }

        const user = JSON.parse(userStr)
        const helperId = user.id || user.rowKey

        const response = await fetch(`/api/helper/patients?helperId=${helperId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch patients')
        }

        const data = await response.json()
        setPatients(data.patients || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch patients')
        console.error('Error fetching patients:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchPatients()
  }, [])

  const handlePatientClick = (patientId: string) => {
    router.push(`/helper/patient/${patientId}`)
  }

  return (
    <PageLayout userType="helper" title="My Patients">
      {error && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
          <div className="flex">
            <p>{error}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : patients.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No patients assigned to you yet</p>
          <p className="text-sm text-gray-400 mt-1">You'll see patients here once they accept your invitation</p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Adherence Percentage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Profile Picture
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {patients.map((patient) => (
                <tr 
                  key={patient.id}
                  onClick={() => handlePatientClick(patient.id)}
                  className="cursor-pointer hover:bg-gray-50 transition-colors duration-150"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{patient.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{patient.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{patient.adherencePercentage}%</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {patient.profilePictureUrl ? (
                        <img 
                          src={patient.profilePictureUrl} 
                          alt={patient.name}
                          className="h-8 w-8 rounded-full"
                        />
                      ) : '-'}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageLayout>
  )
} 