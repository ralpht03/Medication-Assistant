import { NextRequest, NextResponse } from 'next/server';
import { InvitationService } from '@/lib/azure/invitation-service';
import { AzureTableService } from '@/lib/azure/table-service';
import { sendInvitationEmail } from '@/lib/email-service';
import crypto from 'crypto';

// Initialize services
const invitationService = new InvitationService();
const usersService = new AzureTableService('Users');

// Simple in-memory rate limiting
const rateLimits: Record<string, { count: number, resetAt: number }> = {};

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const hourInMs = 60 * 60 * 1000;
  const limit = 10; // 10 invitations per hour
  
  if (!rateLimits[userId] || rateLimits[userId].resetAt < now) {
    rateLimits[userId] = { count: 1, resetAt: now + hourInMs };
    return true;
  }
  
  if (rateLimits[userId].count >= limit) {
    return false;
  }
  
  rateLimits[userId].count += 1;
  return true;
}

// Mock session function - replace with your actual auth implementation
async function getSession(req: NextRequest) {
  // For development, extract user info from headers or cookies
  // In production, use your actual session management
  const authHeader = req.headers.get('authorization');
  
  if (!authHeader) {
    return null;
  }
  
  try {
    // This is a simplified example - implement your actual auth logic
    const token = authHeader.replace('Bearer ', '');
    // In a real app, you would verify the token and extract user info
    
    // Mock user data for development
    return {
      user: {
        id: '123', // Replace with actual user ID extraction
        role: 'admin', // Replace with actual role extraction
        email: 'admin@example.com'
      }
    };
  } catch (error) {
    console.error('Error parsing auth header:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await getSession(request);
    if (!session || !session.user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const userRole = session.user.role;
    
    // Check rate limit
    if (!checkRateLimit(userId)) {
      return NextResponse.json(
        { message: 'Rate limit exceeded. Try again later.' },
        { status: 429 }
      );
    }

    // Get request body
    const body = await request.json();
    const { inviteeEmail, inviteeRole, message } = body;

    // Validate input
    if (!inviteeEmail || !inviteeRole) {
      return NextResponse.json(
        { message: 'Email and role are required' },
        { status: 400 }
      );
    }

    // Validate role permissions
    if (userRole === 'admin' && inviteeRole !== 'patient') {
      return NextResponse.json(
        { message: 'Admins can only invite patients' },
        { status: 403 }
      );
    }

    if (userRole === 'patient' && inviteeRole !== 'helper') {
      return NextResponse.json(
        { message: 'Patients can only invite helpers' },
        { status: 403 }
      );
    }

    if (userRole === 'helper') {
      return NextResponse.json(
        { message: 'Helpers cannot send invitations' },
        { status: 403 }
      );
    }

    // Check if user with this email already exists
    const existingUsers = await usersService.queryEntities(`email eq '${inviteeEmail}'`);
    if (existingUsers.length > 0) {
      return NextResponse.json(
        { message: 'A user with this email already exists' },
        { status: 409 }
      );
    }

    // Check if there's already a pending invitation for this email
    const existingInvitations = await invitationService.getInvitationsByEmail(inviteeEmail);
    const pendingInvitation = existingInvitations.find(inv => 
      inv.status === 'pending' && new Date(inv.expiresAt) > new Date()
    );
    
    if (pendingInvitation) {
      return NextResponse.json(
        { message: 'An invitation has already been sent to this email' },
        { status: 409 }
      );
    }

    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Create invitation
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
    
    const invitation = {
      PartitionKey: 'INVITATION',
      RowKey: crypto.randomUUID(),
      inviterUserId: userId,
      inviterRole: userRole,
      inviteeEmail,
      inviteeRole,
      token,
      status: 'pending',
      message: message || '',
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString()
    };

    await invitationService.createInvitation(invitation);

    // Get inviter name for the email
    const inviterUsers = await usersService.queryEntities(`RowKey eq '${userId}'`);
    if (inviterUsers.length === 0) {
      return NextResponse.json(
        { message: 'Inviter user not found' },
        { status: 500 }
      );
    }
    
    const inviter = inviterUsers[0];
    const inviterName = `${inviter.firstName} ${inviter.lastName}`;

    // Send invitation email
    await sendInvitationEmail({
      to: inviteeEmail,
      inviterName,
      inviterRole: userRole,
      inviteeRole,
      token,
      message
    });

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.RowKey,
        inviteeEmail,
        inviteeRole,
        status: 'pending',
        createdAt: invitation.createdAt,
        expiresAt: invitation.expiresAt
      }
    });
  } catch (error) {
    console.error('Error creating invitation:', error);
    return NextResponse.json(
      { message: 'Failed to create invitation' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await getSession(request);
    if (!session || !session.user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    
    // Get invitations sent by this user
    const invitations = await invitationService.getInvitationsByInviter(userId);
    
    // Format response
    const formattedInvitations = invitations.map(inv => ({
      id: inv.RowKey,
      inviteeEmail: inv.inviteeEmail,
      inviteeRole: inv.inviteeRole,
      status: inv.status,
      createdAt: inv.createdAt,
      expiresAt: inv.expiresAt
    }));

    return NextResponse.json({
      invitations: formattedInvitations
    });
  } catch (error) {
    console.error('Error fetching invitations:', error);
    return NextResponse.json(
      { message: 'Failed to fetch invitations' },
      { status: 500 }
    );
  }
}