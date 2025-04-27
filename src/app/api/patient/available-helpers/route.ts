import { NextRequest, NextResponse } from 'next/server';
import { AzureTableService } from '@/lib/azure/table-service';
import { getSession } from '@/lib/auth';
import { InvitationService } from '@/lib/azure/invitation-service';

const usersService = new AzureTableService('Users');
const invitationService = new InvitationService();

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user using the centralized getSession
    const session = await getSession(request);
    if (!session || !session.user || session.user.role !== 'patient') {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const patientId = session.user.id || session.user.userId;
    
    // Get patient details to check linked patients
    const patient = await usersService.getEntity('patient', patientId as string);
    if (!patient) {
      return NextResponse.json(
        { message: 'Patient not found' },
        { status: 404 }
      );
    }
    
    // Parse linked helpers (if any)
    let linkedHelpers = [];
    try {
      linkedHelpers = patient.linkedHelpers ? JSON.parse(patient.linkedHelpers as string) : [];
    } catch (parseError) {
      console.error('Error parsing linkedHelpers:', parseError);
      linkedHelpers = [];
    }
    
    // Get all helpers
    const allHelpers = await usersService.queryEntities("PartitionKey eq 'helper'");
    
    // Get pending invitations for this patient
    const pendingInvitations = await invitationService.getInvitationsByInviter(patientId);
    const pendingHelperIds = pendingInvitations
      .filter(inv => inv.status === 'pending')
      .map(inv => inv.inviteeEmail);
    
    // Filter out helpers that are already linked to this patient or have pending invitations
    const availableHelpers = allHelpers.filter(helper => {
      const helperId = helper.rowKey;
      
      if (!helperId) {
        return false; // Skip helpers with missing IDs
      }
      
      const isLinked = Array.isArray(linkedHelpers) && 
                       linkedHelpers.some(id => String(id) === String(helperId));
      
      const hasPendingInvitation = pendingHelperIds.includes(helper.email as string);
      
      return !isLinked && !hasPendingInvitation;
    });
    
    // Format the response
    const formattedHelpers = availableHelpers.map(helper => ({
      id: helper.rowKey,
      name: `${helper.firstName || ''} ${helper.lastName || ''}`.trim(),
      email: helper.email || ''
    }));

    return NextResponse.json({
      helpers: formattedHelpers
    });
  } catch (error) {
    console.error('Error fetching available helpers:', error);
    return NextResponse.json(
      { message: 'Failed to fetch available helpers' },
      { status: 500 }
    );
  }
}