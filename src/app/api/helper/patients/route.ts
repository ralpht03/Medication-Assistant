import { NextRequest, NextResponse } from 'next/server';
import { TableClient, odata } from '@azure/data-tables';
import { getSession } from '@/lib/auth';
import { createTableClient } from '@/lib/azure-table-utils';

const usersTableClient = createTableClient('Users');
const medicationsTableClient = createTableClient('medications');
const verificationLogsTableClient = createTableClient('verificationLogs');

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

    // Get the linkedPatients array
    let linkedPatients: string[] = [];
    if (helperUser.linkedPatients) {
      try {
        linkedPatients = JSON.parse(helperUser.linkedPatients as string);
        console.log('Successfully parsed linkedPatients:', linkedPatients);
      } catch (error) {
        console.error('Error parsing linkedPatients:', error);
        return NextResponse.json({ error: 'Invalid linkedPatients format' }, { status: 500 });
      }
    }

    if (linkedPatients.length === 0) {
      return NextResponse.json({ patients: [] });
    }

    // Fetch details for each linked patient
    const patients = [];
    for (const patientId of linkedPatients) {
      // Get patient user details using the correct partition key
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
        continue;
      }

      if (!patientUser) {
        console.error(`Patient ${patientId} not found`);
        continue;
      }

      // Get patient's medications
      const medicationFilter = odata`PartitionKey eq '${patientId}'`;
      const medications = [];
      
      try {
        const medicationEntities = medicationsTableClient.listEntities({ queryOptions: { filter: medicationFilter } });
        
        for await (const entity of medicationEntities) {
          medications.push(entity);
        }
      } catch (error) {
        console.error(`Error fetching medications for patient ${patientId}:`, error);
      }

      // Calculate adherence rate using verification logs
      let adherenceRate = 0;
      try {
        // Get verification logs for the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const filter = odata`PartitionKey eq '${patientId}' and Timestamp ge datetime'${thirtyDaysAgo.toISOString()}'`;
        const verificationLogs = [];
        
        for await (const log of verificationLogsTableClient.listEntities({ queryOptions: { filter } })) {
          verificationLogs.push(log);
        }

        // Calculate adherence metrics
        const totalVerifications = verificationLogs.length;
        const successfulVerifications = verificationLogs.filter(log => log.status === 'taken').length;
        const correctDoseVerifications = verificationLogs.filter(log => log.status === 'taken' && log.isCorrectDose).length;
        
        // Calculate adherence percentage based on correct dosage
        adherenceRate = totalVerifications > 0 
          ? Math.round((correctDoseVerifications / totalVerifications) * 100)
          : 0;

        console.log('Adherence calculation:', {
          patientId,
          totalVerifications,
          successfulVerifications,
          correctDoseVerifications,
          adherenceRate
        });
      } catch (error) {
        console.error(`Error calculating adherence for patient ${patientId}:`, error);
      }

      patients.push({
        id: patientUser.rowKey,
        name: `${patientUser.firstName} ${patientUser.lastName}`,
        email: patientUser.email,
        adherencePercentage: adherenceRate,
        profilePictureUrl: patientUser.profilePictureUrl
      });
    }

    return NextResponse.json({ patients });
  } catch (error) {
    console.error('Error in GET /api/helper/patients:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to calculate adherence rate
function calculateAdherenceRate(medications: any[]): number {
  if (medications.length === 0) return 0;
  
  const totalDoses = medications.reduce((sum, med) => sum + (med.dosesTaken || 0), 0);
  const totalScheduled = medications.reduce((sum, med) => sum + (med.dosesScheduled || 0), 0);
  
  return totalScheduled > 0 ? Math.round((totalDoses / totalScheduled) * 100) : 0;
} 