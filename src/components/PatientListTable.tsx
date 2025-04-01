import { useState, useEffect } from "react"
import { Search, AlertCircle, CheckCircle, PlusCircle, Loader2, UserMinus } from "lucide-react"
import MedicationAssignmentModal from "./MedicationAssignmentModal"

// Define types based on your Azure Table Storage schema
interface Patient {
  id: string
  firstName?: string
  lastName?: string
  name?: string
  email: string
  currentMedications: Medication[]
  adherenceRate: number
  alerts?: Alert[]
  profile?: any
  medicalHistory?: any
}

interface Medication {
  rowKey: string
  name: string
  dosage: string
  frequency: string
  time: string
  instructions?: string
  startDate?: string
  endDate?: string
  refillsRemaining?: number
  lastFilled?: string
  prescribingDoctor?: string
  pharmacy?: string
}

interface Alert {
  type: string
  medicationId: string
  medicationName: string
  message: string
}

// Add or update the props interface
interface PatientListTableProps {
  searchTerm: string;
}

const PatientListTable = ({ searchTerm: externalSearchTerm }: PatientListTableProps) => {
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [localSearchTerm, setLocalSearchTerm] = useState(externalSearchTerm)
  const [sortField, setSortField] = useState<string>("lastName")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState<string | null>(null)

  // Fetch linked patients
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Get the admin ID from localStorage
        const userStr = localStorage.getItem('user')
        if (!userStr) {
          throw new Error('User not found in localStorage')
        }
        
        const user = JSON.parse(userStr)
        const adminId = user.id || user.rowKey || ''
        
        if (!adminId) {
          throw new Error('Admin ID not found')
        }
        
        console.log('Fetching patients for admin ID:', adminId)
        
        // Call your API endpoint to get patients by admin ID
        const response = await fetch(`/api/admin/patients?adminId=${adminId}`)
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to fetch patients')
        }
        
        const data = await response.json()
        setPatients(data.patients || [])
      } catch (err) {
        console.error('Error fetching patients:', err)
        setError(err instanceof Error ? err.message : 'An unknown error occurred')
      } finally {
        setLoading(false)
      }
    }
    
    fetchPatients()
  }, [refreshTrigger])

  const handleSort = (field: string) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const getPatientName = (patient: Patient) => {
    // If name property exists, use it
    if (patient.name) {
      return patient.name;
    }
    // Otherwise use firstName and lastName
    return `${patient.firstName || ''} ${patient.lastName || ''}`.trim();
  }

  const getStatusInfo = (patient: Patient) => {
    // Check for alerts to determine status
    if (patient.alerts && patient.alerts.length > 0) {
      return {
        status: "alert",
        label: "Attention Needed",
        class: "bg-red-100 text-red-800"
      }
    }
    
    // Check adherence rate for status
    if (patient.adherenceRate >= 80) {
      return {
        status: "good",
        label: "Good",
        class: "bg-green-100 text-green-800"
      }
    } else if (patient.adherenceRate >= 60) {
      return {
        status: "moderate",
        label: "Moderate",
        class: "bg-yellow-100 text-yellow-800"
      }
    } else {
      return {
        status: "poor",
        label: "Poor",
        class: "bg-red-100 text-red-800"
      }
    }
  }
  
  // Get the last medication time
  const getLastMedicationTime = (patient: Patient) => {
    if (!patient.currentMedications || patient.currentMedications.length === 0) {
      return "No data"
    }
    
    // In a real application, this would come from medication tracking data
    // For now, we'll return "Today" as a placeholder
    return "Today"
  }
  
  // Get the next scheduled medication time
  const getNextScheduledTime = (patient: Patient) => {
    if (!patient.currentMedications || patient.currentMedications.length === 0) {
      return "No medications"
    }
    
    // In a real application, this would be calculated from medication schedules
    // For now, we'll return a placeholder
    const medicationsWithTimes = patient.currentMedications.filter(med => med.time)
    if (medicationsWithTimes.length > 0) {
      return medicationsWithTimes[0].time
    }
    
    return "No schedule"
  }
  
  const handlePatientClick = (patient: Patient) => {
    setSelectedPatient(patient)
  }
  
  const handleCloseModal = () => {
    setSelectedPatient(null)
  }
  
  const handleRemovePatient = async (patientId: string) => {
    try {
      // Get the admin ID
      const userStr = localStorage.getItem('user')
      if (!userStr) {
        throw new Error('User not found in localStorage')
      }
      
      const user = JSON.parse(userStr)
      const adminId = user.id || user.rowKey || ''
      
      if (!adminId) {
        throw new Error('Admin ID not found')
      }
      
      // Call API to remove patient
      const response = await fetch(`/api/admin/patients/remove`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adminId,
          patientId
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to remove patient')
      }
      
      // Refresh the patient list
      setRefreshTrigger(prev => prev + 1)
      setShowRemoveConfirm(null)
    } catch (err) {
      console.error('Error removing patient:', err)
      alert('Failed to remove patient: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  // Function to refresh the patient list after medication assignment
  const handleMedicationAssigned = () => {
    setRefreshTrigger(prev => prev + 1)
    handleCloseModal()
  }

  // Use either the external or local search term for filtering
  const searchTermToUse = externalSearchTerm || localSearchTerm;

  // Filter patients based on search term
  const filteredPatients = patients.filter(patient => {
    const fullName = `${patient.firstName} ${patient.lastName}`.toLowerCase();
    const searchLower = searchTermToUse.toLowerCase();
    return fullName.includes(searchLower) ||
           patient.name?.toLowerCase().includes(searchLower);
  });

  // Sort and filter patients
  const sortAndFilterPatients = () => {
    return [...filteredPatients]
      .sort((a, b) => {
        let aValue: any, bValue: any

        // Handle nested properties
        if (sortField === "name") {
          aValue = `${a.firstName} ${a.lastName}`
          bValue = `${b.firstName} ${b.lastName}`
        } else if (sortField === "medicationCount") {
          aValue = a.currentMedications?.length || 0
          bValue = b.currentMedications?.length || 0
        } else if (sortField === "alertCount") {
          aValue = a.alerts?.length || 0 
          bValue = b.alerts?.length || 0
        } else {
          // For direct properties
          aValue = a[sortField as keyof Patient]
          bValue = b[sortField as keyof Patient]
        }
        
        // Handle undefined values
        if (aValue === undefined) aValue = ''
        if (bValue === undefined) bValue = ''
        
        // Sort based on direction
        if (sortDirection === "asc") {
          return aValue > bValue ? 1 : -1
        }
        return aValue < bValue ? 1 : -1
      })
  }

  const sortedPatients = sortAndFilterPatients()

  return (
    <div className="bg-white rounded-lg shadow-md">
      <div className="p-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-gray-800">Patients</h2>
          <div className="relative w-full sm:w-auto">
            <input
              type="text"
              placeholder="Search patients..."
              className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
              value={localSearchTerm}
              onChange={(e) => setLocalSearchTerm(e.target.value)}
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex justify-center items-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <span className="ml-2 text-gray-600">Loading patients...</span>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Patients</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => setRefreshTrigger(prev => prev + 1)}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && sortedPatients.length === 0 && (
        <div className="p-8 text-center">
          <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
            <PlusCircle className="h-full w-full" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Patients Found</h3>
          <p className="text-gray-600">
            {searchTermToUse
              ? `No patients matching "${searchTermToUse}" were found.`
              : "You don't have any linked patients yet."}
          </p>
        </div>
      )}

      {/* Patient table */}
      {!loading && !error && sortedPatients.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort("name")}
                >
                  Patient Name
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort("medicationCount")}
                >
                  Medications
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort("adherenceRate")}
                >
                  Adherence Rate
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort("alertCount")}
                >
                  Alerts
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedPatients.map((patient) => {
                const statusInfo = getStatusInfo(patient)
                return (
                  <tr
                    key={patient.id}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{getPatientName(patient)}</div>
                      <div className="text-xs text-gray-500">{patient.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{patient.currentMedications?.length || 0}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2.5">
                          <div
                            className="bg-blue-600 h-2.5 rounded-full"
                            style={{ width: `${patient.adherenceRate}%` }}
                          ></div>
                        </div>
                        <span className="ml-2 text-sm text-gray-500">{patient.adherenceRate}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {patient.alerts && patient.alerts.length > 0 ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            {patient.alerts.length}
                          </span>
                        ) : (
                          <span>None</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-0.5 inline-flex items-center text-xs leading-5 font-semibold rounded-full ${statusInfo.class}`}>
                        {statusInfo.status === "good" && <CheckCircle className="w-4 h-4 mr-1" />}
                        {statusInfo.status === "alert" && <AlertCircle className="w-4 h-4 mr-1" />}
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        {showRemoveConfirm === patient.id ? (
                          <>
                            <button
                              onClick={() => handleRemovePatient(patient.id)}
                              className="text-red-600 hover:text-red-900 px-2 py-1 bg-red-50 rounded"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setShowRemoveConfirm(null)}
                              className="text-gray-600 hover:text-gray-900 px-2 py-1 bg-gray-50 rounded"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handlePatientClick(patient)}
                              className="text-blue-600 hover:text-blue-900 p-1"
                              title="Assign Medication"
                            >
                              <PlusCircle className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => setShowRemoveConfirm(patient.id)}
                              className="text-gray-600 hover:text-red-900 p-1"
                              title="Remove Patient"
                            >
                              <UserMinus className="h-5 w-5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Medication Assignment Modal */}
      {selectedPatient && (
        <MedicationAssignmentModal
          patient={{
            id: selectedPatient.id,
            firstName: selectedPatient.firstName || (selectedPatient.name ? selectedPatient.name.split(' ')[0] : ''),
            lastName: selectedPatient.lastName || (selectedPatient.name ? selectedPatient.name.split(' ').slice(1).join(' ') : ''),
            email: selectedPatient.email
          }}
          onClose={handleCloseModal}
          onMedicationAssigned={handleMedicationAssigned}
        />
      )}
    </div>
  )
}

export default PatientListTable