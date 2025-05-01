import { useState, useEffect } from "react"
import { X, AlertCircle, CheckCircle, Loader2 } from "lucide-react"

interface Patient {
  id: string
  firstName: string
  lastName: string
  email: string
}

interface MedicationAssignmentModalProps {
  patient: Patient
  onClose: () => void
  onMedicationAssigned: () => void
}

const MedicationAssignmentModal = ({
  patient,
  onClose,
  onMedicationAssigned
}: MedicationAssignmentModalProps) => {
  // Preset medication options
  const presetMedications = [
    "Amoxicillin",
    "Cefdinir",
    "Diclofenac",
    "Memantine",
    "Men Multi",
    "Negative",
    "Omega3",
    "One A Day Mens",
    "One A Day Womens",
    "Prednisone"
  ]

  // Form state
  const [name, setName] = useState("")
  const [dosage, setDosage] = useState("")
  const [frequency, setFrequency] = useState("daily")
  const [route, setRoute] = useState("oral")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [verificationMethod, setVerificationMethod] = useState("manual-entry")
  const [prescribingDoctor, setPrescribingDoctor] = useState("")
  const [pharmacy, setPharmacy] = useState("")
  const [notes, setNotes] = useState("")
  const [refillsRemaining, setRefillsRemaining] = useState<string>("0")
  const [recommendedPillCount, setRecommendedPillCount] = useState<string>("1")
  const [timeOfDay, setTimeOfDay] = useState<string[]>([])

  // UI state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Prefill prescribing doctor with logged-in admin's name
  useEffect(() => {
    try {
      // Get the user from localStorage
      const userStr = localStorage.getItem('user')
      if (userStr) {
        const user = JSON.parse(userStr)
        // Check if the user is an admin
        if (user.role === 'admin') {
          // Set the prescribing doctor field with the admin's name
          const adminName = `${user.firstName || ''} ${user.lastName || ''}`.trim()
          if (adminName) {
            setPrescribingDoctor(adminName)
          }
        }
      }
    } catch (err) {
      console.error('Error getting admin information:', err)
    }
  }, [])

  // Time options
  const timeOptions = [
    { id: "morning", label: "Morning (8:00 AM)" },
    { id: "noon", label: "Noon (12:00 PM)" },
    { id: "afternoon", label: "Afternoon (2:00 PM)" },
    { id: "evening", label: "Evening (6:00 PM)" },
    { id: "night", label: "Night (10:00 PM)" }
  ]

  // Toggle time selection
  const toggleTimeSelection = (timeId: string) => {
    setTimeOfDay(prev => 
      prev.includes(timeId)
        ? prev.filter(t => t !== timeId)
        : [...prev, timeId]
    )
  }

  // Update the refills input handler
  const handleRefillsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow numeric input
    if (/^\d*$/.test(value)) {
      setRefillsRemaining(value);
    }
  };

  // Update the recommended pill count input handler
  const handleRecommendedPillCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow numeric input
    if (/^\d*$/.test(value)) {
      setRecommendedPillCount(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setLoading(true)
      setError(null)

      // Validate required fields
      if (!name || !dosage || !frequency || !startDate || !endDate || !verificationMethod || !recommendedPillCount || timeOfDay.length === 0) {
        throw new Error("Please fill in all required fields")
      }

      // Format time field as expected by backend
      const formattedTime = timeOfDay.join(", ")

      // Prepare medication data
      const medicationData = {
        patientId: patient.id,
        name,
        dosage,
        frequency,
        route,
        startDate,
        endDate,
        time: formattedTime,
        verificationMethod,
        prescribingDoctor: prescribingDoctor || undefined,
        pharmacy: pharmacy || undefined,
        notes: notes || undefined,
        refillsRemaining: refillsRemaining || 0,
        recommendedPillCount: recommendedPillCount || "1",
        lastFilled: startDate // Initially set lastFilled to startDate
      }

      // Send to API
      const response = await fetch('/api/medications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(medicationData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to assign medication')
      }

      // Show success message
      setSuccess(true)
      
      // Clear form
      setTimeout(() => {
        onMedicationAssigned()
      }, 1500)
      
    } catch (err) {
      console.error('Error assigning medication:', err)
      setError(err instanceof Error ? err.message : 'An unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Assign Medication to {patient.firstName} {patient.lastName}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 focus:outline-none"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 flex items-start">
              <AlertCircle className="h-5 w-5 text-red-500 mr-3 mt-0.5" />
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          {success ? (
            <div className="p-8 text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Medication Assigned Successfully</h3>
              <p className="text-gray-600">
                The medication has been assigned to {patient.firstName} {patient.lastName}.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Medication Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="medication-name">
                    Medication Name*
                  </label>
                  <select
                    id="medication-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    required
                  >
                    <option value="">Select a medication</option>
                    {presetMedications.map((medication) => (
                      <option key={medication} value={medication}>
                        {medication}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Dosage */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="dosage">
                    Dosage*
                  </label>
                  <input
                    id="dosage"
                    type="text"
                    value={dosage}
                    onChange={(e) => setDosage(e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="e.g., 10mg"
                    required
                  />
                </div>

                {/* Frequency */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="frequency">
                    Frequency*
                  </label>
                  <select
                    id="frequency"
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    required
                  >
                    <option value="daily">Daily</option>
                    <option value="twice-daily">Twice Daily</option>
                    <option value="three-times-daily">Three Times Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="as-needed">As Needed</option>
                  </select>
                </div>

                {/* Route */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="route">
                    Route*
                  </label>
                  <select
                    id="route"
                    value={route}
                    onChange={(e) => setRoute(e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    required
                  >
                    <option value="oral">Oral</option>
                    <option value="topical">Topical</option>
                    <option value="injection">Injection</option>
                    <option value="inhaled">Inhaled</option>
                    <option value="sublingual">Sublingual</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Start Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="start-date">
                    Start Date*
                  </label>
                  <input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    required
                  />
                </div>

                {/* End Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="end-date">
                    End Date*
                  </label>
                  <input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    required
                  />
                </div>

                {/* Verification Method */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="verification-method">
                    Verification Method*
                  </label>
                  <select
                    id="verification-method"
                    value={verificationMethod}
                    onChange={(e) => setVerificationMethod(e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    required
                  >
                    <option value="manual-entry">Manual Entry</option>
                    <option value="live-feed">Live Feed</option>
                    <option value="patient-helper">Patient Helper</option>
                  </select>
                </div>

                {/* Refills Remaining */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="refills">
                    Refills Remaining
                  </label>
                  <input
                    id="refills"
                    type="text"
                    pattern="\d*"
                    value={refillsRemaining}
                    onChange={handleRefillsChange}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>

                {/* Recommended Pill Count */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="recommended-pill-count">
                    Recommended Pill Count*
                  </label>
                  <input
                    id="recommended-pill-count"
                    type="text"
                    pattern="\d*"
                    value={recommendedPillCount}
                    onChange={handleRecommendedPillCountChange}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="e.g., 1"
                    required
                  />
                </div>

                {/* Prescribing Doctor */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="prescribing-doctor">
                    Prescribing Doctor
                  </label>
                  <input
                    id="prescribing-doctor"
                    type="text"
                    value={prescribingDoctor}
                    onChange={(e) => setPrescribingDoctor(e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="e.g., Dr. Smith"
                  />
                </div>

                {/* Pharmacy */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="pharmacy">
                    Pharmacy
                  </label>
                  <input
                    id="pharmacy"
                    type="text"
                    value={pharmacy}
                    onChange={(e) => setPharmacy(e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="e.g., CVS Pharmacy"
                  />
                </div>
              </div>

              {/* Time of Day Checkboxes */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time of Day*
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {timeOptions.map((time) => (
                    <div
                      key={time.id}
                      className={`p-3 rounded-md border cursor-pointer flex items-center ${
                        timeOfDay.includes(time.id)
                          ? "bg-blue-50 border-blue-500"
                          : "border-gray-300 hover:bg-gray-50"
                      }`}
                      onClick={() => toggleTimeSelection(time.id)}
                    >
                      <input
                        type="checkbox"
                        checked={timeOfDay.includes(time.id)}
                        onChange={() => toggleTimeSelection(time.id)}
                        className="h-4 w-4 text-blue-600 rounded"
                      />
                      <span className="ml-2 text-sm">{time.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="notes">
                  Additional Notes
                </label>
                <textarea
                  id="notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Any additional instructions or notes about this medication"
                />
              </div>

              {/* Submit Button */}
              <div className="mt-8 flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="mr-3 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin h-4 w-4 mr-2" />
                      Assigning...
                    </>
                  ) : (
                    "Assign Medication"
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default MedicationAssignmentModal