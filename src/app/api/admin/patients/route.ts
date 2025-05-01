import { NextResponse } from 'next/server';
import { TableClient, odata } from '@azure/data-tables';
import { createTableClient } from '@/lib/azure-table-utils';



export async function GET(request: Request) {

  const usersTableClient = createTableClient('Users');
  const medicationsTableClient = createTableClient('medications');
  const verificationLogsTableClient = createTableClient('verificationLogs');
  try {
    const { searchParams } = new URL(request.url);
    const adminId = searchParams.get('adminId');

    if (!adminId) {
      return NextResponse.json({ error: 'Admin ID is required' }, { status: 400 });
    }

    console.log('Fetching admin user with ID:', adminId);
    
    // Get the admin user using the correct partition key
    const adminFilter = odata`PartitionKey eq 'admin' and RowKey eq ${adminId}`;
    let adminUser = null;
    
    try {
      const adminEntities = usersTableClient.listEntities({ queryOptions: { filter: adminFilter } });
      
      for await (const entity of adminEntities) {
        adminUser = entity;
        console.log('Found admin user:', {
          partitionKey: entity.partitionKey,
          rowKey: entity.rowKey,
          role: entity.role,
          email: entity.email
        });
        break;
      }
    } catch (error) {
      console.error('Error finding admin user:', error);
      return NextResponse.json({ error: 'Failed to find admin user' }, { status: 404 });
    }
    
    if (!adminUser) {
      return NextResponse.json({ error: 'Admin user not found' }, { status: 404 });
    }

    // Check if the user is an admin
    const role = adminUser.role?.toString().toLowerCase() || '';
    const type = adminUser.type?.toString().toLowerCase() || '';
    
    if (!role.includes('admin') && !type.includes('admin')) {
      return NextResponse.json({ error: 'User is not an admin' }, { status: 403 });
    }

    // Get the linkedPatients array
    let linkedPatients: string[] = [];
    if (adminUser.linkedPatients) {
      try {
        linkedPatients = JSON.parse(adminUser.linkedPatients as string);
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

      const status = determineStatus(medications);

      const lastMedication = getLastMedicationTime(medications);
      const nextScheduled = getNextScheduledTime(medications);

      console.log('Patient medications:', {
        patientId: patientUser.rowKey,
        medications,
        lastMedication,
        nextScheduled
      });

      patients.push({
        id: patientUser.rowKey,
        name: `${patientUser.firstName} ${patientUser.lastName}`,
        email: patientUser.email,
        lastMedication,
        nextScheduled,
        adherenceRate,
        status,
        medicationCount: medications.length
      });
    }

    return NextResponse.json({ patients });
  } catch (error) {
    console.error('Error in GET /api/admin/patients:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper functions
function determineStatus(medications: any[]): 'normal' | 'missed' | 'overdose' {
  if (medications.length === 0) return 'normal';
  
  const now = new Date();
  const hasMissedDose = medications.some(med => {
    const nextDose = new Date(med.nextDoseTime);
    return nextDose < now && !med.lastTaken;
  });
  
  const hasOverdose = medications.some(med => med.dosesTaken > med.dosesScheduled);
  
  if (hasOverdose) return 'overdose';
  if (hasMissedDose) return 'missed';
  return 'normal';
}

function getLastMedicationTime(medications: any[]): { time: string; medication?: { name: string; dosage: string } } {
  if (medications.length === 0) return { time: 'Never' };
  
  let lastMedication = null;
  const lastTaken = medications.reduce((latest, med) => {
    if (!med.lastFilled) return latest;
    const takenTime = new Date(med.lastFilled);
    if (takenTime > latest) {
      lastMedication = med;
      return takenTime;
    }
    return latest;
  }, new Date(0));
  
  return {
    time: lastTaken.getTime() === 0 ? 'Never' : lastTaken.toLocaleString(),
    medication: lastMedication ? {
      name: lastMedication.name,
      dosage: lastMedication.dosage
    } : undefined
  };
}

function getNextScheduledTime(medications: any[]): { time: string; medication?: { name: string; dosage: string } } {
  if (medications.length === 0) return { time: 'No medications' };
  
  let nextMedication = null;
  const nextDose = medications.reduce((earliest, med) => {
    if (!med.time) return earliest;
    const [hours, minutes] = med.time.split(':').map(Number);
    const doseTime = new Date();
    doseTime.setHours(hours, minutes, 0, 0);
    
    // If the time has already passed today, set it to tomorrow
    if (doseTime < new Date()) {
      doseTime.setDate(doseTime.getDate() + 1);
    }
    
    if (doseTime < earliest) {
      nextMedication = med;
      return doseTime;
    }
    return earliest;
  }, new Date(8640000000000000)); // Far future date
  
  return {
    time: nextDose.getTime() === 8640000000000000 ? 'No medications' : nextDose.toLocaleString(),
    medication: nextMedication ? {
      name: nextMedication.name,
      dosage: nextMedication.dosage
    } : undefined
  };
}