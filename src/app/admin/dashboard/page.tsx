"use client"

import AdminDashboardOverview from "@/components/AdminDashboardOverview"
import PatientListTable from "@/components/PatientListTable"
import PageLayout from "@/components/PageLayout"

export default function AdminDashboard() {
  return (
    <PageLayout userType="admin" title="Patient Management">
      <p className="mt-1 text-sm text-gray-600 mb-6">
        Monitor and manage patient medications
      </p>

      {/* Compact Overview Cards */}
      <div className="mb-6">
        <AdminDashboardOverview />
      </div>

      {/* Patient List Table (full width) */}
      <div>
        <PatientListTable />
      </div>
    </PageLayout>
  )
}