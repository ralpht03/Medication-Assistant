import PageLayout from '@/components/PageLayout';
import AvailableHelpersList from '@/components/AvailableHelpersList';
import PatientInvitationsList from '@/components/PatientInvitationsList';

export default function PatientInvitationsPage() {
  return (
    <PageLayout userType="patient" title="Manage Helper Invitations">
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