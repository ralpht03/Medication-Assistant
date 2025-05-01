import { NextRequest, NextResponse } from 'next/server';
import { InvitationService } from '@/lib/azure/invitation-service';
import { AzureTableService } from '@/lib/azure/table-service';
import { getSession } from '@/lib/auth';


export async function POST(request: NextRequest) {
  const invitationService = new InvitationService();
  const usersService = new AzureTableService('Users');
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
    const patientEmail = session.user.email;
    
    // Get request body
    const body = await request.json();
    console.log('Received request body:', body);
    const { invitationId, action } = body;

    // Validate input
    if (!invitationId || !action) {
      console.log('Missing fields - invitationId:', invitationId, 'action:', action);
      return NextResponse.json(
        { message: 'Invitation ID and action are required' },
        { status: 400 }
      );
    }

    if (action !== 'accept' && action !== 'decline') {
      return NextResponse.json(
        { message: 'Action must be either "accept" or "decline"' },
        { status: 400 }
      );
    }

    // Get invitation
    const invitation = await invitationService.getInvitationByRowKey(invitationId) as {
      inviterUserId: string;
      inviteeEmail: string;
      inviteeUserId?: string;
      status: string;
    };
    if (!invitation) {
      return NextResponse.json(
        { message: 'Invitation not found' },
        { status: 404 }
      );
    }

    // Verify invitation is for this patient
    if (invitation.inviteeEmail !== patientEmail || (invitation.inviteeUserId && invitation.inviteeUserId !== patientId)) {
      return NextResponse.json(
        { message: 'This invitation is not for you' },
        { status: 403 }
      );
    }

    // Verify invitation is pending
    if (invitation.status !== 'pending') {
      return NextResponse.json(
        { message: 'This invitation has already been processed' },
        { status: 409 }
      );
    }

    // Process invitation
    if (action === 'accept') {

      // log the invitation
      console.log('Invitation:', invitation);
      console.log('Invitation ID:', invitationId);
      // Update invitation status
      await invitationService.updateInvitationStatus(invitationId, 'accepted');
      
      // Link admin to patient
      const adminId = invitation.inviterUserId as string;
      const admin = await usersService.getEntity('admin', adminId);
      
      // Update admin's linkedPatients array
      const linkedPatients = admin.linkedPatients ? JSON.parse(admin.linkedPatients as string) : [];
      if (!linkedPatients.includes(patientId)) {
        linkedPatients.push(patientId);
        await usersService.updateEntity({
          partitionKey: 'admin',
          rowKey: adminId,
          linkedPatients: JSON.stringify(linkedPatients)
        }, "Merge");
      }
      
      return NextResponse.json({
        message: 'Invitation accepted successfully'
      });
    } else if (action === 'decline') {
      // Update invitation status
      await invitationService.updateInvitationStatus(invitationId, 'declined');
      
      return NextResponse.json({
        message: 'Invitation declined successfully'
      });
    }
  } catch (error) {
    console.error('Error responding to invitation:', error);
    return NextResponse.json(
      { message: 'Failed to process invitation response' },
      { status: 500 }
    );
  }
}