import { NextRequest, NextResponse } from 'next/server';
import { AzureTableService } from '@/lib/azure/table-service';
import { InvitationService } from '@/lib/azure/invitation-service';
import { getSession } from '@/lib/auth';
import { odata } from '@azure/data-tables';

const usersService = new AzureTableService('Users');
const invitationService = new InvitationService();

export async function GET(request: NextRequest) {
  try {
    console.log('Starting available patients fetch...');
    
    // Get authenticated user using the centralized getSession
    const session = await getSession(request);
    console.log('Session:', session);
    
    if (!session || !session.user || session.user.role !== 'admin') {
      console.log('Unauthorized access attempt');
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const adminId = session.user.id || session.user.userId;
    console.log('Admin ID:', adminId);
    
    // Get admin details to check linked patients
    const admin = await usersService.getEntity('admin', adminId as string);
    console.log('Admin entity:', admin);
    
    if (!admin) {
      console.log('Admin not found');
      return NextResponse.json(
        { message: 'Admin not found' },
        { status: 404 }
      );
    }
    
    // Parse linked patients (if any)
    let linkedPatients = [];
    try {
      linkedPatients = admin.linkedPatients ? JSON.parse(admin.linkedPatients as string) : [];
      console.log('Linked patients:', linkedPatients);
    } catch (parseError) {
      console.error('Error parsing linkedPatients:', parseError);
      linkedPatients = [];
    }
    
    // Get all patients with role filter
    console.log('Fetching all patients...');
    const allPatients = await usersService.queryEntities(
      odata`PartitionKey eq 'patient' and role eq 'patient'`
    );
    console.log('All patients count:', allPatients.length);
    console.log('All patients:', allPatients);
    
    // Get pending invitations from this admin
    console.log('Fetching pending invitations from this admin...');
    const pendingInvitations = await invitationService.queryEntities(
      odata`PartitionKey eq 'INVITATION' and status eq 'pending' and inviterUserId eq '${adminId}'`
    );
    console.log('Pending invitations count:', pendingInvitations.length);
    console.log('Pending invitations:', pendingInvitations);
    
    // Create a set of patient IDs with pending invitations from this admin
    const patientsWithPendingInvitations = new Set(
      pendingInvitations
        .filter(inv => inv.inviteeRole === 'patient')
        .map(inv => inv.inviteeUserId)
    );
    console.log('Patients with pending invitations from this admin:', Array.from(patientsWithPendingInvitations));
    
    // Filter out patients that are already linked to this admin or have pending invitations from this admin
    const availablePatients = allPatients.filter(patient => {
      const patientId = patient.rowKey;
      
      if (!patientId) {
        console.log(`Skipping patient with missing ID: ${patient.firstName} ${patient.lastName}`);
        return false;
      }
      
      // Check if patient is linked to this admin
      const isLinked = Array.isArray(linkedPatients) && 
                       linkedPatients.some(id => String(id) === String(patientId));
      
      // Check if patient has a pending invitation from this admin
      const hasPendingInvitation = patientsWithPendingInvitations.has(patientId);
      
      console.log(`Patient ${patient.firstName} ${patient.lastName} (${patientId}):`, {
        isLinked,
        hasPendingInvitation,
        linkedHelpers: patient.linkedHelpers,
        willBeAvailable: !isLinked && !hasPendingInvitation,
        linkedPatients: linkedPatients,
        patientsWithPendingInvitations: Array.from(patientsWithPendingInvitations)
      });
      
      // Patient is available if they are not linked to this admin and don't have a pending invitation from this admin
      return !isLinked && !hasPendingInvitation;
    });
    console.log('Available patients count:', availablePatients.length);
    
    // Format the response
    const formattedPatients = availablePatients.map(patient => ({
      id: patient.rowKey,
      name: `${patient.firstName || ''} ${patient.lastName || ''}`.trim(),
      email: patient.email || ''
    }));
    console.log('Formatted patients:', formattedPatients);

    return NextResponse.json({
      patients: formattedPatients
    });
  } catch (error) {
    console.error('Error fetching available patients:', error);
    return NextResponse.json(
      { 
        message: 'Failed to fetch available patients', 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}