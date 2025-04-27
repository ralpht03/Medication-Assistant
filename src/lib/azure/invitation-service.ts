import { AzureTableService } from './table-service';
import { odata } from '@azure/data-tables';

export interface Invitation {
  PartitionKey: string;  // "INVITATION"
  RowKey: string;        // Unique invitation ID (UUID)
  inviterUserId: string; // ID of the user sending the invitation
  inviterRole: string;   // Role of the inviter (admin or patient)
  inviterEmail: string;  // Email of the inviter
  inviterName: string;   // Name of the inviter
  inviteeEmail: string;  // Email of the person being invited
  inviteeUserId?: string; // ID of the user being invited (if they exist)
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

  async createInvitation(invitation: Omit<Invitation, 'PartitionKey' | 'RowKey'>) {
    const newInvitation = {
      ...invitation,
      PartitionKey: 'INVITATION',
      RowKey: crypto.randomUUID()
    };
    return await this.tableService.createEntity(newInvitation);
  }

  async getInvitationsByInvitee(email: string) {
    return await this.tableService.queryEntities(
      odata`inviteeEmail eq '${email}'`
    );
  }

  async getInvitationsByInviter(userId: string) {
    return await this.tableService.queryEntities(
      odata`inviterUserId eq '${userId}'`
    );
  }

  async getInvitationByToken(token: string) {
    const results = await this.tableService.queryEntities(
      odata`token eq '${token}'`
    );
    return results.length > 0 ? results[0] : null;
  }

  async updateInvitationStatus(invitationId: string, status: 'accepted' | 'declined') { 
    return await this.tableService.updateEntity({
      partitionKey: 'INVITATION',
      rowKey: invitationId,
      status
    }, "Merge");
  }

  async queryEntities(filter: string | ReturnType<typeof odata>) {
    return await this.tableService.queryEntities(filter);
  }

  async deleteEntity(partitionKey: string, rowKey: string) {
    return await this.tableService.deleteEntity(partitionKey, rowKey);
  }

  async getInvitationByRowKey(rowKey: string) {
    const results = await this.tableService.queryEntities(
      odata`RowKey eq '${rowKey}'`
    );
    return results.length > 0 ? results[0] : null;
  }

  async updateEntity(entity: any, mode: "Merge" | "Replace" = "Merge") {
    return await this.tableService.updateEntity(entity, mode);
  }
}