import { NextRequest, NextResponse } from 'next/server';
import { AzureTableService } from '@/lib/azure/table-service';
import { getSession } from '@/lib/auth';

const usersService = new AzureTableService('Users');

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user using the centralized getSession
    const session = await getSession(request);
    if (!session || !session.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const adminId = session.user.id || session.user.userId;
    
    // Get admin details to check linked patients
    const admin = await usersService.getEntity('admin', adminId as string);
    if (!admin) {
      return NextResponse.json(
        { message: 'Admin not found' },
        { status: 404 }
      );
    }
    
    // Parse linked patients (if any)
    let linkedPatients = [];
    try {
      linkedPatients = admin.linkedPatients ? JSON.parse(admin.linkedPatients as string) : [];
    } catch (parseError) {
      console.error('Error parsing linkedPatients:', parseError);
      linkedPatients = [];
    }
    
    // Get all patients
    const allPatients = await usersService.queryEntities("PartitionKey eq 'patient'");
    
    // Filter out patients that are already linked to this admin
    const availablePatients = allPatients.filter(patient => {
      const patientId = patient.rowKey;
      
      if (!patientId) {
        return false; // Skip patients with missing IDs
      }
      
      const isLinked = Array.isArray(linkedPatients) && 
                       linkedPatients.some(id => String(id) === String(patientId));
      
      return !isLinked;
    });
    
    // Format the response
    const formattedPatients = availablePatients.map(patient => ({
      id: patient.rowKey,
      name: `${patient.firstName || ''} ${patient.lastName || ''}`.trim(),
      email: patient.email || ''
    }));

    return NextResponse.json({
      patients: formattedPatients
    });
  } catch (error) {
    console.error('Error fetching available patients:', error);
    return NextResponse.json(
      { message: 'Failed to fetch available patients' },
      { status: 500 }
    );
  }
}