import { NextRequest, NextResponse } from 'next/server';
import { InvitationService } from '@/lib/azure/invitation-service';
import { AzureTableService } from '@/lib/azure/table-service';
import { getSession } from '@/lib/auth';
import { TableClient, odata } from '@azure/data-tables';

const invitationService = new InvitationService();
const usersService = new AzureTableService('Users');

// Initialize TableClient for Users table
function createTableClient(tableName: string): TableClient {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error('Azure Storage connection string must be provided in the environment variables.');
  }

  try {
    return TableClient.fromConnectionString(
      connectionString as string,
      tableName
    );
  } catch (error) {
    console.error(`Error initializing TableClient for ${tableName}:`, error);
    throw new Error(`Failed to initialize Azure Table Storage client for ${tableName}`);
  }
}

const usersTableClient = createTableClient('Users');

export async function POST(request: NextRequest) {
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
    const invitation = await invitationService.getInvitationByRowKey(invitationId);
    if (!invitation) {
      return NextResponse.json(
        { message: 'Invitation not found' },
        { status: 404 }
      );
    }

    // Verify invitation is for this helper
    if (invitation.inviteeEmail !== helperEmail) {
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
      
      // Link patient to helper
      const patientId = invitation.inviterUserId as string;
      
      // Get patient using the correct partition key
      const patientFilter = odata`PartitionKey eq 'patient' and RowKey eq ${patientId}`;
      let patientUser = null;
      
      try {
        const patientEntities = usersTableClient.listEntities({ queryOptions: { filter: patientFilter } });
        
        for await (const entity of patientEntities) {
          patientUser = entity;
          break;
        }
      } catch (error) {
        console.error(`Error finding patient ${patientId}:`, error);
        return NextResponse.json({ error: 'Failed to find patient' }, { status: 404 });
      }

      if (!patientUser) {
        return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
      }
      
      // Update patient's linkedHelpers array
      const linkedHelpers = patientUser.linkedHelpers ? JSON.parse(patientUser.linkedHelpers as string) : [];
      if (!linkedHelpers.includes(helperId)) {
        linkedHelpers.push(helperId);
        await usersTableClient.updateEntity({
          partitionKey: 'patient',
          rowKey: patientId,
          linkedHelpers: JSON.stringify(linkedHelpers)
        }, "Merge");
      }
      
      // Update helper's linkedPatients array
      const linkedPatients = helperUser.linkedPatients ? JSON.parse(helperUser.linkedPatients as string) : [];
      if (!linkedPatients.includes(patientId)) {
        linkedPatients.push(patientId);
        const helperUpdate = {
          partitionKey: 'helper',
          rowKey: helperId,
          linkedPatients: JSON.stringify(linkedPatients)
        };
        console.log('Updating helper with:', helperUpdate); // Debug log
        await usersTableClient.updateEntity(helperUpdate, "Merge");
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