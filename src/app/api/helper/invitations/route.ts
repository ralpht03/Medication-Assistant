import { NextRequest, NextResponse } from 'next/server';
import { InvitationService } from '@/lib/azure/invitation-service';
import { AzureTableService } from '@/lib/azure/table-service';
import { getSession } from '@/lib/auth';

const invitationService = new InvitationService();
const usersService = new AzureTableService('Users');

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user using the centralized getSession
    const session = await getSession(request);
    if (!session || !session.user || session.user.role !== 'helper') {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const helperEmail = session.user.email;
    
    // Get all invitations for this helper
    const invitations = await invitationService.getInvitationsByInvitee(helperEmail);

    // if there are no invitations, return an empty array
    if (invitations.length === 0) {
      return NextResponse.json({
        invitations: []
      });
    }

    // Create a map to track accepted invitations by patientId
    const acceptedInvitationsMap = new Map();
    
    // First pass: identify all accepted invitations
    invitations.forEach(inv => {
      if (inv.status === 'accepted') {
        acceptedInvitationsMap.set(inv.inviterUserId, true);
      }
    });

    // Filter invitations:
    // 1. Must be pending
    // 2. Must be from an patient
    // 3. Must not have an accepted invitation from the same patient
    const pendingInvitations = invitations.filter(inv => 
      inv.status === 'pending' && 
      inv.inviterRole === 'patient' &&
      !acceptedInvitationsMap.has(inv.inviterUserId)
    );
    
    // Get patient details for each invitation
    const formattedInvitations = await Promise.all(pendingInvitations.map(async (inv) => {
      const patient = await usersService.getEntity('patient', inv.inviterUserId as string);
      
      return {
        id: inv.rowKey,
        patientId: inv.inviterUserId,
        patientName: `${patient.firstName} ${patient.lastName}`,
        message: inv.message,
        createdAt: inv.createdAt,
        expiresAt: inv.expiresAt,
        token: inv.token
      };
    }));

    return NextResponse.json({
      invitations: formattedInvitations
    });
  } catch (error) {
    console.error('Error fetching helper invitations:', error);
    return NextResponse.json(
      { message: 'Failed to fetch invitations' },
      { status: 500 }
    );
  }
}