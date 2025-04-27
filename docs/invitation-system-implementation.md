# Email-Based Invitation System Implementation

## Overview

This document outlines the implementation plan for an invitation system that enables admins to invite patients to join the medication management system.

## Database Structure

### INVITATIONS Table

```typescript
interface Invitation {
  PartitionKey: string;  // "INVITATION"
  RowKey: string;        // Unique invitation ID (UUID)
  inviterUserId: string; // ID of the user sending the invitation
  inviterRole: string;   // Role of the inviter (admin)
  inviterEmail: string;  // Email of the inviter
  inviterName: string;   // Name of the inviter
  inviteeEmail: string;  // Email of the person being invited
  inviteeUserId?: string; // ID of the user being invited (if they exist)
  inviteeRole: string;   // Role being assigned (patient)
  token: string;         // Unique secure token for the invitation link
  status: string;        // "pending", "accepted", "declined"
  message: string;       // Custom message from the inviter
  createdAt: string;     // When the invitation was created
  expiresAt: string;     // When the invitation expires (7 days after creation)
}
```

### Updates to USERS Table

We use the existing Users table to store relationships:

```typescript
// For admin users
linkedPatients: string; // JSON array of patient IDs
```

## Implementation Steps

### 1. Create Azure Table Service for Invitations

The invitation service handles all invitation-related operations:
- Creating new invitations
- Querying invitations by email or token
- Updating invitation status
- Managing invitation lifecycle

### 2. API Routes for Invitations

#### Admin Routes
- `POST /api/admin/invite-patient`: Creates new invitation
- `GET /api/admin/sent-invitations`: Lists all invitations sent by an admin

#### Patient Routes
- `GET /api/patient/invitations`: Lists pending invitations for a patient
- `POST /api/patient/invitations/respond`: Handles accepting/declining invitations

### 3. Frontend Components

#### Admin View
- Invitation form for sending invitations
- List of sent invitations with their status

#### Patient View
- List of received invitations
- Accept/Decline functionality

## Security Considerations

1. **Access Control**
   - Only admins can send invitations
   - Patients can only see invitations sent to their email
   - Invitation responses require authentication

2. **Duplicate Prevention**
   - System prevents multiple accepted invitations from same admin
   - Filters out pending invitations if already accepted

3. **Token Security**
   - Each invitation has a unique token
   - Tokens expire after 7 days
   - Expired invitations cannot be accepted

## Environment Configuration

Add the following environment variables to your `.env.local` file:

```
# Base URL for invitation links
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## Implementation Phases

### Phase 1: Core Infrastructure
1. Create the INVITATIONS table in Azure Tables
2. Implement token generation and validation
3. Set up invitation service

### Phase 2: API Implementation
1. Create invitation API endpoints
2. Implement invitation verification
3. Implement invitation acceptance
4. Add user relationship management

### Phase 3: Frontend Implementation
1. Create invitation form components
2. Implement invitation management UI
3. Create invitation acceptance page

### Phase 4: Testing and Security
1. Test all invitation flows
2. Implement rate limiting
3. Add security measures
4. Test edge cases and error handling
```

## Key Files

- Invitation Service: `src/lib/azure/invitation-service.ts`
- API Routes: 
  - `src/app/api/patient/invitations/route.ts`
  - `src/app/api/admin/invite-patient/route.ts`
- Frontend Components:
  - `src/components/PatientInvitationsList.tsx`
  - `src/components/InvitationForm.tsx`