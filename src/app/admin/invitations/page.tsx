import PageLayout from '@/components/PageLayout';
import AvailablePatientsList from '@/components/AvailablePatientsList';
import InvitationList from '@/components/InvitationList';

export default function AdminInvitationsPage() {
  return (
    <PageLayout userType="admin" title="Manage Patient Invitations">
      <p className="text-gray-600 mb-6">
        Invite patients to join your care network. Track and manage your sent invitations.
      </p>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <AvailablePatientsList />
        </div>
        
        <div>
          <InvitationList />
        </div>
      </div>
    </PageLayout>
  );
}