import InvitationForm from '@/components/InvitationForm';
import InvitationList from '@/components/InvitationList';
import PageLayout from '@/components/PageLayout';

export default function AdminInvitationsPage() {
  return (
    <PageLayout userType="admin" title="Manage Invitations">
      <p className="text-gray-600 mb-6">
        Invite patients to join the medication management system. Track and manage your sent invitations.
      </p>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-1 order-2 lg:order-1">
          <InvitationForm inviteeRole="patient" />
        </div>
        
        <div className="lg:col-span-2 order-1 lg:order-2 mb-6 lg:mb-0">
          <InvitationList />
        </div>
      </div>
    </PageLayout>
  );
}