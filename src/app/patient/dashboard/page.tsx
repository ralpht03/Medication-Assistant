import MedicationList from "../../../components/MedicationList"
import AdherenceSummary from "../../../components/AdherenceSummary"

const Dashboard = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">Hi, John Doe</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-xl font-semibold text-gray-700 mb-4">Upcoming Medications</h3>
          <MedicationList />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-gray-700 mb-4">Medication Adherence Summary</h3>
          <AdherenceSummary />
        </div>
      </div>
      <div className="mt-8">
        <button className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded">
          Log Medication
        </button>
      </div>
    </div>
  )
}

export default Dashboard

