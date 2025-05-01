import { NextResponse } from 'next/server'
import { verifyHelperAccess } from '@/lib/helper'
import { AzureTableService } from '@/lib/azure/table-service'
import { VerificationLogs } from '@/lib/types'

const verificationLogsService = new AzureTableService('VerificationLogs')

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { medicationId, patientId, helperId, notes } = body

    console.log('Received verification request:', { medicationId, patientId, helperId, notes })

    if (!medicationId || !patientId || !helperId) {
      console.log('Missing required fields:', { medicationId, patientId, helperId })
      return NextResponse.json(
        { error: 'Missing required fields', details: { medicationId, patientId, helperId } },
        { status: 400 }
      )
    }

    // Verify helper has access to this patient
    console.log('Verifying helper access...')
    const hasAccess = await verifyHelperAccess(helperId, patientId)
    if (!hasAccess) {
      console.log('Helper access denied')
      return NextResponse.json(
        { error: 'Unauthorized access', details: { helperId, patientId } },
        { status: 403 }
      )
    }
    console.log('Helper access verified')

    // Get medication information
    console.log('Fetching medication information...')
    const medicationsService = new AzureTableService('Medications');
    const medicationEntity = await medicationsService.getEntity(patientId, medicationId);
    if (!medicationEntity) {
      console.log('Medication not found:', { patientId, medicationId })
      return NextResponse.json(
        { error: 'Medication not found', details: { patientId, medicationId } },
        { status: 404 }
      );
    }
    console.log('Medication found:', medicationEntity)

    // Get patient information
    console.log('Fetching patient information...')
    const usersService = new AzureTableService('Users');
    const patientEntity = await usersService.getEntity('patient', patientId);
    if (!patientEntity) {
      console.log('Patient not found:', { patientId })
      return NextResponse.json(
        { error: 'Patient not found', details: { patientId } },
        { status: 404 }
      );
    }
    console.log('Patient found:', patientEntity)

    // Get helper information
    console.log('Fetching helper information...')
    const helperEntity = await usersService.getEntity('helper', helperId);
    if (!helperEntity) {
      console.log('Helper not found:', { helperId })
      return NextResponse.json(
        { error: 'Helper not found', details: { helperId } },
        { status: 404 }
      );
    }
    console.log('Helper found:', helperEntity)

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
      verifiedBy: `${helperEntity.firstName} ${helperEntity.lastName}`,
      prescribingDoctor: medicationEntity.prescribingDoctor as string || ''
    };

    console.log('Creating verification log:', verificationLog)

    // Save to Azure Table
    try {
      await verificationLogsService.createEntity(verificationLog);
      console.log('Verification log created successfully')
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Failed to create verification log:', error)
      return NextResponse.json(
        { 
          error: 'Failed to create verification log',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error verifying medication:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 