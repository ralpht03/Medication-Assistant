import { NextResponse } from "next/server";
import { AzureTableService } from '@/lib/azure/table-service';
import { VerificationLogs, Alerts } from '@/lib/types';
import { createTableClient } from "@/lib/azure-table-utils";

// Constants for table names
const VERIFICATION_LOGS_TABLE = 'VerificationLogs';
const ALERTS_TABLE = 'Alerts';

// Table services
const verificationLogsService = new AzureTableService(VERIFICATION_LOGS_TABLE);
const alertsService = new AzureTableService(ALERTS_TABLE);

// Interface for the response format
interface AdherenceResponse {
  adherencePercentage: string;
  streak: string;
  dailyAdherence: Array<{
    date: string;
    taken: string;
    total: string;
  }>;
  totalVerifications: string;
  successfulVerifications: string;
  correctDoseVerifications: string;
  incorrectDoseVerifications: string;
  missedVerifications: string;
  skippedVerifications: string;
  verificationLogs: VerificationLogs[];
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get('patientId');
    const medicationId = searchParams.get('medicationId'); // Optional: filter by specific medication

    if (!patientId) {
      return NextResponse.json({ error: "Patient ID is required" }, { status: 400 });
    }

    // Get verification logs for the past 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Build filter based on parameters
    let filter = `PartitionKey eq '${patientId}' and Timestamp ge datetime'${thirtyDaysAgo.toISOString()}'`;
    if (medicationId) {
      filter += ` and medicationId eq '${medicationId}'`;
    }
    
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
        pillCount: entity.pillCount as string,
        recommendedPillCount: entity.recommendedPillCount as string,
        timeTaken: entity.timeTaken as string,
        status: entity.status as 'taken' | 'missed' | 'skipped',
        notes: entity.notes as string,
        verificationMethod: entity.verificationMethod as 'camera' | 'manual' | 'helper',
        isCorrectDose: entity.isCorrectDose as boolean,
        patientName: entity.patientName as string,
        verifiedBy: entity.verifiedBy as string
      });
    }

    // Calculate adherence metrics
    const totalVerifications = verificationLogs.length;
    const successfulVerifications = verificationLogs.filter(log => log.status === 'taken').length;
    const missedVerifications = verificationLogs.filter(log => log.status === 'missed').length;
    const skippedVerifications = verificationLogs.filter(log => log.status === 'skipped').length;
    
    // Calculate correct dose metrics
    const correctDoseVerifications = verificationLogs.filter(log => log.status === 'taken' && log.isCorrectDose).length;
    const incorrectDoseVerifications = successfulVerifications - correctDoseVerifications;
    
    // Calculate adherence percentage based on correct dosage
    const adherencePercentage = totalVerifications > 0
      ? Math.round((correctDoseVerifications / totalVerifications) * 100).toString()
      : "0";

    // Calculate streak
    let streak = calculateStreak(verificationLogs);

    // Calculate daily adherence
    const dailyAdherence = calculateDailyHistory(verificationLogs);

    // Prepare response
    const response: AdherenceResponse = {
      adherencePercentage,
      streak: streak.toString(),
      dailyAdherence: dailyAdherence.map(day => ({
        date: day.date,
        taken: day.taken.toString(),
        total: day.total.toString()
      })),
      totalVerifications: totalVerifications.toString(),
      successfulVerifications: successfulVerifications.toString(),
      correctDoseVerifications: correctDoseVerifications.toString(),
      incorrectDoseVerifications: incorrectDoseVerifications.toString(),
      missedVerifications: missedVerifications.toString(),
      skippedVerifications: skippedVerifications.toString(),
      verificationLogs
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
    console.log('Received POST request data:', data);
    
    const { 
      medicationId, 
      patientId, 
      status = 'taken', 
      notes = '',
      pillCount,
      recommendedPillCount,
      bypassVerification,
      patientName,
      verifiedBy
    } = data;
    
    if (!medicationId || !patientId) {
      console.error('Missing required fields:', { medicationId, patientId });
      return NextResponse.json({ 
        error: "Both medicationId and patientId are required" 
      }, { status: 400 });
    }

    // Validate status
    if (!['taken', 'missed', 'skipped'].includes(status)) {
      console.error('Invalid status:', status);
      return NextResponse.json({ 
        error: "Invalid status. Must be 'taken', 'missed', or 'skipped'" 
      }, { status: 400 });
    }

    // Get medication information
    try {
      const medicationsService = new AzureTableService('Medications');
      const medicationEntity = await medicationsService.getEntity(patientId, medicationId);
      console.log('Retrieved medication entity:', medicationEntity);
      
      if (!medicationEntity) {
        console.error('Medication not found:', { patientId, medicationId });
        return NextResponse.json({ 
          error: "Medication not found" 
        }, { status: 404 });
      }
      
      const medication = {
        name: medicationEntity.name as string,
        dosage: medicationEntity.dosage as string,
        recommendedPillCount: medicationEntity.recommendedPillCount as string
      };
      
      // Create a unique record ID using timestamp
      const now = new Date();
      const timestamp = now.toISOString();
      const rowKey = `${medicationId}-${now.getTime()}`;

      // Check for duplicate verification within the last 15 minutes
      const fifteenMinutesAgo = new Date(now);
      fifteenMinutesAgo.setMinutes(fifteenMinutesAgo.getMinutes() - 15);
      
      const duplicateFilter = `PartitionKey eq '${patientId}' and medicationId eq '${medicationId}' and Timestamp ge datetime'${fifteenMinutesAgo.toISOString()}'`;
      console.log('Checking for duplicates with filter:', duplicateFilter);
      
      const recentLogs = await verificationLogsService.queryEntities(duplicateFilter);
      console.log('Found recent logs:', recentLogs);
      
      if (recentLogs.length > 0) {
        // If there's a duplicate, update the existing record instead of creating a new one
        const existingLog = recentLogs[0];
        const updatedLog = {
          ...existingLog,
          status,
          notes,
          pillCount,
          recommendedPillCount: medication.recommendedPillCount,
          timeTaken: timestamp,
          isCorrectDose: pillCount === medication.recommendedPillCount
        };
        
        console.log('Updating existing log:', updatedLog);
        await verificationLogsService.updateEntity(updatedLog);
        
        return NextResponse.json({ 
          success: true,
          message: "Verification log updated successfully",
          timestamp
        });
      }

      // Check if this is an overdose or underdose
      const isOverdose = parseInt(pillCount) > parseInt(medication.recommendedPillCount);
      const isUnderdose = parseInt(pillCount) < parseInt(medication.recommendedPillCount);
      const isCorrectDose = !isOverdose && !isUnderdose;

      // Create verification log
      const verificationLog: VerificationLogs = {
        PartitionKey: patientId,
        RowKey: rowKey,
        Timestamp: timestamp,
        medicationName: medication.name,
        medicationId: medicationId,
        pillCount: pillCount,
        recommendedPillCount: medication.recommendedPillCount,
        timeTaken: timestamp,
        status: status,
        notes: notes,
        verificationMethod: bypassVerification ? 'manual' : 'camera',
        isCorrectDose: isCorrectDose,
        patientName: data.patientName || 'Unknown',
        verifiedBy: data.verifiedBy || 'self'
      };

      console.log('Creating new verification log:', verificationLog);
      // Save to Azure Table
      try {
        await verificationLogsService.createEntity(verificationLog);
        console.log('Successfully created verification log in Azure Table');
      } catch (error) {
        console.error('Failed to create verification log:', error);
        throw error;
      }
      
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
          patientId: patientId,
          read: false
        };
        alerts.push(bypassAlert);
      }
      
      // If overdose or underdose, create alerts for both patient and admin
      if (isOverdose || isUnderdose) {
        const alertType = isOverdose ? 'overdose' : 'underdose';
        const alertMessage = isOverdose
            ? `Overdose detected for ${medication.name}. Taken: ${pillCount}, Recommended: ${medication.recommendedPillCount}`
          : `Underdose detected for ${medication.name}. Taken: ${pillCount}, Recommended: ${medication.recommendedPillCount}`;
        
        const doseAlert: Alerts = {
          PartitionKey: patientId,
          RowKey: `${alertType}-${timestamp}`,
          Timestamp: timestamp,
          type: alertType,
          message: alertMessage,
          priority: getAlertPriority(alertType),
          medicationId: medicationId,
          patientId: patientId,
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
      console.error('Error in medication verification process:', error);
      return NextResponse.json({ 
        error: "Error creating verification log",
        details: error instanceof Error ? error.message : String(error)
      }, { status: 500 });
    }
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json({ 
      error: "Error processing request",
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
    try {
      // Ensure Timestamp exists and is a valid string
      if (!record.Timestamp || typeof record.Timestamp !== 'string') {
        console.warn('Invalid Timestamp in record:', record);
        return;
      }
      
      // Azure Table Storage timestamps are in ISO format with 'Z' suffix
      // Remove any potential timezone offset and convert to local date
      const date = new Date(record.Timestamp.replace('Z', '')).toISOString().split('T')[0];
      if (!recordsByDate.has(date)) {
        recordsByDate.set(date, []);
      }
      recordsByDate.get(date)!.push(record);
    } catch (error) {
      console.error('Error processing record timestamp:', error, record);
    }
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
      try {
        // Ensure Timestamp exists and is a valid string
        if (!record.Timestamp || typeof record.Timestamp !== 'string') {
          console.warn('Invalid Timestamp in record:', record);
          return false;
        }
        
        // Azure Table Storage timestamps are in ISO format with 'Z' suffix
        // Remove any potential timezone offset and convert to local date
        const recordDate = new Date(record.Timestamp.replace('Z', '')).toISOString().split('T')[0];
        return recordDate === dateStr;
      } catch (error) {
        console.error('Error processing record timestamp:', error, record);
        return false;
      }
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