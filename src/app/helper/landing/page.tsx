"use client";

import { useRouter } from 'next/navigation';
import HelperInvitationsList from '@/components/HelperInvitationsList';

export default function HelperLandingPage() {
  const router = useRouter();

  const handlePatientClick = (patientId: string) => {
    // Navigate to the helper dashboard for the selected patient
    router.push(`/helper/dashboard/${patientId}`);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  return (
    <div className="bg-gray-50 min-h-screen p-6 flex flex-col justify-between">
      <div>
        <h1 className="text-2xl font-bold mb-6">Helper Invitations</h1>
        <HelperInvitationsList />
      </div>
      <div className="mt-8">
        <button
          onClick={handleLogout}
          className="w-full px-4 py-2 text-sm text-white bg-red-500 hover:bg-red-600 rounded-lg"
        >
          Logout
        </button>
      </div>
    </div>
  );
}