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
    if (!session || !session.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const adminId = session.user.id || session.user.userId;
    
    // Get request body
    const body = await request.json();
    const { patientId, message } = body;

    // Validate input
    if (!patientId) {
      return NextResponse.json(
        { message: 'Patient ID is required' },
        { status: 400 }
      );
    }

    // Get patient details
    const patient = await usersService.getEntity('patient', patientId);
    if (!patient) {
      return NextResponse.json(
        { message: 'Patient not found' },
        { status: 404 }
      );
    }

    // Get admin details
    const admin = await usersService.getEntity('admin', adminId as string);
    if (!admin) {
      return NextResponse.json(
        { message: 'Admin not found' },
        { status: 404 }
      );
    }

    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Create new invitation
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const invitation = {
      PartitionKey: 'INVITATION',
      RowKey: crypto.randomUUID(),
      inviterUserId: adminId as string,
      inviterRole: 'admin',
      inviteeEmail: patient.email as string,
      inviterEmail: admin.email as string,
      inviterName: `${admin.firstName} ${admin.lastName}`,
      inviteeName: `${patient.firstName} ${patient.lastName}`,
      inviteeRole: 'patient',
      token,
      status: 'pending',
      message: message || '',
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString()
    };
    
    await invitationService.createInvitation(invitation);
    
    // Send email
    try {
      await sendInvitationEmail({
        to: patient.email as string,
        inviterName: `${admin.firstName} ${admin.lastName}`,
        inviterRole: 'admin',
        inviteeRole: 'patient',
        token,
        message: message || ''
      });
    } catch (emailError) {
      console.error('Error sending invitation email:', emailError);
      // Continue even if email fails
    }
    
    return NextResponse.json({
      message: 'Invitation sent successfully'
    });
  } catch (error) {
    console.error('Error sending invitation:', error);
    return NextResponse.json(
      { message: 'Failed to send invitation' },
      { status: 500 }
    );
  }
}