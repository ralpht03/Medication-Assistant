import { NextRequest, NextResponse } from 'next/server';
import { InvitationService } from '@/lib/azure/invitation-service';
import { AzureTableService } from '@/lib/azure/table-service';

const invitationService = new InvitationService();
const usersService = new AzureTableService('Users');

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;
    
    // Get invitation by token
    const invitation = await invitationService.getInvitationByToken(token);
    
    if (!invitation) {
      return NextResponse.json({
        valid: false,
        message: 'Invalid invitation token'
      });
    }
    
    // Check if invitation has expired
    if (new Date(invitation.expiresAt) < new Date()) {
      return NextResponse.json({
        valid: false,
        message: 'Invitation has expired'
      });
    }
    
    // Check if invitation has already been used
    if (invitation.status !== 'pending') {
      return NextResponse.json({
        valid: false,
        message: `Invitation has already been ${invitation.status}`
      });
    }
    
    // Get inviter details
    const inviterUsers = await usersService.queryEntities(`RowKey eq '${invitation.inviterUserId}'`);
    if (inviterUsers.length === 0) {
      return NextResponse.json({
        valid: false,
        message: 'Inviter not found'
      });
    }
    
    const inviter = inviterUsers[0];
    const inviterName = `${inviter.firstName} ${inviter.lastName}`;
    
    return NextResponse.json({
      valid: true,
      invitation: {
        inviterName,
        inviterRole: invitation.inviterRole,
        inviteeRole: invitation.inviteeRole,
        inviteeEmail: invitation.inviteeEmail,
        message: invitation.message
      }
    });
  } catch (error) {
    console.error('Error verifying invitation:', error);
    return NextResponse.json(
      { valid: false, message: 'Failed to verify invitation' },
      { status: 500 }
    );
  }
}