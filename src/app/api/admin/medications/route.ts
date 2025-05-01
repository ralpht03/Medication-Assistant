import { NextResponse } from 'next/server';
import { UserService, MedicationService } from '@/lib/azure-tables';
import { TableClient, odata } from '@azure/data-tables';
import { createTableClient } from '@/lib/azure-tables';

// Initialize services
let userService: UserService;
let medicationService: MedicationService;
let usersTableClient: TableClient;

try {
  userService = new UserService();
  medicationService = new MedicationService();
  usersTableClient = createTableClient('Users');
} catch (error) {
  console.error('Error initializing services:', error);
}

export async function GET(request: Request) {
  try {
    // Get the admin ID from the request headers
    const userStr = request.headers.get('user');
    
    if (!userStr) {
      return NextResponse.json(
        { error: 'User not authenticated', details: 'No user data found in headers' },
        { status: 401 }
      );
    }
    
    let user;
    try {
      user = JSON.parse(userStr);
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid user data', details: 'Failed to parse user data' },
        { status: 400 }
      );
    }
    
    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized', details: 'User is not an admin' },
        { status: 403 }
      );
    }

    // Fetch all patients
    const filter = odata`PartitionKey eq 'patient'`;
    const patients = [];
    for await (const patient of usersTableClient.listEntities({ queryOptions: { filter } })) {
      patients.push({
        id: patient.rowKey,
        name: `${patient.firstName} ${patient.lastName}`
      });
    }

    if (patients.length === 0) {
      return NextResponse.json([]);
    }
    
    // Fetch medications for each patient
    const patientMedications = await Promise.all(
      patients
        .filter(patient => patient.id) // Only process patients with valid IDs
        .map(async (patient) => {
          try {
            const medications = await medicationService.getMedications(patient.id!);
            return {
              patientId: patient.id,
              patientName: patient.name,
              medications: medications || []
            };
          } catch (error) {
            console.error(`Error fetching medications for patient ${patient.id}:`, error);
            return {
              patientId: patient.id,
              patientName: patient.name,
              medications: []
            };
          }
        })
    );

    // Filter out patients with no medications
    const filteredResults = patientMedications.filter(
      result => result.medications && result.medications.length > 0
    );
    
    return NextResponse.json(filteredResults);
  } catch (error) {
    console.error('Error in GET /api/admin/medications:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch medications',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
} 