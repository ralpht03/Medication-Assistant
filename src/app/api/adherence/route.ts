import { NextResponse } from "next/server";
import { TableClient } from "@azure/data-tables";
import { createTableClient } from '@/lib/azure-table-utils';

// Constants for table names
const VERIFICATION_LOGS_TABLE = 'VerificationLogs';

// Interface for verification logs
interface VerificationLog {
  medicationId: string;
  patientId: string;
  Timestamp: string;
  verified: boolean;
  status: 'taken' | 'missed' | 'skipped';
  notes?: string;
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
    const { medicationId, patientId, status = 'taken', notes } = data;
    
    if (!medicationId || !patientId) {
      return NextResponse.json({ 
        error: "Both medicationId and patientId are required" 
      }, { status: 400 });
    }

    // Create table client
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