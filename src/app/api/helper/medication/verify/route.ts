import { NextResponse } from 'next/server'
import { verifyHelperAccess } from '@/lib/helper'
import { AzureTableService } from '@/lib/azure/table-service'
import { VerificationLogs } from '@/lib/types'

const verificationLogsService = new AzureTableService('VerificationLogs')

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { medicationId, patientId, helperId, notes } = body

    if (!medicationId || !patientId || !helperId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify helper has access to this patient
    const hasAccess = await verifyHelperAccess(helperId, patientId)
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 403 }
      )
    }

    // Get medication information
    const medicationsService = new AzureTableService('Medications');
    const medicationEntity = await medicationsService.getEntity(patientId, medicationId);
    if (!medicationEntity) {
      return NextResponse.json(
        { error: 'Medication not found' },
        { status: 404 }
      );
    }

    // Get patient information
    const patientsService = new AzureTableService('Patients');
    const patientEntity = await patientsService.getEntity('PATIENT', patientId);
    if (!patientEntity) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    // Get helper information
    const usersService = new AzureTableService('Users');
    const helperEntity = await usersService.getEntity('helper', helperId);
    if (!helperEntity) {
      return NextResponse.json(
        { error: 'Helper not found' },
        { status: 404 }
      );
    }

    // Create verification log
    const now = new Date();
    const timestamp = now.toISOString();
    const rowKey = `${medicationId}-${now.getTime()}`;

    const verificationLog: VerificationLogs = {
      PartitionKey: patientId,
      RowKey: rowKey,
      Timestamp: timestamp,
      medicationName: medicationEntity.name as string,
      medicationId: medicationId,
      pillCount: '1', // Default to 1 for helper verification
      recommendedPillCount: medicationEntity.recommendedPillCount as string,
      timeTaken: timestamp,
      status: 'taken',
      notes: notes || '',
      verificationMethod: 'helper',
      isCorrectDose: true,
      patientName: `${patientEntity.firstName} ${patientEntity.lastName}`,
      verifiedBy: `${helperEntity.firstName} ${helperEntity.lastName}`
    };

    // Save to Azure Table
    await verificationLogsService.createEntity(verificationLog);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error verifying medication:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 