import { NextRequest, NextResponse } from 'next/server';
import { InvitationService } from '@/lib/azure/invitation-service';
import { AzureTableService } from '@/lib/azure/table-service';
import { getSession } from '@/lib/auth';
import { sendInvitationEmail } from '@/lib/email-service';
import crypto from 'crypto';

const invitationService = new InvitationService();
const usersService = new AzureTableService('Users');

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user using the centralized getSession
    const session = await getSession(request);
    if (!session || !session.user || session.user.role !== 'patient') {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const patientId = session.user.id || session.user.userId;
    
    // Get request body
    const body = await request.json();
    const { helperId, message } = body;

    // Validate input
    if (!helperId) {
      return NextResponse.json(
        { message: 'Helper ID is required' },
        { status: 400 }
      );
    }

    // Get patient details
    const patient = await usersService.getEntity('patient', patientId as string);
    if (!patient) {
      return NextResponse.json(
        { message: 'Patient not found' },
        { status: 404 }
      );
    }

    // Get helper details
    const helper = await usersService.getEntity('helper', helperId);
    if (!helper) {
      return NextResponse.json(
        { message: 'Helper not found' },
        { status: 404 }
      );
    }

    // Check if helper is already linked to patient
    const linkedHelpers = patient.linkedHelpers ? JSON.parse(patient.linkedHelpers as string) : [];
    if (linkedHelpers.includes(helperId)) {
      return NextResponse.json(
        { message: 'This helper is already linked to you' },
        { status: 400 }
      );
    }

    // Generate token
    const token = crypto.randomBytes(32).toString('hex');

    // Create invitation
    const invitation = await invitationService.createInvitation({
      inviterUserId: patientId,
      inviterRole: 'patient',
      inviterEmail: patient.email as string,
      inviterName: `${patient.firstName} ${patient.lastName}`,
      inviteeEmail: helper.email as string,
      inviteeUserId: helper.RowKey,
      inviteeRole: 'helper',
      token,
      status: 'pending',
      message: message || '',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    });

    // Send invitation email
    await sendInvitationEmail({
      to: helper.email as string,
      patientName: `${patient.firstName} ${patient.lastName}`,
      message: message || '',
      token
    });

    return NextResponse.json({
      message: 'Invitation sent successfully',
      invitation
    });
  } catch (error) {
    console.error('Error sending invitation:', error);
    return NextResponse.json(
      { message: 'Failed to send invitation' },
      { status: 500 }
    );
  }
}