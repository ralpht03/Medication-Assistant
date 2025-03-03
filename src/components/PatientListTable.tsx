import { useState } from "react"
import { Search, MoreVertical, AlertCircle, CheckCircle, PlusCircle } from "lucide-react"
import MedicationAssignmentModal from "./MedicationAssignmentModal"

interface Patient {
  id: string
  name: string
  lastMedication: string
  nextScheduled: string
  adherenceRate: number
  status: "normal" | "missed" | "overdose"
}

const mockPatients: Patient[] = [
  {
    id: "1",
    name: "John Doe",
    lastMedication: "2 hours ago",
    nextScheduled: "In 4 hours",
    adherenceRate: 95,
    status: "normal"
  },
  {
    id: "2",
    name: "Jane Smith",
    lastMedication: "Missed",
    nextScheduled: "Overdue 2h",
    adherenceRate: 78,
    status: "missed"
  },
  // Add more mock data as needed
]

const PatientListTable = () => {
  const [searchTerm, setSearchTerm] = useState("")
  const [sortField, setSortField] = useState<keyof Patient>("name")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)

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

  const filteredPatients = mockPatients
    .filter(patient =>
      patient.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortDirection === "asc") {
        return a[sortField] > b[sortField] ? 1 : -1
      }
      return a[sortField] < b[sortField] ? 1 : -1
    })

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
            {filteredPatients.map((patient) => (
              <tr
                key={patient.id}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => handlePatientClick(patient)}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{patient.name}</div>
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
                  <button className="text-blue-600 hover:text-blue-900">
                    <MoreVertical className="h-5 w-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Medication Assignment Modal */}
      {selectedPatient && (
        <MedicationAssignmentModal
          patient={selectedPatient}
          onClose={handleCloseModal}
        />
      )}
    </div>
  )
}

export default PatientListTable