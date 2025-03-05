import { NextRequest, NextResponse } from 'next/server';
import { InvitationService } from '@/lib/azure/invitation-service';
import { AzureTableService } from '@/lib/azure/table-service';
import crypto from 'crypto';

const invitationService = new InvitationService();
const usersService = new AzureTableService('Users');

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;
    const body = await request.json();
    const { firstName, lastName, password } = body;
    
    // Validate input
    if (!firstName || !lastName || !password) {
      return NextResponse.json(
        { message: 'First name, last name, and password are required' },
        { status: 400 }
      );
    }
    
    // Get invitation by token
    const invitation = await invitationService.getInvitationByToken(token);
    
    if (!invitation) {
      return NextResponse.json(
        { message: 'Invalid invitation token' },
        { status: 400 }
      );
    }
    
    // Check if invitation has expired
    if (new Date(invitation.expiresAt) < new Date()) {
      return NextResponse.json(
        { message: 'Invitation has expired' },
        { status: 400 }
      );
    }
    
    // Check if invitation has already been used
    if (invitation.status !== 'pending') {
      return NextResponse.json(
        { message: `Invitation has already been ${invitation.status}` },
        { status: 400 }
      );
    }
    
    // Check if user with this email already exists
    const existingUsers = await usersService.queryEntities(`email eq '${invitation.inviteeEmail}'`);
    if (existingUsers.length > 0) {
      return NextResponse.json(
        { message: 'A user with this email already exists' },
        { status: 409 }
      );
    }
    
    // Create new user
    const userId = crypto.randomUUID();
    const now = new Date().toISOString();
    
    const user: any = {
      PartitionKey: invitation.inviteeRole,
      RowKey: userId,
      email: invitation.inviteeEmail,
      passwordHash: password, // In production, use proper password hashing
      firstName,
      lastName,
      role: invitation.inviteeRole,
      createdAt: now,
      updatedAt: now
    };
    
    // If the user is a patient, initialize linkedHelpers array
    if (invitation.inviteeRole === 'patient') {
      user.linkedHelpers = JSON.stringify([]);
    }
    
    await usersService.createEntity(user);
    
    // Update invitation status
    await invitationService.updateInvitationStatus(invitation.RowKey, 'accepted');
    
    // Update relationship between inviter and invitee
    const inviterUsers = await usersService.queryEntities(`RowKey eq '${invitation.inviterUserId}'`);
    if (inviterUsers.length > 0) {
      const inviter = inviterUsers[0];
      
      if (invitation.inviterRole === 'admin' && invitation.inviteeRole === 'patient') {
        // Admin invited a patient - update admin's linkedPatients
        const linkedPatients = inviter.linkedPatients
          ? JSON.parse(inviter.linkedPatients)
          : [];
        
        linkedPatients.push(userId);
        
        await usersService.updateEntity({
          PartitionKey: 'admin',
          RowKey: invitation.inviterUserId,
          linkedPatients: JSON.stringify(linkedPatients)
        }, "Merge");
      } else if (invitation.inviterRole === 'patient' && invitation.inviteeRole === 'helper') {
        // Patient invited a helper - update patient's linkedHelpers
        const linkedHelpers = inviter.linkedHelpers
          ? JSON.parse(inviter.linkedHelpers)
          : [];
        
        linkedHelpers.push(userId);
        
        await usersService.updateEntity({
          PartitionKey: 'patient',
          RowKey: invitation.inviterUserId,
          linkedHelpers: JSON.stringify(linkedHelpers)
        }, "Merge");
      }
    }
    
    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: invitation.inviteeEmail,
        role: invitation.inviteeRole,
        firstName,
        lastName
      }
    });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    return NextResponse.json(
      { message: 'Failed to accept invitation' },
      { status: 500 }
    );
  }
}