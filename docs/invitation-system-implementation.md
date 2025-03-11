# Email-Based Invitation System Implementation

## Overview

This document outlines the implementation plan for an email-based invitation system that enables:
1. Admins to invite patients
2. Patients to invite helpers

The system will use SendGrid for email, implement secure one-time use tokens, and automatically establish relationships between users upon invitation acceptance.

## Database Structure

### New Table: INVITATIONS

```typescript
interface Invitation {
  PartitionKey: string;  // "INVITATION"
  RowKey: string;        // Unique invitation ID (UUID)
  inviterUserId: string; // ID of the user sending the invitation
  inviterRole: string;   // Role of the inviter (admin or patient)
  inviteeEmail: string;  // Email of the person being invited
  inviteeRole: string;   // Role being assigned (patient or helper)
  token: string;         // Unique secure token for the invitation link
  status: string;        // "pending", "accepted", "expired", "declined"
  message: string;       // Custom message from the inviter
  createdAt: string;     // When the invitation was created
  expiresAt: string;     // When the invitation expires (1 day after creation)
}
```

### Updates to USERS Table

We'll use the existing `linkedPatients` field in the Users table to store relationships. For helpers, we'll add a new field:

```typescript
// For admin users
linkedPatients: string; // JSON array of patient IDs

// For patient users
linkedHelpers: string; // JSON array of helper IDs
```

## Implementation Steps

### 1. Create Azure Table Service for Invitations

First, we'll create a table service for the new INVITATIONS table:

```typescript
// src/lib/azure/invitation-service.ts
import { AzureTableService } from './table-service';

export class InvitationService extends AzureTableService {
  constructor() {
    super('Invitations');
  }

  async createInvitation(invitation: Invitation): Promise<void> {
    return this.createEntity(invitation);
  }

  async getInvitationByToken(token: string): Promise<Invitation | null> {
    const invitations = await this.queryEntities(`token eq '${token}'`);
    return invitations.length > 0 ? invitations[0] as Invitation : null;
  }

  async getInvitationsByInviter(inviterUserId: string): Promise<Invitation[]> {
    return this.queryEntities(`inviterUserId eq '${inviterUserId}'`);
  }

  async getInvitationsByEmail(email: string): Promise<Invitation[]> {
    return this.queryEntities(`inviteeEmail eq '${email}'`);
  }

  async updateInvitationStatus(rowKey: string, status: string): Promise<void> {
    return this.updateEntity(rowKey, { status });
  }
}
```

### 2. Email Service Integration

We'll integrate with SendGrid for sending emails:

```typescript
// src/lib/email-service.ts
import sgMail from '@sendgrid/mail';

// Initialize SendGrid with API key
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
} else {
  console.warn('SENDGRID_API_KEY is not set. Email functionality will not work.');
}

interface InvitationEmailParams {
  to: string;
  inviterName: string;
  inviterRole: string;
  inviteeRole: string;
  token: string;
  message?: string;
}

export async function sendInvitationEmail({
  to,
  inviterName,
  inviterRole,
  inviteeRole,
  token,
  message
}: InvitationEmailParams): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const invitationLink = `${baseUrl}/invitation/${token}`;
  
  const roleText = inviteeRole === 'patient'
    ? 'patient in the medication management system'
    : 'helper for medication management';

  const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@medicationassistant.com';
  
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <h2 style="color: #4a5568; margin-bottom: 20px;">Medication Management Invitation</h2>
      
      <p><strong>${inviterName}</strong> (${inviterRole}) has invited you to join as a ${roleText}.</p>
      
      ${message ? `<p style="background-color: #f7fafc; padding: 15px; border-radius: 5px; font-style: italic;">Message: ${message}</p>` : ''}
      
      <p>Click the button below to accept the invitation:</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${invitationLink}" style="background-color: #4CAF50; border: none; color: white; padding: 15px 32px; text-align: center; text-decoration: none; display: inline-block; font-size: 16px; margin: 4px 2px; cursor: pointer; border-radius: 12px;">
          Accept Invitation
        </a>
      </p>
      
      <p style="color: #718096; font-size: 14px;"><em>This invitation will expire in 24 hours.</em></p>
      
      <hr style="border: 0; border-top: 1px solid #e0e0e0; margin: 20px 0;">
      <p style="color: #718096; font-size: 12px; text-align: center;">
        If you're having trouble with the button above, copy and paste the URL below into your web browser:
        <br>
        <a href="${invitationLink}" style="color: #4299e1;">${invitationLink}</a>
      </p>
    </div>
  `;
  
  const plainTextContent = `
    ${inviterName} (${inviterRole}) has invited you to join as a ${roleText}.
    
    ${message ? `Message: ${message}\n\n` : ''}
    
    Click the link below to accept the invitation:
    ${invitationLink}
    
    This invitation will expire in 24 hours.
  `;

  const msg = {
    to,
    from: fromEmail,
    subject: `Invitation to join as a ${roleText}`,
    text: plainTextContent,
    html: htmlContent
  };

  try {
    if (!process.env.SENDGRID_API_KEY) {
      console.log('Email would be sent (SENDGRID_API_KEY not set):', msg);
      return { success: true, mock: true };
    }
    
    await sgMail.send(msg);
    return { success: true };
  } catch (error) {
    console.error('Error sending invitation email:', error);
    throw new Error('Failed to send invitation email');
  }
}
```

Using SendGrid provides several advantages:
1. High deliverability rates
2. Email analytics and tracking
3. Easy integration with Node.js applications
4. Reliable service with good documentation
5. Free tier available for development and testing

### 3. API Routes for Invitations

#### Create Invitation API

```typescript
// src/app/api/invitations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { InvitationService } from '@/lib/azure/invitation-service';
import { AzureTableService } from '@/lib/azure/table-service';
import { sendInvitationEmail } from '@/lib/email-service';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import crypto from 'crypto';

// Initialize services
const invitationService = new InvitationService();
const usersService = new AzureTableService('Users');

// Rate limiting (simple in-memory implementation)
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

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await getServerSession(authOptions);
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
    const session = await getServerSession(authOptions);
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
```

#### Verify Invitation API

```typescript
// src/app/api/invitations/verify/[token]/route.ts
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
```

#### Accept Invitation API

```typescript
// src/app/api/invitations/accept/[token]/route.ts
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
    
    const user = {
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
        
        await usersService.updateEntity(invitation.inviterUserId, {
          linkedPatients: JSON.stringify(linkedPatients)
        });
      } else if (invitation.inviterRole === 'patient' && invitation.inviteeRole === 'helper') {
        // Patient invited a helper - update patient's linkedHelpers
        const linkedHelpers = inviter.linkedHelpers 
          ? JSON.parse(inviter.linkedHelpers) 
          : [];
        
        linkedHelpers.push(userId);
        
        await usersService.updateEntity(invitation.inviterUserId, {
          linkedHelpers: JSON.stringify(linkedHelpers)
        });
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
```

### 4. Frontend Components

#### Invitation Form Component

```typescript
// src/components/InvitationForm.tsx
"use client";

import { useState } from 'react';
import { useSession } from 'next-auth/react';

interface InvitationFormProps {
  inviteeRole: 'patient' | 'helper';
}

export default function InvitationForm({ inviteeRole }: InvitationFormProps) {
  const { data: session } = useSession();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError('Email is required');
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await fetch('/api/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inviteeEmail: email,
          inviteeRole,
          message
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to send invitation');
      }
      
      setSuccess('Invitation sent successfully');
      setEmail('');
      setMessage('');
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!session) {
    return <div>Please sign in to send invitations</div>;
  }

  const roleText = inviteeRole === 'patient' ? 'Patient' : 'Helper';

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">Invite a {roleText}</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">
          {success}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
            placeholder={`Enter ${roleText.toLowerCase()}'s email`}
            required
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Personal Message (Optional)
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
            rows={3}
            placeholder={`Add a personal message to your ${roleText.toLowerCase()}`}
          />
        </div>
        
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {isSubmitting ? 'Sending...' : `Send Invitation`}
        </button>
      </form>
    </div>
  );
}
```

#### Invitation List Component

```typescript
// src/components/InvitationList.tsx
"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface Invitation {
  id: string;
  inviteeEmail: string;
  inviteeRole: string;
  status: string;
  createdAt: string;
  expiresAt: string;
}

export default function InvitationList() {
  const { data: session } = useSession();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchInvitations = async () => {
      if (!session) return;
      
      try {
        const response = await fetch('/api/invitations');
        
        if (!response.ok) {
          throw new Error('Failed to fetch invitations');
        }
        
        const data = await response.json();
        setInvitations(data.invitations || []);
      } catch (err: any) {
        setError(err.message || 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchInvitations();
  }, [session]);

  if (!session) {
    return <div>Please sign in to view invitations</div>;
  }

  if (isLoading) {
    return <div>Loading invitations...</div>;
  }

  if (error) {
    return <div className="text-red-600">{error}</div>;
  }

  if (invitations.length === 0) {
    return <div className="text-gray-500">No invitations sent yet</div>;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'expired':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-semibold p-4 border-b">Sent Invitations</h2>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Sent
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Expires
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {invitations.map((invitation) => (
              <tr key={invitation.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {invitation.inviteeEmail}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">
                    {invitation.inviteeRole === 'patient' ? 'Patient' : 'Helper'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(invitation.status)}`}>
                    {invitation.status.charAt(0).toUpperCase() + invitation.status.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">
                    {new Date(invitation.createdAt).toLocaleDateString()}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">
                    {new Date(invitation.expiresAt).toLocaleDateString()}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

#### Invitation Acceptance Page

```typescript
// src/app/invitation/[token]/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface InvitationDetails {
  inviterName: string;
  inviterRole: string;
  inviteeRole: string;
  inviteeEmail: string;
  message: string;
}

export default function InvitationAcceptPage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const { token } = params;
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  
  useEffect(() => {
    const verifyInvitation = async () => {
      try {
        const response = await fetch(`/api/invitations/verify/${token}`);
        const data = await response.json();
        
        if (!data.valid) {
          setError(data.message || 'Invalid invitation');
          return;
        }
        
        setInvitation(data.invitation);
      } catch (err: any) {
        setError(err.message || 'Failed to verify invitation');
      } finally {
        setIsLoading(false);
      }
    };
    
    verifyInvitation();
  }, [token]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!firstName || !lastName || !password) {
      setFormError('All fields are required');
      return;
    }
    
    if (password !== confirmPassword) {
      setFormError('Passwords do not match');
      return;
    }
    
    setIsSubmitting(true);
    setFormError('');
    
    try {
      const response = await fetch(`/api/invitations/accept/${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName,
          lastName,
          password
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to accept invitation');
      }
      
      // Redirect to login page
      router.push('/login?registered=true');
    } catch (err: any) {
      setFormError(err.message || 'An error occurred');
      setIsSubmitting(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="spinner mb-4"></div>
          <p className="text-gray-600">Verifying invitation...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <div className="text-red-600 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-4">Invalid Invitation</h2>
          <p className="text-gray-600 text-center mb-6">{error}</p>
          <div className="text-center">
            <button
              onClick={() => router.push('/login')}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  if (!invitation) {
    return null;
  }
  
  const roleText = invitation.inviteeRole === 'patient' ? 'Patient' : 'Helper';
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Accept Invitation</h2>
          <p className="text-gray-600 mt-2">
            {invitation.inviterName} ({invitation.inviterRole}) has invited you to join as a {roleText.toLowerCase()}.
          </p>
          
          {invitation.message && (
            <div className="mt-4 p-4 bg-gray-50 rounded text-left">
              <p className="text-sm text-gray-700 italic">"{invitation.message}"</p>
            </div>
          )}
        </div>
        
        {formError && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
            {formError}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={invitation.inviteeEmail}
              disabled
              className="w-full p-2 border rounded bg-gray-50"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First Name
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Name
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isSubmitting ? 'Creating Account...' : 'Accept Invitation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

### 5. Creating Dedicated Invitation Pages

Create dedicated pages for invitations for both admin and patient roles:

```typescript
// src/app/admin/invitations/page.tsx
import InvitationForm from '@/components/InvitationForm';
import InvitationList from '@/components/InvitationList';
import AdminHeader from '@/components/AdminHeader';
import AdminSidebar from '@/components/AdminSidebar';

export default function AdminInvitationsPage() {
  return (
    <div className="flex h-screen bg-gray-100">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6">
          <div className="container mx-auto">
            <h1 className="text-2xl font-bold mb-6">Manage Invitations</h1>
            <p className="text-gray-600 mb-6">
              Invite patients to join the medication management system. Track and manage your sent invitations.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1">
                <InvitationForm inviteeRole="patient" />
              </div>
              
              <div className="md:col-span-2">
                <InvitationList />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
```

```typescript
// src/app/patient/invitations/page.tsx
import InvitationForm from '@/components/InvitationForm';
import InvitationList from '@/components/InvitationList';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';

export default function PatientInvitationsPage() {
  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6">
          <div className="container mx-auto">
            <h1 className="text-2xl font-bold mb-6">Manage Helper Invitations</h1>
            <p className="text-gray-600 mb-6">
              Invite trusted helpers to assist with your medication management. Track and manage your sent invitations.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1">
                <InvitationForm inviteeRole="helper" />
              </div>
              
              <div className="md:col-span-2">
                <InvitationList />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
```

### 6. Adding Invitation Links to Sidebar Navigation

Update the sidebar components to include links to the invitation pages:

```typescript
// In AdminSidebar.tsx
<Link
  href="/admin/invitations"
  className="flex items-center px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors group"
>
  <Mail className="h-5 w-5 text-gray-500 group-hover:text-blue-600" />
  <span className="ml-3 text-sm font-medium group-hover:text-blue-600">
    Invitations
  </span>
</Link>
```

```typescript
// In Sidebar.tsx (for patient view)
// Add to the patient menu items array:
{ name: 'Invitations', href: '/patient/invitations', icon: Mail },
```

## Environment Configuration

Add the following environment variables to your `.env.local` file:

```
# SendGrid API Key for Email
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@medicationassistant.com

# Base URL for invitation links
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

> **IMPORTANT**: You must replace the placeholder values above with your actual SendGrid credentials. The application will not function correctly with the placeholder values. You will need to create a SendGrid account and obtain an API key.

SendGrid provides several advantages for email delivery:
1. High deliverability rates
2. Email analytics and tracking
3. Easy integration with Node.js applications
4. Reliable service with good documentation
5. Free tier available for development and testing

## Implementation Phases

### Phase 1: Core Infrastructure
1. Create the INVITATIONS table in Azure Tables
2. Set up SendGrid for email
3. Implement token generation and validation

### Phase 2: API Implementation
1. Create invitation API endpoints
2. Implement invitation verification
3. Implement invitation acceptance
4. Add user relationship management

### Phase 3: Frontend Implementation
1. Create invitation form components
2. Implement invitation management UI
3. Create invitation acceptance page
4. Add email templates

### Phase 4: Testing and Security
1. Test all invitation flows
2. Implement rate limiting
3. Add security measures
4. Test edge cases and error handling

## Security Considerations

1. **One-time use tokens**: Each invitation has a unique token that can only be used once
2. **Expiration**: Invitations expire after 1 day
3. **Email verification**: Verify the email matches the invitation before account creation
4. **Rate limiting**: Implement rate limiting on invitation creation (10 per hour)
5. **Secure links**: Use HTTPS for all invitation links