import { NextResponse } from "next/server";
import { TableClient } from "@azure/data-tables";
import { createTableClient } from '@/lib/azure-table-utils';
import { AzureTableService } from '@/lib/azure/table-service';

// Constants for table names
const ADHERENCE_TABLE = 'Adherence';
const VERIFICATION_LOGS_TABLE = 'VerificationLogs';
const ALERTS_TABLE = 'Alerts';

// Table services
const adherenceTable = new AzureTableService(ADHERENCE_TABLE);
const alertsTable = new AzureTableService(ALERTS_TABLE);

// Interface for verification logs
interface VerificationLog {
  medicationId: string;
  patientId: string;
  Timestamp: string;
  verified: boolean;
  status: 'taken' | 'missed' | 'skipped';
  notes?: string;
}

// Interface for adherence records
interface Adherence {
  PartitionKey: string;
  RowKey: string;
  Timestamp: string;
  patientId: string;
  adherencePercentage: string;
  dailyAdherence: string;
  pillCount: string;
  recommendedCount: string;
  isCorrectDose: string;
  bypassVerification: string;
  notes: string;
}

// Interface for the response format that matches what the dashboard expects
interface AdherenceResponse {
  adherencePercentage: string;
  streak: number;
  dailyAdherence: string; // JSON string of daily adherence data
  totalVerifications: number;
  successfulVerifications: number;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get('patientId');

    if (!patientId) {
      return NextResponse.json({ error: "Patient ID is required" }, { status: 400 });
    }

    // Create table client
    const verificationLogsTable = createTableClient(VERIFICATION_LOGS_TABLE);

    // Get verification logs for the past 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const filter = `PartitionKey eq '${patientId}' and Timestamp ge datetime'${thirtyDaysAgo.toISOString()}'`;
    const verificationLogsEntities = verificationLogsTable.listEntities({ queryOptions: { filter } });

    // Collect all verification logs
    const verificationLogs: VerificationLog[] = [];
    for await (const entity of verificationLogsEntities) {
      verificationLogs.push({
        medicationId: entity.medicationId as string,
        patientId: entity.patientId as string,
        Timestamp: entity.Timestamp as string,
        verified: entity.verified as boolean,
        status: (entity.status as 'taken' | 'missed' | 'skipped') || (entity.verified ? 'taken' : 'missed'),
        notes: entity.notes as string | undefined
      });
    }

    // Calculate adherence metrics
    const totalVerifications = verificationLogs.length;
    const successfulVerifications = verificationLogs.filter(log => log.verified || log.status === 'taken').length;
    const adherencePercentage = totalVerifications > 0 
      ? (successfulVerifications / totalVerifications) * 100 
      : 0;

    // Calculate streak
    let streak = calculateStreak(verificationLogs);

    // Group by date for daily adherence
    const dailyAdherence = calculateDailyHistory(verificationLogs);

    // Prepare response in the format expected by the dashboard
    const response: AdherenceResponse = {
      adherencePercentage: adherencePercentage.toFixed(2),
      streak,
      dailyAdherence: JSON.stringify(dailyAdherence),
      totalVerifications,
      successfulVerifications
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching adherence data:", error);
    return NextResponse.json({ 
      error: "Error fetching adherence data",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { 
      medicationId, 
      patientId, 
      status = 'taken', 
      notes = '',
      pillCount,
      recommendedCount,
      bypassVerification = false
    } = data;
    
    if (!medicationId || !patientId) {
      return NextResponse.json({ 
        error: "Both medicationId and patientId are required" 
      }, { status: 400 });
    }

    // Create table client for verification logs
    const verificationLogsTable = createTableClient(VERIFICATION_LOGS_TABLE);
    
    // Create a unique record ID using timestamp
    const timestamp = new Date().toISOString();
    const rowKey = `${medicationId}-${timestamp}`;

    // Create verification log entity
    const verificationLog = {
      partitionKey: patientId,
      rowKey: rowKey,
      medicationId,
      patientId,
      Timestamp: timestamp,
      verified: status === 'taken',
      status,
      notes: notes || ''
    };

    // Save to Azure Table
    await verificationLogsTable.createEntity(verificationLog);

    // If pill count information is provided, handle adherence record and alerts
    if (pillCount !== undefined && recommendedCount !== undefined) {
      // Check if this is an overdose or underdose
      const isOverdose = pillCount > recommendedCount;
      const isUnderdose = pillCount < recommendedCount;
      const isCorrectDose = !isOverdose && !isUnderdose;
      
      // Create adherence record
      const adherenceRecord: Adherence = {
        PartitionKey: medicationId,
        RowKey: timestamp,
        Timestamp: timestamp,
        patientId,
        adherencePercentage: isCorrectDose ? "100" : "0", // 100% if correct dose, 0% otherwise
        dailyAdherence: JSON.stringify([]), // Will be updated later
        pillCount: pillCount.toString(),
        recommendedCount: recommendedCount.toString(),
        isCorrectDose: isCorrectDose.toString(),
        bypassVerification: bypassVerification.toString(),
        notes: notes
      };

      await adherenceTable.createEntity(adherenceRecord);
      
      // Create alerts for different scenarios
      const alerts = [];
      
      // Get medication details for better alert messages
      const medicationsTable = createTableClient('Medications');
      let medicationName = medicationId;
      try {
        const medication = await medicationsTable.getEntity(patientId, medicationId);
        medicationName = medication.name as string || medicationId;
      } catch (error) {
        console.warn(`Could not find medication details for ${medicationId}`);
      }
      
      // Get patient details
      const usersTable = createTableClient('Users');
      let patientName = patientId;
      try {
        const patient = await usersTable.getEntity('USER', patientId);
        patientName = `${patient.firstName} ${patient.lastName}`;
      } catch (error) {
        console.warn(`Could not find patient details for ${patientId}`);
      }
      
      // If verification was bypassed, create alerts for both patient and admin
      if (bypassVerification) {
        // Patient alert
        const patientBypassAlert = {
          partitionKey: patientId,
          rowKey: `bypass-${timestamp}`,
          Timestamp: timestamp,
          userId: patientId,
          patientId,
          medicationId,
          medicationName,
          type: 'verification_bypassed',
          message: `You bypassed verification for ${medicationName}. Please ensure you're taking the correct medication.`,
          read: false,
          priority: 'high'
        };
        
        alerts.push(patientBypassAlert);
        
        // Find linked admin(s) for this patient
        try {
          // Query for admins linked to this patient
          const adminFilter = `role eq 'admin' and linkedPatients ne null`;
          const adminEntities = usersTable.listEntities({ queryOptions: { filter: adminFilter } });
          
          for await (const admin of adminEntities) {
            // Check if this admin is linked to the patient
            const linkedPatients = admin.linkedPatients ? JSON.parse(admin.linkedPatients as string) : [];
            if (linkedPatients.includes(patientId)) {
              const adminBypassAlert = {
                partitionKey: admin.rowKey as string,
                rowKey: `patient-bypass-${timestamp}`,
                Timestamp: timestamp,
                userId: admin.rowKey as string,
                patientId,
                patientName,
                medicationId,
                medicationName,
                type: 'patient_verification_bypassed',
                message: `Patient ${patientName} bypassed verification for ${medicationName}. Please follow up.`,
                read: false,
                priority: 'high'
              };
              
              alerts.push(adminBypassAlert);
            }
          }
        } catch (error) {
          console.error("Error finding linked admins:", error);
        }
      }
      
      // If overdose or underdose, create alerts for both patient and admin
      if (isOverdose || isUnderdose) {
        const alertType = isOverdose ? 'overdose' : 'underdose';
        
        // Patient alert message
        const patientAlertMessage = isOverdose
          ? `You took ${pillCount} pills instead of the recommended ${recommendedCount} for ${medicationName}. This is an overdose. Please contact your healthcare provider immediately.`
          : `You took ${pillCount} pills instead of the recommended ${recommendedCount} for ${medicationName}. This is less than prescribed.`;
        
        // Admin alert message
        const adminAlertMessage = isOverdose
          ? `URGENT: Patient ${patientName} took ${pillCount} pills instead of the recommended ${recommendedCount} for ${medicationName} (OVERDOSE).`
          : `Patient ${patientName} took ${pillCount} pills instead of the recommended ${recommendedCount} for ${medicationName} (underdose).`;
        
        // Patient alert
        const patientDoseAlert = {
          partitionKey: patientId,
          rowKey: `${alertType}-${timestamp}`,
          Timestamp: timestamp,
          userId: patientId,
          patientId,
          medicationId,
          medicationName,
          type: alertType,
          message: patientAlertMessage,
          read: false,
          priority: isOverdose ? 'critical' : 'high'
        };
        
        alerts.push(patientDoseAlert);
        
        // Find linked admin(s) for this patient
        try {
          // Query for admins linked to this patient
          const adminFilter = `role eq 'admin' and linkedPatients ne null`;
          const adminEntities = usersTable.listEntities({ queryOptions: { filter: adminFilter } });
          
          for await (const admin of adminEntities) {
            // Check if this admin is linked to the patient
            const linkedPatients = admin.linkedPatients ? JSON.parse(admin.linkedPatients as string) : [];
            if (linkedPatients.includes(patientId)) {
              const adminDoseAlert = {
                partitionKey: admin.rowKey as string,
                rowKey: `patient-${alertType}-${timestamp}`,
                Timestamp: timestamp,
                userId: admin.rowKey as string,
                patientId,
                patientName,
                medicationId,
                medicationName,
                type: `patient_${alertType}`,
                message: adminAlertMessage,
                read: false,
                priority: isOverdose ? 'critical' : 'high'
              };
              
              alerts.push(adminDoseAlert);
            }
          }
        } catch (error) {
          console.error("Error finding linked admins:", error);
        }
      }
      
      // Save all alerts
      for (const alert of alerts) {
        await alertsTable.createEntity(alert);
      }
      
      return NextResponse.json({
        success: true,
        message: "Verification log and adherence record created successfully",
        timestamp,
        alerts: alerts.length > 0 ? alerts.map(a => a.type) : []
      });
    }

    // If no pill count info, just return success for verification log
    return NextResponse.json({
      success: true,
      message: "Verification log created successfully",
      timestamp
    });
  } catch (error) {
    console.error("Error recording adherence:", error);
    return NextResponse.json({ 
      error: "Error recording adherence",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// Helper functions for calculating adherence statistics
function calculateStreak(records: VerificationLog[]): number {
  if (records.length === 0) return 0;
  
  // Group records by date to check if each day had at least one taken medication
  const recordsByDate = new Map<string, VerificationLog[]>();
  
  records.forEach(record => {
    const date = new Date(record.Timestamp).toISOString().split('T')[0];
    if (!recordsByDate.has(date)) {
      recordsByDate.set(date, []);
    }
    recordsByDate.get(date)!.push(record);
  });
  
  // Convert to array and sort by date (most recent first)
  const dateRecords = Array.from(recordsByDate.entries())
    .sort((a, b) => b[0].localeCompare(a[0])); // Sort dates in descending order
  
  let streak = 0;
  
  // Count consecutive days with at least one taken medication
  for (const [_, dayRecords] of dateRecords) {
    const hasTakenMedication = dayRecords.some(record => 
      record.verified || record.status === 'taken'
    );
    
    if (hasTakenMedication) {
      streak++;
    } else {
      break; // Streak ends at first day with no taken medications
    }
  }
  
  return streak;
}

function calculateDailyHistory(records: VerificationLog[]): Array<{date: string; taken: number; total: number}> {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  const history = [];

  // Process the last 7 days
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    // Filter records for this date
    const dayRecords = records.filter(record => {
      const recordDate = new Date(record.Timestamp).toISOString().split('T')[0];
      return recordDate === dateStr;
    });
    
    // Count taken and total for the day
    const taken = dayRecords.filter(record => record.verified || record.status === 'taken').length;
    const total = dayRecords.length;
    
    history.push({
      date: days[date.getDay()],
      taken,
      total
    });
  }

  return history;
}