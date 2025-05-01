import { AzureTableService } from '../azure-table-utils';
import { odata } from '@azure/data-tables';
import { ensureTableExists } from '../azure-table-utils';

export interface Invitation {
  PartitionKey: string;
  RowKey: string;
  inviterUserId: string;
  inviterRole: string;
  inviterEmail: string;
  inviterName: string;
  inviteeEmail: string;
  inviteeName: string;
  inviteeUserId?: string;
  inviteeRole: string;
  token: string;
  status: string;
  message: string;
  createdAt: string;
  expiresAt: string;
}

export class InvitationService {
  private _tableService: AzureTableService | null = null;

  constructor() {
    // Defer creation to avoid reading env vars during build
    ensureTableExists('Invitations').catch(error => {
      console.error('Failed to ensure Invitations table exists:', error);
    });
  }

  private get tableService() {
    if (!this._tableService) {
      this._tableService = new AzureTableService('Invitations');
    }
    return this._tableService;
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
