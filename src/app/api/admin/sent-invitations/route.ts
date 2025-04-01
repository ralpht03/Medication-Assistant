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
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const adminId = session.user.id || session.user.userId;
    
    // Get invitations sent by this admin
    const invitations = await invitationService.getInvitationsByInviter(adminId as string);
    
    // Format the response
    const formattedInvitations = invitations.map(inv => ({
      id: inv.RowKey,
      email: inv.inviteeEmail,
      inviteeRole: inv.inviteeRole,
      status: inv.status,
      createdAt: inv.createdAt,
      expiresAt: inv.expiresAt
    }));

    return NextResponse.json({
      invitations: formattedInvitations
    });
  } catch (error) {
    console.error('Error fetching sent invitations:', error);
    return NextResponse.json(
      { message: 'Failed to fetch invitations' },
      { status: 500 }
    );
  }
}