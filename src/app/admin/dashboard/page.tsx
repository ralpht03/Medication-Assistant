"use client"

import React, { useState } from 'react';
import AdminDashboardOverview from "@/components/AdminDashboardOverview";
import PatientListTable from "@/components/PatientListTable";
import PageLayout from "@/components/PageLayout";
import AdminPrescriptionUpload from "@/components/AdminPrescriptionUpload";
import { Users, FileText, Upload } from "lucide-react";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'patients' | 'prescriptions'>('patients');

  return (
    <PageLayout userType="admin" title="Patient Management">
      <p className="mt-1 text-sm text-gray-600 mb-6">
        Monitor and manage patient medications
      </p>

      {/* Compact Overview Cards */}
      <div className="mb-6">
        <AdminDashboardOverview />
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('patients')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'patients'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
            `}
          >
            <div className="flex items-center">
              <Users className="mr-2 h-5 w-5" />
              Patients
            </div>
          </button>

          <button
            onClick={() => setActiveTab('prescriptions')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'prescriptions'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
            `}
          >
            <div className="flex items-center">
              <Upload className="mr-2 h-5 w-5" />
              Prescription Upload
            </div>
          </button>
        </nav>
      </div>

      {/* Active Tab Content */}
      <div>
        {activeTab === 'patients' ? (
          <PatientListTable />
        ) : (
          <AdminPrescriptionUpload />
        )}
      </div>
    </PageLayout>
  );
}