"use client"

import AdminSidebar from "@/components/AdminSidebar"
import AdminDashboardOverview from "@/components/AdminDashboardOverview"
import PatientListTable from "@/components/PatientListTable"
import AdminHeader from "@/components/AdminHeader"

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <AdminHeader unreadNotifications={5} />

      <div className="flex pt-16"> {/* Add padding-top to account for fixed header */}
        {/* Sidebar */}
        <AdminSidebar />

        {/* Main Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto ml-64 p-6">
          <div className="container mx-auto">
            {/* Page Header */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Patient Management</h1>
              <p className="mt-1 text-sm text-gray-600">
                Monitor and manage patient medications
              </p>
            </div>

            {/* Compact Overview Cards */}
            <div className="mb-6">
              <AdminDashboardOverview />
            </div>

            {/* Patient List Table (full width) */}
            <div>
              <PatientListTable />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}