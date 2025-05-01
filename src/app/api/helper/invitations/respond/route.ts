import { NextRequest, NextResponse } from 'next/server';
import { InvitationService } from '@/lib/azure/invitation-service';
import { AzureTableService } from '@/lib/azure/table-service';
import { getSession } from '@/lib/auth';
import { TableClient, odata } from '@azure/data-tables';
import { createHelperAcceptanceNotification } from '@/lib/patient';
import { createTableClient } from '@/lib/azure-table-utils';



export async function POST(request: NextRequest) {

  const invitationService = new InvitationService();
  const usersService = new AzureTableService('Users');

  const usersTableClient = createTableClient('Users');
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
    
    // First, get the helper's ID using their email
    const helperFilter = odata`PartitionKey eq 'helper' and email eq ${helperEmail}`;
    let helperUser = null;
    
    try {
      const helperEntities = usersTableClient.listEntities({ queryOptions: { filter: helperFilter } });
      
      for await (const entity of helperEntities) {
        helperUser = entity;
        break;
      }
    } catch (error) {
      console.error('Error finding helper user:', error);
      return NextResponse.json({ error: 'Failed to find helper user' }, { status: 404 });
    }
    
    if (!helperUser) {
      return NextResponse.json({ error: 'Helper user not found' }, { status: 404 });
    }

    const helperId = helperUser.rowKey as string;
    if (!helperId) {
      return NextResponse.json({ error: 'Helper ID not found' }, { status: 404 });
    }

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

    // Verify invitation is for this helper
    if (invitation.inviteeEmail !== helperEmail || (invitation.inviteeUserId && invitation.inviteeUserId !== helperId)) {
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
      // Update invitation status
      await invitationService.updateInvitationStatus(invitationId, 'accepted');
      
      // Link helper to patient
      const patientId = invitation.inviterUserId;
      const patient = await usersService.getEntity('patient', patientId);
      
      // Update patient's linkedHelpers array
      const linkedHelpers = patient.linkedHelpers ? JSON.parse(patient.linkedHelpers as string) : [];
      if (!linkedHelpers.includes(helperId)) {
        linkedHelpers.push(helperId);
        await usersService.updateEntity({
          partitionKey: 'patient',
          rowKey: patientId,
          linkedHelpers: JSON.stringify(linkedHelpers)
        }, "Merge");
      }

      // Update helper's linkedPatients array
      const linkedPatients = helperUser.linkedPatients ? JSON.parse(helperUser.linkedPatients as string) : [];
      if (!linkedPatients.includes(patientId)) {
        linkedPatients.push(patientId);
        await usersService.updateEntity({
          partitionKey: 'helper',
          rowKey: helperId,
          linkedPatients: JSON.stringify(linkedPatients)
        }, "Merge");
      }

      // Create notification for patient
      console.log('Creating notification for patient:', {
        patientId,
        helperName: `${helperUser.firstName} ${helperUser.lastName}`,
        status: 'accepted',
        helperId
      });
      await createHelperAcceptanceNotification(patientId, `${helperUser.firstName} ${helperUser.lastName}`, 'accepted', helperId);
      console.log('Notification created successfully');
      
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