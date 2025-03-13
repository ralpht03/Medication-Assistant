import { useState, useEffect } from "react"
import { Search, MoreVertical, AlertCircle, CheckCircle, PlusCircle, Loader2 } from "lucide-react"
import MedicationAssignmentModal from "./MedicationAssignmentModal"

interface Patient {
  id: string
  name: string
  email: string
  lastMedication: string
  nextScheduled: string
  adherenceRate: number
  status: "normal" | "missed" | "overdose"
  medicationCount?: number
}

const PatientListTable = () => {
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortField, setSortField] = useState<keyof Patient>("name")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Fetch linked patients from the API
  useEffect(() => {
    const fetchLinkedPatients = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Get the admin ID from localStorage
        const userStr = localStorage.getItem('user')
        if (!userStr) {
          throw new Error('User not found in localStorage')
        }
        
        const user = JSON.parse(userStr)
        console.log('User data from localStorage:', JSON.stringify(user, null, 2))
        
        // Try all possible ID fields
        let adminId = user.id || user.rowKey || user.RowKey || user.email || 'atest@usf.edu'
        
        if (!adminId) {
          console.error('Admin ID not found in user data:', user)
          throw new Error('Admin ID not found')
        }
        
        console.log('Using admin ID:', adminId)
        
        // If we have the hardcoded admin ID, use it directly
        const hardcodedAdminId = '459e9187-2c24-492e-b0c5-f97fc19601b0'
        if (adminId !== hardcodedAdminId && user.email === 'atest@usf.edu') {
          console.log(`Using hardcoded admin ID (${hardcodedAdminId}) instead of ${adminId}`)
          adminId = hardcodedAdminId
        }
        
        // Fetch linked patients
        console.log('Fetching linked patients for admin ID:', adminId);
        const response = await fetch(`/api/admin/patients?adminId=${adminId}`);
        
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
          throw new Error(data.error || 'Failed to fetch linked patients');
        }
        
        console.log('Parsed patient data:', data);
        setPatients(data.patients || []);
        
        if (data.patients && data.patients.length > 0) {
          console.log(`Found ${data.patients.length} linked patients`);
        } else {
          console.log('No linked patients found');
        }
      } catch (err) {
        console.error('Error fetching linked patients:', err)
        setError(err instanceof Error ? err.message : 'An unknown error occurred')
        setPatients([])
      } finally {
        setLoading(false)
      }
    }
    
    fetchLinkedPatients()
  }, [refreshTrigger]) // Refetch when refreshTrigger changes

  const handleSort = (field: keyof Patient) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const getStatusColor = (status: Patient["status"]) => {
    switch (status) {
      case "normal":
        return "bg-green-100 text-green-800"
      case "missed":
        return "bg-red-100 text-red-800"
      case "overdose":
        return "bg-orange-100 text-orange-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }
  
  const handlePatientClick = (patient: Patient) => {
    setSelectedPatient(patient)
  }
  
  const handleCloseModal = () => {
    setSelectedPatient(null)
  }

  const filteredPatients = patients
    .filter((patient: Patient) =>
      patient.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a: Patient, b: Patient) => {
      // Safe comparison that handles undefined values
      const aValue = a[sortField] || '';
      const bValue = b[sortField] || '';
      
      if (sortDirection === "asc") {
        return aValue > bValue ? 1 : -1
      }
      return aValue < bValue ? 1 : -1
    })

  // Function to refresh the patient list after medication assignment
  const handleMedicationAssigned = () => {
    setRefreshTrigger(prev => prev + 1);
    handleCloseModal();
  };

  return (
    <div className="bg-white rounded-lg shadow-md">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Patients</h2>
          <div className="relative">
            <input
              type="text"
              placeholder="Search patients..."
              className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
      {!loading && !error && filteredPatients.length === 0 && (
        <div className="p-8 text-center">
          <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
            <PlusCircle className="h-full w-full" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Patients Found</h3>
          <p className="text-gray-600">
            {searchTerm
              ? `No patients matching "${searchTerm}" were found.`
              : "You don't have any linked patients yet."}
          </p>
        </div>
      )}

      {/* Patient table */}
      {!loading && !error && filteredPatients.length > 0 && (
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
                  onClick={() => handleSort("lastMedication")}
                >
                  Last Taken
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort("nextScheduled")}
                >
                  Next Scheduled
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort("adherenceRate")}
                >
                  Adherence Rate
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort("status")}
                >
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPatients.map((patient: Patient) => (
                <tr
                  key={patient.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => handlePatientClick(patient)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{patient.name}</div>
                    <div className="text-xs text-gray-500">{patient.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{patient.lastMedication}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{patient.nextScheduled}</div>
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
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(patient.status)}`}>
                      {patient.status === "normal" && <CheckCircle className="w-4 h-4 mr-1" />}
                      {patient.status === "missed" && <AlertCircle className="w-4 h-4 mr-1" />}
                      {patient.status.charAt(0).toUpperCase() + patient.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      className="text-blue-600 hover:text-blue-900"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePatientClick(patient);
                      }}
                    >
                      <PlusCircle className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Medication Assignment Modal */}
      {selectedPatient && (
        <MedicationAssignmentModal
          patient={selectedPatient}
          onClose={handleCloseModal}
          onMedicationAssigned={handleMedicationAssigned}
        />
      )}
    </div>
  )
}

export default PatientListTable