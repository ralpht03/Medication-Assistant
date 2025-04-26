import { NextRequest, NextResponse } from 'next/server';
import { InvitationService } from '@/lib/azure/invitation-service';
import { AzureTableService } from '@/lib/azure/table-service';
import { getSession } from '@/lib/auth';

const invitationService = new InvitationService();
const usersService = new AzureTableService('Users');

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user using the centralized getSession
    const session = await getSession(request);
    if (!session || !session.user || session.user.role !== 'admin') {
      console.error('Unauthorized access attempt');
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const adminId = session.user.id || session.user.userId;
    console.log('Fetching invitations for admin:', adminId);
    
    // Get invitations sent by this admin
    const invitations = await invitationService.getInvitationsByInviter(adminId as string);
    console.log('Found invitations:', invitations.length);
    
    // Format the response
    const formattedInvitations = invitations.map(inv => ({
      id: inv.RowKey,
      email: inv.inviteeEmail,
      inviteeRole: inv.inviteeRole,
      status: inv.status,
      createdAt: inv.createdAt,
      expiresAt: inv.expiresAt,
      inviteeName: inv.inviteeName || undefined
    }));

    console.log('Formatted invitations:', formattedInvitations.length);
    return NextResponse.json({
      invitations: formattedInvitations
    });
  } catch (error) {
    console.error('Error in GET /api/admin/sent-invitations:', error);
    return NextResponse.json(
      { message: 'Failed to fetch invitations', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Get authenticated user using the centralized getSession
    const session = await getSession(request);
    if (!session || !session.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get invitation ID from request body
    const body = await request.json();
    const { invitationId } = body;

    if (!invitationId) {
      return NextResponse.json(
        { message: 'Invitation ID is required' },
        { status: 400 }
      );
    }

    // Delete the invitation
    await invitationService.deleteEntity('INVITATION', invitationId);

    return NextResponse.json({
      message: 'Invitation deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting invitation:', error);
    return NextResponse.json(
      { message: 'Failed to delete invitation' },
      { status: 500 }
    );
  }
}