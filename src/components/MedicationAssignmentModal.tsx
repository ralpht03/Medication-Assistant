import { useState, FormEvent } from 'react'
import { X } from 'lucide-react'

interface Patient {
  id: string
  name: string
  lastMedication: string
  nextScheduled: string
  adherenceRate: number
  status: "normal" | "missed" | "overdose"
}

interface MedicationAssignmentModalProps {
  patient: Patient
  onClose: () => void
}

const MedicationAssignmentModal = ({ patient, onClose }: MedicationAssignmentModalProps) => {
  // Form state
  const [name, setName] = useState('')
  const [dosage, setDosage] = useState('')
  const [frequency, setFrequency] = useState('')
  const [customFrequency, setCustomFrequency] = useState('')
  const [route, setRoute] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [verificationMethod, setVerificationMethod] = useState('')
  
  // Optional fields
  const [prescribingDoctor, setPrescribingDoctor] = useState('')
  const [pharmacy, setPharmacy] = useState('')
  const [notes, setNotes] = useState('')
  const [refillsRemaining, setRefillsRemaining] = useState('')
  const [lastFilled, setLastFilled] = useState('')
  
  // Form state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Validation errors
  const [dateError, setDateError] = useState('')
  
  const validateForm = () => {
    // Reset errors
    setError('')
    setDateError('')
    
    // Check required fields
    if (!name || !dosage || !frequency || !route || !startDate || !endDate || !verificationMethod) {
      setError('Please fill in all required fields')
      return false
    }
    
    // Check if custom frequency has a value
    if (frequency === 'custom' && !customFrequency) {
      setError('Please provide a custom frequency description')
      return false
    }
    
    // Validate dates
    const start = new Date(startDate)
    const end = new Date(endDate)
    if (end < start) {
      setDateError('End date must be after start date')
      return false
    }
    
    return true
  }
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    setIsSubmitting(true)
    
    try {
      const response = await fetch('/api/medications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientId: patient.id,
          name,
          dosage,
          frequency: frequency === 'custom' ? `custom:${customFrequency}` : frequency,
          route,
          startDate,
          endDate,
          verificationMethod,
          prescribingDoctor,
          pharmacy,
          notes,
          refillsRemaining: refillsRemaining ? parseInt(refillsRemaining) : 0,
          lastFilled: lastFilled || null
        }),
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create medication')
      }
      
      setSuccess('Medication assigned successfully')
      
      // Reset form
      setName('')
      setDosage('')
      setFrequency('')
      setCustomFrequency('')
      setRoute('')
      setStartDate('')
      setEndDate('')
      setVerificationMethod('')
      setPrescribingDoctor('')
      setPharmacy('')
      setNotes('')
      setRefillsRemaining('')
      setLastFilled('')
      
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-800">
            Assign Medication for {patient.name}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}
          
          {success && (
            <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">
              {success}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Required Fields */}
              <div className="col-span-2">
                <h3 className="text-lg font-medium mb-2">Medication Details</h3>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Medication Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dosage *
                </label>
                <input
                  type="text"
                  value={dosage}
                  onChange={(e) => setDosage(e.target.value)}
                  className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Frequency *
                </label>
                <div className="grid grid-cols-1 gap-2">
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select frequency</option>
                    <option value="daily">Daily</option>
                    <option value="twice-daily">Twice Daily</option>
                    <option value="three-times-daily">Three Times Daily</option>
                    <option value="four-times-daily">Four Times Daily</option>
                    <option value="every-other-day">Every Other Day</option>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Biweekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="as-needed">As Needed</option>
                    <option value="custom">Custom</option>
                  </select>
                  
                  {frequency === 'custom' && (
                    <div className="mt-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Custom Frequency Description
                      </label>
                      <input
                        type="text"
                        value={customFrequency}
                        onChange={(e) => setCustomFrequency(e.target.value)}
                        placeholder="E.g., Every Monday and Thursday"
                        className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                        required={frequency === 'custom'}
                      />
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Route of Administration *
                </label>
                <select
                  value={route}
                  onChange={(e) => setRoute(e.target.value)}
                  className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select route</option>
                  <option value="oral">Oral</option>
                  <option value="topical">Topical</option>
                  <option value="injection">Injection</option>
                  <option value="inhalation">Inhalation</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date *
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                {dateError && (
                  <p className="mt-1 text-sm text-red-600">{dateError}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Verification Method *
                </label>
                <select
                  value={verificationMethod}
                  onChange={(e) => setVerificationMethod(e.target.value)}
                  className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select verification method</option>
                  <option value="manual-entry">Manual Entry</option>
                  <option value="live-feed">Live Feed Verification</option>
                  <option value="patient-helper">Patient Helper Verification</option>
                </select>
              </div>
              
              {/* Optional Fields */}
              <div className="col-span-2 mt-4">
                <h3 className="text-lg font-medium mb-2">Additional Information (Optional)</h3>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prescribing Doctor
                </label>
                <input
                  type="text"
                  value={prescribingDoctor}
                  onChange={(e) => setPrescribingDoctor(e.target.value)}
                  className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pharmacy
                </label>
                <input
                  type="text"
                  value={pharmacy}
                  onChange={(e) => setPharmacy(e.target.value)}
                  className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Refills Remaining
                </label>
                <input
                  type="number"
                  value={refillsRemaining}
                  onChange={(e) => setRefillsRemaining(e.target.value)}
                  min="0"
                  className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Filled Date
                </label>
                <input
                  type="date"
                  value={lastFilled}
                  onChange={(e) => setLastFilled(e.target.value)}
                  className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Save Medication'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default MedicationAssignmentModal