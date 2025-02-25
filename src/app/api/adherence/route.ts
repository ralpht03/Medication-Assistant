import { NextResponse } from "next/server";
import { AzureTableService } from '@/lib/azure/table-service';
import { Adherence } from '@/lib/types';
import { TableEntityResult } from "@azure/data-tables";

const adherenceTable = new AzureTableService('Adherence');
const verificationTable = new AzureTableService('VerificationLogs');

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
    const { medicationId, patientId } = await req.json();
    
    const adherenceRecord: Adherence = {
      PartitionKey: medicationId,
      RowKey: new Date().toISOString(),
      Timestamp: new Date().toISOString(),
      patientId,
      adherencePercentage: "100", // Initial value
      dailyAdherence: JSON.stringify([]) // Initial empty history
    };

    await adherenceTable.createEntity(adherenceRecord);
    return NextResponse.json(adherenceRecord);
  } catch (error) {
    return NextResponse.json({ error: "Error recording adherence" }, { status: 500 });
  }
} 