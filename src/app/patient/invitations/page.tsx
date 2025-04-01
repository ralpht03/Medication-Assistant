import PageLayout from '@/components/PageLayout';
import PatientInvitationsList from '@/components/PatientInvitationsList';

export default function PatientInvitationsPage() {
  return (
    <PageLayout userType="patient" title="Admin Invitations">
      <p className="text-gray-600 mb-6">
        View and respond to invitations from administrators who want to help manage your medications.
      </p>
      
      <PatientInvitationsList />
    </PageLayout>
  );
}