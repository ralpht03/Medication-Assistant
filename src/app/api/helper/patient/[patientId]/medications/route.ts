import { NextResponse } from 'next/server'
import { getPatientMedications } from '@/lib/helper-access'
import { verifyHelperAccess } from '@/lib/helper'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const { searchParams } = new URL(request.url)
    const helperId = searchParams.get('helperId')
    const { patientId } = await params

    if (!helperId) {
      return NextResponse.json(
        { error: 'Helper ID is required' },
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

    const medications = await getPatientMedications(patientId)
    return NextResponse.json({ medications })
  } catch (error) {
    console.error('Error fetching patient medications:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 