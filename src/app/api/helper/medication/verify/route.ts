import { NextResponse } from 'next/server'
import { verifyHelperAccess } from '@/lib/helper'
import { verifyMedication } from '@/lib/medication'

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

    // Verify the medication
    const result = await verifyMedication(medicationId, {
      verifiedBy: helperId,
      isHelper: true,
      notes,
    })

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to verify medication' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error verifying medication:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 