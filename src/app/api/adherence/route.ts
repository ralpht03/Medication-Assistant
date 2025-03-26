import { NextResponse } from "next/server";
import { AzureTableService } from '@/lib/azure/table-service';
import { Adherence } from '@/lib/types';
import { TableEntityResult } from "@azure/data-tables";

const adherenceTable = new AzureTableService('Adherence');
const verificationTable = new AzureTableService('VerificationLogs');
const alertsTable = new AzureTableService('Alerts');

interface VerificationLog {
  Timestamp: string;
  verified: boolean;
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

        const verificationLogs = await verificationTable.queryEntities(
            `PartitionKey eq '${patientId}' and Timestamp ge datetime'${thirtyDaysAgo.toISOString()}'`
        );

        // Calculate adherence metrics
        const totalVerifications = verificationLogs.length;
        const successfulVerifications = verificationLogs.filter(log => log.verified).length;
        const adherencePercentage = totalVerifications > 0 
            ? (successfulVerifications / totalVerifications) * 100 
            : 0;

        // Group by date for daily adherence
        const dailyAdherence = (verificationLogs as unknown as VerificationLog[]).reduce((acc: any[], log) => {
            const date = new Date(log.Timestamp).toISOString().split('T')[0];
            const existingDate = acc.find(item => item.date === date);
            
            if (existingDate) {
                existingDate.total += 1;
                if (log.verified) existingDate.taken += 1;
            } else {
                acc.push({
                    date,
                    taken: log.verified ? 1 : 0,
                    total: 1
                });
            }
            
            return acc;
        }, []);

        return NextResponse.json({
            adherencePercentage: adherencePercentage.toFixed(2),
            dailyAdherence: JSON.stringify(dailyAdherence),
            totalVerifications,
            successfulVerifications
        });
    } catch (error) {
        console.error("Error fetching adherence data:", error);
        return NextResponse.json({ error: "Error fetching adherence data" }, { status: 500 });
    }
}

export async function POST(req: Request) {
  try {
    const { 
      medicationId, 
      patientId, 
      pillCount, 
      recommendedCount, 
      bypassVerification = false,
      notes = ''
    } = await req.json();
    
    // Check if this is an overdose or underdose
    const isOverdose = pillCount > recommendedCount;
    const isUnderdose = pillCount < recommendedCount;
    const isCorrectDose = !isOverdose && !isUnderdose;
    
    // Create adherence record
    const adherenceRecord: Adherence = {
      PartitionKey: medicationId,
      RowKey: new Date().toISOString(),
      Timestamp: new Date().toISOString(),
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
    
    // If verification was bypassed, create an alert
    if (bypassVerification) {
      const bypassAlert = {
        PartitionKey: patientId,
        RowKey: `bypass-${new Date().toISOString()}`,
        Timestamp: new Date().toISOString(),
        userId: patientId,
        medicationId,
        type: 'verification_bypassed',
        message: `Patient bypassed pill verification for ${medicationId}. Please follow up.`,
        read: false,
        priority: 'high'
      };
      
      alerts.push(bypassAlert);
    }
    
    // If overdose or underdose, create an alert
    if (isOverdose || isUnderdose) {
      const alertType = isOverdose ? 'overdose' : 'underdose';
      const alertMessage = isOverdose
        ? `Patient took ${pillCount} pills instead of the recommended ${recommendedCount} (overdose)`
        : `Patient took ${pillCount} pills instead of the recommended ${recommendedCount} (underdose)`;
      
      const doseAlert = {
        PartitionKey: patientId,
        RowKey: `${alertType}-${new Date().toISOString()}`,
        Timestamp: new Date().toISOString(),
        userId: patientId,
        medicationId,
        type: alertType,
        message: alertMessage,
        read: false,
        priority: isOverdose ? 'critical' : 'high'
      };
      
      alerts.push(doseAlert);
    }
    
    // Save all alerts
    for (const alert of alerts) {
      await alertsTable.createEntity(alert);
    }
    
    return NextResponse.json({
      ...adherenceRecord,
      alerts: alerts.length > 0 ? alerts.map(a => a.type) : []
    });
  } catch (error) {
    console.error("Error recording adherence:", error);
    return NextResponse.json({ error: "Error recording adherence" }, { status: 500 });
  }
}