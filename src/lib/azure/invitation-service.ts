import { AzureTableService } from './table-service';

export interface Invitation {
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

export class InvitationService extends AzureTableService {
  constructor() {
    super('Invitations');
  }

  async createInvitation(invitation: Invitation) {
    return await this.createEntity(invitation);
  }

  async getInvitationByToken(token: string) {
    const invitations = await this.queryEntities(`token eq '${token}'`);
    return invitations.length > 0 ? invitations[0] as unknown as Invitation : null;
  }

  async getInvitationsByInviter(inviterUserId: string) {
    const invitations = await this.queryEntities(`inviterUserId eq '${inviterUserId}'`);
    return invitations as unknown as Invitation[];
  }

  async getInvitationsByEmail(email: string) {
    const invitations = await this.queryEntities(`inviteeEmail eq '${email}'`);
    return invitations as unknown as Invitation[];
  }

  async updateInvitationStatus(rowKey: string, status: string) {
    return await this.updateEntity({
      PartitionKey: 'INVITATION',
      RowKey: rowKey,
      status
    });
  }
}