"use client";

import { useState } from 'react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { Pill } from 'lucide-react';

export default function MedicationsPage() {
  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8 ml-64">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold mb-8">My Medications</h1>
            
            <div className="bg-white rounded-lg shadow-md p-8">
              <div className="text-center py-12">
                <Pill className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">No Medications Found</h3>
                <p className="mt-2 text-sm text-gray-500">
                  Your prescribed medications will appear here once they are added by your healthcare provider.
                </p>
                <div className="mt-6">
                  <button
                    type="button"
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    onClick={() => alert('This feature will be available soon!')}
                  >
                    Contact Provider
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
