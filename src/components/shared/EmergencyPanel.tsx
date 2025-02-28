"use client"

import { Phone, AlertCircle, MapPin } from 'lucide-react'

interface EmergencyContact {
  name: string
  relationship: string
  phone: string
}

// Mock data - replace with actual data from your backend
const mockEmergencyContact: EmergencyContact = {
  name: "John Smith",
  relationship: "Spouse",
  phone: "555-0123"
}

const mockMedicalInfo = {
  allergies: ["Penicillin", "Sulfa drugs"],
  conditions: ["Hypertension", "Type 2 Diabetes"],
  bloodType: "A+"
}

export default function EmergencyPanel() {
  const handleContactCall = (phone: string) => {
    window.location.href = `tel:${phone}`
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">Emergency Information</h2>

      {/* Emergency Contact */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-900">Emergency Contact</h3>
        <div className="mt-3 space-y-2">
          <p className="text-gray-600">{mockEmergencyContact.name}</p>
          <p className="text-sm text-gray-500">{mockEmergencyContact.relationship}</p>
          <button
            onClick={() => handleContactCall(mockEmergencyContact.phone)}
            className="w-full py-2 px-4 bg-blue-50 text-blue-700 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex items-center justify-center"
          >
            <Phone className="w-4 h-4 mr-2" />
            {mockEmergencyContact.phone}
          </button>
        </div>
      </div>

      {/* Important Medical Information */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-900">Medical Information</h3>
        <div className="mt-3 space-y-3">
          <div>
            <p className="text-sm font-medium text-gray-500">Allergies</p>
            <ul className="mt-1 list-disc list-inside text-gray-600">
              {mockMedicalInfo.allergies.map((allergy, index) => (
                <li key={index}>{allergy}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Medical Conditions</p>
            <ul className="mt-1 list-disc list-inside text-gray-600">
              {mockMedicalInfo.conditions.map((condition, index) => (
                <li key={index}>{condition}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Blood Type</p>
            <p className="text-gray-600">{mockMedicalInfo.bloodType}</p>
          </div>
        </div>
      </div>
    </div>
  )
}