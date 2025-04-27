import { Check } from "lucide-react"
import { useEffect } from "react"

const medications = [
  { id: 1, name: "Aspirin", dosage: "100mg", time: "8:00 AM", taken: true },
  { id: 2, name: "Lisinopril", dosage: "10mg", time: "12:00 PM", taken: false },
  { id: 3, name: "Metformin", dosage: "500mg", time: "6:00 PM", taken: false },
]

const MedicationList = () => {
  useEffect(() => {
    fetchMedications();
  }, [fetchMedications]);

  return (
    <ul className="bg-white shadow overflow-hidden sm:rounded-md">
      {medications.map((medication) => (
        <li key={medication.id} className="border-b border-gray-200 last:border-b-0">
          <div className="px-4 py-4 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-blue-600 truncate">{medication.name}</div>
              <div className="ml-2 flex-shrink-0 flex">
                {medication.taken ? (
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    Taken
                  </span>
                ) : (
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                    Pending
                  </span>
                )}
              </div>
            </div>
            <div className="mt-2 sm:flex sm:justify-between">
              <div className="sm:flex">
                <p className="flex items-center text-sm text-gray-500">Dosage: {medication.dosage}</p>
              </div>
              <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                <p>Time: {medication.time}</p>
              </div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}

export default MedicationList

