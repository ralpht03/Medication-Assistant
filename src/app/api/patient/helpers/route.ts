import { NextResponse } from 'next/server';
import { TableClient, odata } from '@azure/data-tables';

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
const medicationsTableClient = createTableClient('medications');

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');

    if (!patientId) {
      return NextResponse.json({ error: 'Patient ID is required' }, { status: 400 });
    }

    // Get the patient user to retrieve linkedHelpers
    const patientFilter = odata`PartitionKey eq 'USER' and rowKey eq ${patientId}`;
    let patientUser = null;
    
    try {
      const patientEntities = usersTableClient.listEntities({ queryOptions: { filter: patientFilter } });
      for await (const entity of patientEntities) {
        patientUser = entity;
        break;
      }
    } catch (error) {
      console.error('Error fetching patient user:', error);
      return NextResponse.json({ error: 'Failed to fetch patient user' }, { status: 500 });
    }
    
    if (!patientUser) {
      return NextResponse.json({ error: 'Patient user not found' }, { status: 404 });
    }

    // Check if the user is actually a patient
    const role = patientUser.role?.toString().toLowerCase() || '';
    const type = patientUser.type?.toString().toLowerCase() || '';
    
    const isPatient = role.includes('patient') || type.includes('patient');
    
    if (!isPatient) {
      return NextResponse.json({ error: 'User is not a patient' }, { status: 403 });
    }

    // Get the linkedHelpers array
    let linkedHelpers: string[] = [];
    if (patientUser.linkedHelpers) {
      try {
        linkedHelpers = JSON.parse(patientUser.linkedHelpers as string);
      } catch (error) {
        console.error('Error parsing linkedHelpers:', error);
        return NextResponse.json({ error: 'Invalid linkedHelpers format' }, { status: 500 });
      }
    }
    
    if (linkedHelpers.length === 0) {
      return NextResponse.json({ helpers: [] });
    }

    // Fetch details for each linked helper
    const helpers = [];
    for (const helperId of linkedHelpers) {
      const helperFilter = odata`PartitionKey eq 'USER' and rowKey eq ${helperId}`;
      let helperUser = null;
      
      try {
        const helperEntities = usersTableClient.listEntities({ queryOptions: { filter: helperFilter } });
        for await (const entity of helperEntities) {
          helperUser = entity;
          break;
        }
      } catch (error) {
        console.error(`Error fetching helper user ${helperId}:`, error);
        continue;
      }

      if (!helperUser) {
        console.warn(`Helper user ${helperId} not found`);
        continue;
      }

      // Check if the user is actually a helper
      const helperRole = helperUser.role?.toString().toLowerCase() || '';
      const helperType = helperUser.type?.toString().toLowerCase() || '';
      
      const isHelper = helperRole.includes('helper') || helperType.includes('helper');
      
      if (!isHelper) {
        console.warn(`User ${helperId} is not a helper`);
        continue;
      }

      helpers.push({
        id: helperUser.rowKey,
        firstName: helperUser.firstName,
        lastName: helperUser.lastName,
        email: helperUser.email
      });
    }

    return NextResponse.json({ helpers });
  } catch (error) {
    console.error('Error in GET /api/patient/helpers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}