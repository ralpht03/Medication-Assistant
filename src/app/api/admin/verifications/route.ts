import { NextResponse } from 'next/server';
import { createTableClient } from '@/lib/azure-table-utils';
import { verifyAdmin } from '@/lib/auth';

interface VerificationLog {
  id: string;
  patientId: string;
  patientName: string;
  medicationId: string;
  medicationName: string;
  verificationMethod: string;
  status: string;
  verifiedAt: string;
  notes?: string;
  verifiedBy?: string;
  timeTaken: string;
}

export async function GET(request: Request) {
  try {
    // Verify admin authentication
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tableClient = createTableClient('VerificationLogs');

    // Get all verification records
    const entities = tableClient.listEntities();
    const verifications: VerificationLog[] = [];

    for await (const entity of entities) {
      verifications.push({
        id: entity.rowKey as string,
        patientId: entity.partitionKey as string,
        patientName: entity.patientName as string,
        medicationId: entity.medicationId as string,
        medicationName: entity.medicationName as string,
        verificationMethod: entity.verificationMethod as string,
        status: entity.status as string,
        verifiedAt: entity.Timestamp as string,
        notes: entity.notes as string | undefined,
        verifiedBy: entity.verifiedBy as string | undefined,
        timeTaken: entity.timeTaken as string
      });
    }

    // Sort by verifiedAt in descending order (most recent first)
    verifications.sort((a, b) => new Date(b.verifiedAt).getTime() - new Date(a.verifiedAt).getTime());

    return NextResponse.json({ verifications });
  } catch (error) {
    console.error('Error fetching verifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch verifications' },
      { status: 500 }
    );
  }
} 