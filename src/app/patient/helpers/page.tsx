"use client";

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import PageLayout from '@/components/PageLayout';
import { Trash2 } from 'lucide-react';

interface Helper {
  id: string;
  name: string;
  email: string;
}

export default function PatientHelpersPage() {
  const [helpers, setHelpers] = useState<Helper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingHelper, setRemovingHelper] = useState<string | null>(null);

  useEffect(() => {
    fetchHelpers();
  }, []);

  const fetchHelpers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/patient/helpers');
      const data = await response.json();
      
      if (response.ok) {
        setHelpers(data.helpers);
      } else {
        setError(data.message || 'Failed to fetch helpers');
      }
    } catch (error) {
      setError('Failed to fetch helpers');
      console.error('Error fetching helpers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveHelper = async (helperId: string) => {
    if (!confirm('Are you sure you want to remove this helper? This will revoke their access to your information.')) {
      return;
    }

    try {
      setRemovingHelper(helperId);
      // Optimistically update the UI
      setHelpers(prevHelpers => prevHelpers.filter(helper => helper.id !== helperId));
      
      const response = await fetch('/api/patient/helpers', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ helperId }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        // If the deletion failed, revert the UI state
        toast.error(data.message || 'Failed to remove helper');
        // Refresh the list to get the correct state
        await fetchHelpers();
      } else {
        toast.success('Helper removed successfully');
      }
    } catch (error) {
      // If there was an error, revert the UI state
      toast.error('Failed to remove helper');
      // Refresh the list to get the correct state
      await fetchHelpers();
    } finally {
      setRemovingHelper(null);
    }
  };

  return (
    <PageLayout userType="patient" title="Manage Helpers">
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : helpers.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">You don't have any helpers yet</p>
          <p className="text-sm text-gray-400 mt-1">
            You can invite helpers from the "Invitations" page
          </p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {helpers.map((helper) => (
              <li key={helper.id} className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {helper.name}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {helper.email}
                    </p>
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <button
                      onClick={() => handleRemoveHelper(helper.id)}
                      disabled={removingHelper === helper.id}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                    >
                      {removingHelper === helper.id ? (
                        'Removing...'
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 mr-1" />
                          Remove
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </PageLayout>
  );
} 