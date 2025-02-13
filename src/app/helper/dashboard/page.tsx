"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function HelperDashboard() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Patient Helper Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Patient Overview Card */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Patient Overview</h2>
          <p className="text-gray-600 mb-4">View patient medication schedules and history</p>
          <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
            View Details
          </button>
        </div>

        {/* Adherence Tracking Card */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Adherence Tracking</h2>
          <p className="text-gray-600 mb-4">Monitor medication adherence progress</p>
          <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
            View Adherence
          </button>
        </div>

        {/* Alerts & Notifications Card */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Alerts</h2>
          <p className="text-gray-600 mb-4">View medication alerts and reminders</p>
          <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
            Check Alerts
          </button>
        </div>
      </div>
    </div>
  )
}