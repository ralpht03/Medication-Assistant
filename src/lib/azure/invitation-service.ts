import { AzureTableService } from './table-service';

export interface Invitation {
  PartitionKey: string;  // "INVITATION"
  RowKey: string;        // Unique invitation ID (UUID)
  inviterUserId: string; // ID of the user sending the invitation
  inviterRole: string;   // Role of the inviter (admin or patient)
  inviterEmail: string;  // Email of the inviter
  inviterName: string;   // Name of the inviter
  inviteeEmail: string;  // Email of the person being invited
  inviteeRole: string;   // Role being assigned (patient or helper)
  token: string;         // Unique secure token for the invitation link
  status: string;        // "pending", "accepted", "expired", "declined"
  message: string;       // Custom message from the inviter
  createdAt: string;     // When the invitation was created
  expiresAt: string;     // When the invitation expires (1 day after creation)
}

export class InvitationService {
  private tableService: AzureTableService;

  constructor() {
    this.tableService = new AzureTableService('Invitations');
  }

  async createInvitation(invitation: any) {
    return await this.tableService.createEntity(invitation);
  }

  async getInvitationsByInvitee(email: string) {
    return await this.tableService.queryEntities(`inviteeEmail eq '${email}'`);
  }

  async getInvitationsByInviter(userId: string) {
    return await this.tableService.queryEntities(`inviterUserId eq '${userId}'`);
  }

  async getInvitationByToken(token: string) {
    const results = await this.tableService.queryEntities(`token eq '${token}'`);
    return results.length > 0 ? results[0] : null;
  }

  async updateInvitationStatus(invitationId: string, status: 'accepted' | 'declined') { 
    return await this.tableService.updateEntity({
      partitionKey: 'INVITATION',
      rowKey: invitationId,
      status
    }, "Merge");
  }

  async queryEntities(filter: string) {
    return await this.tableService.queryEntities(filter);
  }

  async deleteEntity(partitionKey: string, rowKey: string) {
    return await this.tableService.deleteEntity(partitionKey, rowKey);
  }

  async getInvitationByRowKey(rowKey: string) {
    const results = await this.tableService.queryEntities(`RowKey eq '${rowKey}'`);
    return results.length > 0 ? results[0] : null;
  }

  async updateEntity(entity: any, mode: "Merge" | "Replace" = "Merge") {
    return await this.tableService.updateEntity(entity, mode);
  }
}