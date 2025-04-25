"use client"

import React, { useState, useEffect } from 'react';
import AdminDashboardOverview from "@/components/AdminDashboardOverview";
import PatientListTable from "@/components/PatientListTable";
import PageLayout from "@/components/PageLayout";
import AdminPrescriptionUpload from "@/components/AdminPrescriptionUpload";
import { Users, FileText, Upload } from "lucide-react";
import { toast } from 'react-hot-toast';

interface DashboardStats {
  totalPatients: number;
  pendingAlerts: number;
  todaySchedule: number;
  adherenceRate: number;
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'patients' | 'prescriptions'>('patients');
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState<DashboardStats>({
    totalPatients: 0,
    pendingAlerts: 0,
    todaySchedule: 0,
    adherenceRate: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      
      // Get admin ID from localStorage
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        throw new Error('User not found in localStorage');
      }

      const user = JSON.parse(userStr);
      const adminId = user.id || user.rowKey;

      // Fetch all required data in parallel
      const [patientsResponse, alertsResponse] = await Promise.all([
        fetch(`/api/admin/patients?adminId=${adminId}`),
        fetch(`/api/alerts?userId=${adminId}&role=admin&status=unread`)
      ]);

      if (!patientsResponse.ok || !alertsResponse.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const [patientsData, alertsData] = await Promise.all([
        patientsResponse.json(),
        alertsResponse.json()
      ]);

      const patients = patientsData.patients || [];
      const alerts = alertsData || [];
      
      // Calculate dashboard stats
      const totalPatients = patients.length;
      const pendingAlerts = alerts.length;
      
      // Count medications scheduled for today
      const today = new Date().toLocaleDateString();
      const todaySchedule = patients.reduce((count: number, patient: any) => {
        return count + (patient.currentMedications?.length > 0 ? 1 : 0);
      }, 0);
      
      // Calculate average adherence rate
      const adherenceRate = patients.length > 0 
        ? Math.round(patients.reduce((sum: number, patient: any) => sum + (patient.adherenceRate || 0), 0) / patients.length) 
        : 0;
      
      setStats({
        totalPatients,
        pendingAlerts,
        todaySchedule,
        adherenceRate
      });
      
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      toast.error('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout userType="admin" title="Patient Management">
      <p className="mt-1 text-sm text-gray-600 mb-6">
        Monitor and manage patient medications
      </p>

      {/* Compact Overview Cards with real data */}
      <div className="mb-6">
        <AdminDashboardOverview 
          stats={stats}
          loading={loading}
        />
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
          <PatientListTable searchTerm={searchTerm} />
        ) : (
          <AdminPrescriptionUpload />
        )}
      </div>
    </PageLayout>
  );
}