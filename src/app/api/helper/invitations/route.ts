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
    
    // Get all invitations for this helper
    const invitations = await invitationService.getInvitationsByInvitee(helperEmail);

    // Get linked patients from helper's record
    const linkedPatients = JSON.parse((helperUser.linkedPatients as string) || '[]');
    
    // Get patient details for linked patients
    const linkedPatientsDetails = await Promise.all(linkedPatients.map(async (patientId: string) => {
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
        return null;
      }

      if (!patientUser) {
        console.error(`Patient ${patientId} not found`);
        return null;
      }
      
      return {
        id: patientId,
        name: `${patientUser.firstName} ${patientUser.lastName}`,
        email: patientUser.email
      };
    }));

    // Filter out any null entries from failed patient lookups
    const validLinkedPatients = linkedPatientsDetails.filter(patient => patient !== null);

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
      // Get patient using the correct partition key
      const patientFilter = odata`PartitionKey eq 'patient' and RowKey eq ${inv.inviterUserId}`;
      let patientUser = null;
      
      try {
        const patientEntities = usersTableClient.listEntities({ queryOptions: { filter: patientFilter } });
        
        for await (const entity of patientEntities) {
          patientUser = entity;
          break;
        }
      } catch (error) {
        console.error(`Error finding patient ${inv.inviterUserId}:`, error);
        return null;
      }

      if (!patientUser) {
        console.error(`Patient ${inv.inviterUserId} not found`);
        return null;
      }
      
      return {
        id: inv.rowKey,
        patientId: inv.inviterUserId,
        patientName: `${patientUser.firstName} ${patientUser.lastName}`,
        message: inv.message,
        createdAt: inv.createdAt,
        expiresAt: inv.expiresAt,
        token: inv.token
      };
    }));

    // Filter out any null entries from failed patient lookups
    const validInvitations = formattedInvitations.filter(inv => inv !== null);

    return NextResponse.json({
      invitations: validInvitations,
      linkedPatients: validLinkedPatients
    });
  } catch (error) {
    console.error('Error fetching helper invitations:', error);
    return NextResponse.json(
      { message: 'Failed to fetch invitations' },
      { status: 500 }
    );
  }
}