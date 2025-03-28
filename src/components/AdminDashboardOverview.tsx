import React from 'react';
import { Users, AlertCircle, Calendar, TrendingUp } from 'lucide-react';

interface DashboardStats {
  totalPatients: number;
  pendingAlerts: number;
  todaySchedule: number;
  adherenceRate: number;
}

interface AdminDashboardOverviewProps {
  stats: DashboardStats;
  loading: boolean;
}

export default function AdminDashboardOverview({ stats, loading }: AdminDashboardOverviewProps) {
  const { totalPatients, pendingAlerts, todaySchedule, adherenceRate } = stats;
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Patients Card */}
      <div className="bg-white rounded-lg shadow p-4 flex items-center">
        <div className="rounded-full bg-blue-100 p-3 mr-4">
          <Users className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500">Total Patients</p>
          {loading ? (
            <div className="h-6 w-16 bg-gray-200 animate-pulse rounded mt-1"></div>
          ) : (
            <p className="text-2xl font-semibold text-gray-900">{totalPatients}</p>
          )}
        </div>
      </div>

      {/* Pending Alerts Card */}
      <div className="bg-white rounded-lg shadow p-4 flex items-center">
        <div className="rounded-full bg-red-100 p-3 mr-4">
          <AlertCircle className="h-6 w-6 text-red-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500">Pending Alerts</p>
          {loading ? (
            <div className="h-6 w-16 bg-gray-200 animate-pulse rounded mt-1"></div>
          ) : (
            <p className="text-2xl font-semibold text-gray-900">{pendingAlerts}</p>
          )}
        </div>
      </div>

      {/* Today's Schedule Card */}
      <div className="bg-white rounded-lg shadow p-4 flex items-center">
        <div className="rounded-full bg-green-100 p-3 mr-4">
          <Calendar className="h-6 w-6 text-green-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500">Today's Schedule</p>
          {loading ? (
            <div className="h-6 w-16 bg-gray-200 animate-pulse rounded mt-1"></div>
          ) : (
            <p className="text-2xl font-semibold text-gray-900">{todaySchedule}</p>
          )}
        </div>
      </div>

      {/* Adherence Rate Card */}
      <div className="bg-white rounded-lg shadow p-4 flex items-center">
        <div className="rounded-full bg-purple-100 p-3 mr-4">
          <TrendingUp className="h-6 w-6 text-purple-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500">Adherence Rate</p>
          {loading ? (
            <div className="h-6 w-16 bg-gray-200 animate-pulse rounded mt-1"></div>
          ) : (
            <div className="flex items-center">
              <p className="text-2xl font-semibold text-gray-900">{adherenceRate}%</p>
              {/* Optional: Add a visual indicator for adherence rate */}
              <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full" 
                  style={{ width: `${adherenceRate}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}