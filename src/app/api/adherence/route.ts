import { NextResponse } from "next/server";
import { AzureTableService } from '@/lib/azure/table-service';
import { VerificationLogs, Alerts } from '@/lib/types';

// Constants for table names
const VERIFICATION_LOGS_TABLE = 'VerificationLogs';
const ALERTS_TABLE = 'Alerts';

// Table services
const verificationLogsService = new AzureTableService(VERIFICATION_LOGS_TABLE);
const alertsService = new AzureTableService(ALERTS_TABLE);

// Interface for the response format
interface AdherenceResponse {
  adherencePercentage: number;
  streak: number;
  dailyAdherence: Array<{
    date: string;
    taken: number;
    total: number;
  }>;
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

    // Get verification logs for the past 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const filter = `PartitionKey eq '${patientId}' and Timestamp ge datetime'${thirtyDaysAgo.toISOString()}'`;
    const verificationLogsEntities = await verificationLogsService.queryEntities<VerificationLogs>(filter);

    // Collect all verification logs
    const verificationLogs: VerificationLogs[] = [];
    for (const entity of verificationLogsEntities) {
      verificationLogs.push({
        PartitionKey: entity.PartitionKey as string,
        RowKey: entity.RowKey as string,
        Timestamp: entity.Timestamp as string,
        medicationName: entity.medicationName as string,
        medicationId: entity.medicationId as string,
        pillCount: entity.pillCount as number,
        recommendedCount: entity.recommendedCount as number,
        timeTaken: entity.timeTaken as string,
        status: entity.status as 'taken' | 'missed' | 'skipped',
        notes: entity.notes as string,
        verificationMethod: entity.verificationMethod as 'camera' | 'manual' | 'helper',
        isCorrectDose: entity.isCorrectDose as boolean
      });
    }

    // Calculate adherence metrics
    const totalVerifications = verificationLogs.length;
    const successfulVerifications = verificationLogs.filter(log => log.status === 'taken').length;
    const adherencePercentage = totalVerifications > 0 
      ? (successfulVerifications / totalVerifications) * 100 
      : 0;

    // Calculate streak
    let streak = calculateStreak(verificationLogs);

    // Calculate daily adherence
    const dailyAdherence = calculateDailyHistory(verificationLogs);

    // Prepare response
    const response: AdherenceResponse = {
      adherencePercentage,
      streak,
      dailyAdherence,
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

    // Get medication information
    const medicationsService = new AzureTableService('Medications');
    const medicationEntity = await medicationsService.getEntity(patientId, medicationId);
    const medication = {
      name: medicationEntity.name as string,
      dosage: medicationEntity.dosage as string
    };
    
    // Create a unique record ID using timestamp
    const timestamp = new Date().toISOString();
    const rowKey = `${medicationId}-${timestamp}`;

    // Check for duplicate verification within the last 5 minutes
    const fiveMinutesAgo = new Date();
    fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);
    
    const duplicateFilter = `PartitionKey eq '${patientId}' and medicationId eq '${medicationId}' and Timestamp ge datetime'${fiveMinutesAgo.toISOString()}'`;
    const recentLogs = await verificationLogsService.queryEntities(duplicateFilter);
    
    if (recentLogs.length > 0) {
      return NextResponse.json({ 
        error: "Duplicate verification attempt detected",
        message: "A verification for this medication was already recorded in the last 5 minutes"
      }, { status: 409 });
    }

    // Check if this is an overdose or underdose
    const isOverdose = pillCount > recommendedCount;
    const isUnderdose = pillCount < recommendedCount;
    const isCorrectDose = !isOverdose && !isUnderdose;

    // Create verification log
    const verificationLog: VerificationLogs = {
      PartitionKey: patientId,
      RowKey: rowKey,
      Timestamp: timestamp,
      medicationName: medication.name,
      medicationId: medicationId,
      pillCount: pillCount,
      recommendedCount: recommendedCount,
      timeTaken: timestamp,
      status: status,
      notes: notes,
      verificationMethod: bypassVerification ? 'manual' : 'camera',
      isCorrectDose: isCorrectDose
    };

    // Save to Azure Table
    await verificationLogsService.createEntity(verificationLog);
    
    // Helper function to determine alert priority
    const getAlertPriority = (type: 'overdose' | 'underdose' | 'verification_bypass'): 'high' | 'medium' | 'low' => {
      switch (type) {
        case 'overdose':
          return 'high';
        case 'underdose':
          return 'medium';
        case 'verification_bypass':
          return 'low';
        default:
          return 'low';
      }
    };

    // Create alerts for different scenarios
    const alerts: Alerts[] = [];
    
    // If verification was bypassed, create an alert
    if (bypassVerification) {
      const bypassAlert: Alerts = {
        PartitionKey: patientId,
        RowKey: `bypass-${timestamp}`,
        Timestamp: timestamp,
        type: 'verification_bypass',
        message: `Medication verification bypassed for ${medication.name}. Reason: ${notes}`,
        priority: getAlertPriority('verification_bypass'),
        medicationId: medicationId,
        userId: patientId,
        read: false
      };
      alerts.push(bypassAlert);
    }
    
    // If overdose or underdose, create an alert
    if (isOverdose || isUnderdose) {
      const alertType = isOverdose ? 'overdose' : 'underdose';
      const alertMessage = isOverdose
        ? `Overdose detected for ${medication.name}. Taken: ${pillCount}, Recommended: ${recommendedCount}`
        : `Underdose detected for ${medication.name}. Taken: ${pillCount}, Recommended: ${recommendedCount}`;
      
      const doseAlert: Alerts = {
        PartitionKey: patientId,
        RowKey: `${alertType}-${timestamp}`,
        Timestamp: timestamp,
        type: alertType,
        message: alertMessage,
        priority: getAlertPriority(alertType),
        medicationId: medicationId,
        userId: patientId,
        read: false
      };
      
      alerts.push(doseAlert);
    }
    
    // Save all alerts
    for (const alert of alerts) {
      await alertsService.createEntity(alert);
    }
    
    return NextResponse.json({
      success: true,
      message: "Verification log created successfully",
      timestamp,
      alerts: alerts.length > 0 ? alerts.map(a => a.type) : []
    });
  } catch (error) {
    console.error("Error recording verification:", error);
    return NextResponse.json({ 
      error: "Error recording verification",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// Helper functions for calculating adherence statistics
function calculateStreak(records: VerificationLogs[]): number {
  if (records.length === 0) return 0;
  
  // Group records by date to check if each day had at least one taken medication
  const recordsByDate = new Map<string, VerificationLogs[]>();
  
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
    const hasTakenMedication = dayRecords.some(record => record.status === 'taken');
    
    if (hasTakenMedication) {
      streak++;
    } else {
      break; // Streak ends at first day with no taken medications
    }
  }
  
  return streak;
}

function calculateDailyHistory(records: VerificationLogs[]): Array<{date: string; taken: number; total: number}> {
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
    const taken = dayRecords.filter(record => record.status === 'taken').length;
    const total = dayRecords.length;
    
    history.push({
      date: days[date.getDay()],
      taken,
      total
    });
  }

  return history;
}