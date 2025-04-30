"use client"

import { useState } from 'react'
import { format } from 'date-fns'
import CameraModal from './CameraModal'

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
  recommendedPillCount?: string
  patientId?: string
}

interface MedicationVerificationProps {
  medication: Medication
  onComplete: (notes: string) => void
  onCancel: () => void
  isHelper?: boolean
}

export default function MedicationVerification({
  medication,
  onComplete,
  onCancel,
  isHelper = false
}: MedicationVerificationProps) {
  const [notes, setNotes] = useState('')
  const [amount, setAmount] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showCamera, setShowCamera] = useState(false)

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true)
      await onComplete(notes)
    } catch (error) {
      console.error('Error verifying medication:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCameraVerification = (data: {
    medicationId: string
    patientId: string
    pillCount: string
    recommendedPillCount: string
    status: 'taken' | 'missed' | 'skipped'
    notes?: string
    bypassVerification?: boolean
  }) => {
    setNotes(data.notes || '')
    setAmount(parseInt(data.pillCount))
    setShowCamera(false)
    handleSubmit()
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h4 className="font-medium">{medication.name}</h4>
        <p className="text-sm text-gray-500">{medication.dosage}</p>
        <p className="text-sm text-gray-500">
          Schedule: {medication.schedule.time} on {medication.schedule.days.join(', ')}
        </p>
        {medication.lastTaken && (
          <p className="text-sm text-gray-500">
            Last taken: {format(new Date(medication.lastTaken), 'MMM d, h:mm a')}
          </p>
        )}
        <p className="text-sm text-gray-500">
          Recommended Dose: {medication.recommendedPillCount || '1'} pill(s)
        </p>
      </div>

      {isHelper && (
        <div className="space-y-2">
          <button
            onClick={() => setShowCamera(true)}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Use Camera to Verify
          </button>
        </div>
      )}

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Amount to take
        </label>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setAmount(Math.max(1, amount - 1))}
            className="p-2 border rounded-md hover:bg-gray-50"
            disabled={amount <= 1}
          >
            -
          </button>
          <span className="w-12 text-center">{amount}</span>
          <button
            onClick={() => setAmount(amount + 1)}
            className="p-2 border rounded-md hover:bg-gray-50"
          >
            +
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          {isHelper ? 'Notes about verification' : 'Notes (optional)'}
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          rows={3}
          placeholder={isHelper ? 'Add note about verification...' : 'Add any notes about taking this medication...'}
        />
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Verifying...' : 'Verify Medication'}
        </button>
      </div>

      {showCamera && (
        <CameraModal
          isOpen={true}
          onClose={() => setShowCamera(false)}
          medication={{
            RowKey: medication.id,
            name: medication.name,
            recommendedPillCount: medication.recommendedPillCount || '1',
            patientId: medication.patientId || ''
          }}
          onVerificationComplete={handleCameraVerification}
        />
      )}
    </div>
  )
} 