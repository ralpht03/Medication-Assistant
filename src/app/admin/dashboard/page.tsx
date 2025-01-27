"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function AdminDashboard() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Medicine Administrator Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Patient Management Card */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Patient Management</h2>
          <p className="text-gray-600 mb-4">Manage patient profiles and medications</p>
          <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
            View Patients
          </button>
        </div>

        {/* Prescription Management Card */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Prescriptions</h2>
          <p className="text-gray-600 mb-4">Update and monitor medication prescriptions</p>
          <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
            Manage Prescriptions
          </button>
        </div>

        {/* Adherence Monitoring Card */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Adherence Monitoring</h2>
          <p className="text-gray-600 mb-4">Track patient medication adherence</p>
          <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
            View Reports
          </button>
        </div>
      </div>
    </div>
  )
}