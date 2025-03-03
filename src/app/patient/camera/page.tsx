"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Camera } from 'lucide-react';
import PillIdentification from '@/components/PillIdentification';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';

export default function CameraPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate initialization delay
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8 ml-64">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-3xl font-bold">Pill Identification</h1>
              <button
                onClick={() => router.back()}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Back to Dashboard
              </button>
            </div>
            
            {isLoading ? (
              <div className="bg-white rounded-lg shadow-md p-12">
                <div className="flex flex-col items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                  <p className="text-gray-600">Initializing camera...</p>
                </div>
              </div>
            ) : (
              <PillIdentification />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
