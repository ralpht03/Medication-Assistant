"use client"

import { useState } from 'react';
import PageLayout from '@/components/PageLayout';
import AvailableHelpersList from '@/components/AvailableHelpersList';
import PatientInvitationsList from '@/components/PatientInvitationsList';

export default function PatientInvitationsPage() {
  const [hasAcknowledgedDisclaimer, setHasAcknowledgedDisclaimer] = useState(false);

  return (
    <PageLayout userType="patient" title="Manage Helper Invitations">
      {/* HIPAA Compliance Disclaimer */}
      {!hasAcknowledgedDisclaimer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-white/30">
          <div className="max-w-2xl w-full bg-white rounded-lg shadow-xl p-6 m-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">HIPAA Privacy Notice</h2>
            <div className="prose prose-sm">
              <p className="text-red-600 font-semibold mb-4">
                Please read this privacy notice carefully before inviting helpers or accepting invitations.
              </p>
              <div className="space-y-4 text-gray-700">
                <p>
                  By inviting a helper or accepting an invitation, you are granting that person access to your protected health information (PHI), including:
                </p>
                <ul className="list-disc pl-5">
                  <li>Your medication details and schedule</li>
                  <li>Your medication adherence history</li>
                  <li>Your personal health information</li>
                  <li>Other sensitive medical data stored in this application</li>
                </ul>
                <p>
                  Under HIPAA (Health Insurance Portability and Accountability Act), you have the right to:
                </p>
                <ul className="list-disc pl-5">
                  <li>Control who has access to your health information</li>
                  <li>Revoke access at any time</li>
                  <li>Be informed about how your information is being used</li>
                  <li>Request a record of who has accessed your information</li>
                </ul>
                <p>
                  We recommend only inviting trusted individuals who need to help manage your medications.
                </p>
                <p className="font-semibold">
                  By clicking "I Understand and Agree" below, you acknowledge that you have read, understood, and agree to share your protected health information with your selected helpers.
                </p>
              </div>
            </div>
            <button
              onClick={() => setHasAcknowledgedDisclaimer(true)}
              className="mt-6 w-full bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              I Understand and Agree
            </button>
          </div>
        </div>
      )}

      <p className="text-gray-600 mb-6">
        Invite helpers to assist you with managing your medications. Track and manage your sent invitations.
      </p>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <AvailableHelpersList />
        </div>
        
        <div>
          <PatientInvitationsList />
        </div>
      </div>
    </PageLayout>
  );
}