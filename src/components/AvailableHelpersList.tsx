// src/components/AvailableHelpersList.tsx
"use client";

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

interface Helper {
  id: string;
  name: string;
  email: string;
}

export default function AvailableHelpersList() {
  const [helpers, setHelpers] = useState<Helper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviting, setInviting] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    fetchAvailableHelpers();
  }, []);
  
  const fetchAvailableHelpers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/patient/available-helpers');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch available helpers');
      }
      
      const data = await response.json();
      setHelpers(data.helpers || []);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching available helpers:', err);
      setError(err.message || 'Failed to fetch available helpers');
      toast.error('Failed to load available helpers');
    } finally {
      setLoading(false);
    }
  };
  
  const handleInvite = async (helperId: string) => {
    try {
      setInviting(helperId);
      
      const response = await fetch('/api/patient/invite-helper', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          helperId,
          message: messages[helperId] || ''
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to send invitation');
      }
      
      toast.success('Invitation sent successfully');
      
      // Remove the invited helper from the list
      setHelpers(helpers.filter(h => h.id !== helperId));
      
      // Clear the message for this helper
      const updatedMessages = { ...messages };
      delete updatedMessages[helperId];
      setMessages(updatedMessages);
    } catch (err: any) {
      console.error('Error sending invitation:', err);
      toast.error(err.message || 'Failed to send invitation');
    } finally {
      setInviting(null);
    }
  };

  // Handle message change for a specific helper
  const handleMessageChange = (helperId: string, message: string) => {
    setMessages(prev => ({
      ...prev,
      [helperId]: message
    }));
  };

  // Filter helpers based on search term
  const filteredHelpers = helpers.filter(helper => 
    helper.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    helper.email.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Generate a unique key for each helper
  const getUniqueKey = (helper: any, index: number) => {
    return helper?.id || `helper-${index}`;
  };
  
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold mb-4">Available Helpers</h2>
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-2 text-gray-500">Loading helpers...</p>
        </div>
      </div>
    );
  }

  // Search input component
  const searchInput = (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
        </svg>
      </div>
      <input
        type="text"
        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Search helpers..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-md">
      <h2 className="text-lg sm:text-xl font-semibold p-4 border-b">Available Helpers</h2>
      
      {/* Search bar */}
      <div className="p-4 border-b">
        {searchInput}
      </div>
      
      {/* No helpers message */}
      {helpers.length === 0 && !loading && (
        <div className="p-4 text-center text-gray-500">
          No available helpers found
        </div>
      )}
      
      {/* No results message */}
      {filteredHelpers.length === 0 && searchTerm && (
        <div className="p-4 text-center text-gray-500">
          No helpers match your search
        </div>
      )}
      
      {/* Helper list */}
      <div className="divide-y divide-gray-200">
        {filteredHelpers.map((helper, index) => (
          <div key={getUniqueKey(helper, index)} className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-medium">{helper.name}</div>
                <div className="text-sm text-gray-500">{helper.email}</div>
              </div>
              
              <button
                onClick={() => handleInvite(helper.id)}
                disabled={inviting === helper.id}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {inviting === helper.id ? 'Sending...' : 'Invite'}
              </button>
            </div>
            
            <div className="mt-3">
              <textarea
                placeholder="Add a personal message (optional)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                value={messages[helper.id] || ''}
                onChange={(e) => handleMessageChange(helper.id, e.target.value)}
              ></textarea>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}