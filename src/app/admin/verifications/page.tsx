"use client";

import { useState, useEffect } from 'react';
import PageLayout from '@/components/PageLayout';
import { CheckSquare, AlertCircle, Filter, Search } from 'lucide-react';

interface Verification {
  id: string;
  patientId: string;
  patientName: string;
  medicationId: string;
  medicationName: string;
  verificationMethod: 'manual-entry' | 'live-feed' | 'patient-helper';
  status: 'successful' | 'failed' | 'bypassed';
  verifiedAt: string;
  notes?: string;
  verifiedBy?: string;
  timeTaken?: string;
}

export default function AdminVerificationsPage() {
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    method: '',
  });

  useEffect(() => {
    const fetchVerifications = async () => {
      try {
        const response = await fetch('/api/admin/verifications');
        if (!response.ok) {
          throw new Error('Failed to fetch verifications');
        }
        const data = await response.json();
        setVerifications(data.verifications || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch verifications');
      } finally {
        setIsLoading(false);
      }
    };

    fetchVerifications();
  }, []);

  const filteredVerifications = verifications.filter(verification => {
    if (!verification.medicationName) {
      return false;
    }

    const matchesSearch = 
      (verification.patientName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (verification.medicationName?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    const matchesStatus = !filters.status || verification.status === filters.status;
    const matchesMethod = !filters.method || verification.verificationMethod === filters.method;

    return matchesSearch && matchesStatus && matchesMethod;
  });

  if (isLoading) {
    return (
      <PageLayout userType="admin" title="Verifications">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout userType="admin" title="Verifications">
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
          <div className="flex">
            <AlertCircle className="h-5 w-5 mr-2" />
            <p>{error}</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout userType="admin" title="Verifications">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800">Verification Records</h2>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center px-4 py-2 bg-white border rounded-md hover:bg-gray-50"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 p-4 bg-white rounded-lg shadow">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value as any })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                >
                  <option value="">All</option>
                  <option value="successful">Successful</option>
                  <option value="failed">Failed</option>
                  <option value="bypassed">Bypassed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Method</label>
                <select
                  value={filters.method}
                  onChange={(e) => setFilters({ ...filters, method: e.target.value as any })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                >
                  <option value="">All</option>
                  <option value="manual-entry">Manual Entry</option>
                  <option value="live-feed">Live Feed</option>
                  <option value="patient-helper">Patient Helper</option>
                </select>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by patient or medication..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Patient
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Medication
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Method
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Verified At
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Verified By
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredVerifications.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  No verifications found
                </td>
              </tr>
            ) : (
              filteredVerifications.map((verification) => (
                <tr key={verification.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {verification.patientName || 'Unknown Patient'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {verification.medicationName}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {(verification.verificationMethod || '').replace(/-/g, ' ')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        verification.status === 'successful'
                          ? 'bg-green-100 text-green-800'
                          : verification.status === 'failed'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {verification.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {verification.timeTaken ? new Date(verification.timeTaken).toLocaleString() : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {verification.verifiedBy || '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </PageLayout>
  );
} 